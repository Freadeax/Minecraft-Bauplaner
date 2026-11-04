package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Pure rules of the server link without Bukkit (LINK-01, docs/architecture/AUTO_LINK.md): server identity,
 * owner keys, signed control messages and the list of settings the planner may change. Unit tested in
 * {@code LinkCoreTest}; {@link ServerLink} wires it to the server.
 * <p>
 * A control message is {@code {owner, seq, body, sig}}: {@code body} is a JSON text that names this server
 * ({@code "server": serverId}) and one operation ({@code "op"}), {@code sig} is base64url of
 * HMAC-SHA-256(owner key, owner + "\n" + seq + "\n" + body). {@code seq} must grow per owner (the planner
 * uses the time in milliseconds), so a recorded message cannot be sent again. The team room and the mod
 * only pass the message on; they can neither read the key nor change the body.
 */
final class LinkCore {
    static final int MAX_OWNERS = 8;
    static final int MAX_BODY = 6 * 1024 * 1024;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();

    private LinkCore() { }

    /** One device that may control this server (a planner in a browser). The key is the shared HMAC secret. */
    record Owner(String id, String name, String key, long seq, String created, String by) {
        Owner withSeq(long s) { return new Owner(id, name, key, s, created, by); }
        JsonObject json(boolean withKey) {
            JsonObject o = new JsonObject();
            o.addProperty("id", id);
            o.addProperty("name", name);
            if (withKey) o.addProperty("key", key);
            o.addProperty("seq", seq);
            o.addProperty("created", created);
            o.addProperty("by", by);
            return o;
        }
    }

    /** Persistent link state ({@code plugins/BauplanerBridge/link.json}). */
    static final class State {
        String serverId;
        String name;
        final List<Owner> owners = new ArrayList<>();

        static State fresh(String name) {
            State s = new State();
            s.serverId = "srv_" + token(9);
            s.name = name == null || name.isBlank() ? "Minecraft-Server" : clip(name, 60);
            return s;
        }

        static State parse(String json) {
            JsonObject o = JsonParser.parseString(json).getAsJsonObject();
            State s = new State();
            s.serverId = str(o, "serverId");
            if (s.serverId == null || !s.serverId.matches("srv_[A-Za-z0-9_-]{6,40}")) throw new IllegalArgumentException("serverId fehlt");
            s.name = Optional.ofNullable(str(o, "name")).orElse("Minecraft-Server");
            if (o.has("owners") && o.get("owners").isJsonArray()) for (JsonElement e : o.getAsJsonArray("owners")) {
                if (!e.isJsonObject()) continue;
                JsonObject x = e.getAsJsonObject();
                String id = str(x, "id"), key = str(x, "key");
                if (id == null || key == null || !key.matches("[A-Za-z0-9_-]{32,64}")) continue;
                s.owners.add(new Owner(id, Optional.ofNullable(str(x, "name")).orElse("Planer"), key, x.has("seq") ? x.get("seq").getAsLong() : 0,
                        Optional.ofNullable(str(x, "created")).orElse(""), Optional.ofNullable(str(x, "by")).orElse("")));
            }
            return s;
        }

        String json() {
            JsonObject o = new JsonObject();
            o.addProperty("serverId", serverId);
            o.addProperty("name", name);
            JsonArray a = new JsonArray();
            for (Owner w : owners) a.add(w.json(true));
            o.add("owners", a);
            return TeamLog.GSON.toJson(o);
        }

        boolean paired() { return !owners.isEmpty(); }

        Optional<Owner> owner(String id) { return owners.stream().filter(o -> o.id().equals(id)).findFirst(); }

        /** A new owner with a fresh key; the oldest is dropped beyond {@link #MAX_OWNERS}. */
        Owner addOwner(String deviceName, String by, Instant now) {
            Owner o = new Owner("own_" + token(6), deviceName == null || deviceName.isBlank() ? "Planer" : clip(deviceName, 40), token(32), 0, now.toString(), by == null ? "" : clip(by, 40));
            owners.add(o);
            while (owners.size() > MAX_OWNERS) owners.remove(0);
            return o;
        }

        boolean removeOwner(String id) { return owners.removeIf(o -> o.id().equals(id)); }

        void replace(Owner o) { for (int i = 0; i < owners.size(); i++) if (owners.get(i).id().equals(o.id())) owners.set(i, o); }

        JsonArray ownersPublic() {
            JsonArray a = new JsonArray();
            for (Owner o : owners) a.add(o.json(false));
            return a;
        }
    }

    // ------------------------------------------------------------------ signatures

    static String sign(String key, String owner, long seq, String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.US_ASCII), "HmacSHA256"));
            return B64.encodeToString(mac.doFinal((owner + "\n" + seq + "\n" + body).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException(e);
        }
    }

    /** A verified control message: who sent it and the parsed body. */
    record Control(Owner owner, long seq, JsonObject body, String op) {}

    /**
     * Checks a control message against the state. Throws {@link IllegalArgumentException} with a German reason;
     * on success the caller stores {@code owner.withSeq(seq)} before acting, so a replay fails.
     */
    static Control verify(State state, String ownerId, long seq, String body, String sig) {
        if (!state.paired()) throw new IllegalArgumentException("Dieser Planer ist mit dem Server nicht (mehr) gekoppelt – der Server hat gerade gar keinen gekoppelten Planer. Neu koppeln.");
        Owner o = state.owner(ownerId == null ? "" : ownerId).orElseThrow(() -> new IllegalArgumentException("Dieser Planer ist mit dem Server nicht (mehr) gekoppelt. Neu koppeln."));
        if (body == null || body.length() > MAX_BODY) throw new IllegalArgumentException("Steuernachricht fehlt oder ist zu groß.");
        if (sig == null || !MessageDigest.isEqual(sign(o.key(), o.id(), seq, body).getBytes(StandardCharsets.US_ASCII), sig.getBytes(StandardCharsets.US_ASCII)))
            throw new IllegalArgumentException("Unterschrift stimmt nicht.");
        if (seq <= o.seq()) throw new IllegalArgumentException("Diese Steuernachricht wurde schon verarbeitet (Nummer " + seq + ").");
        JsonObject b;
        try { b = JsonParser.parseString(body).getAsJsonObject(); } catch (RuntimeException e) { throw new IllegalArgumentException("Steuernachricht ist kein JSON-Objekt."); }
        if (!state.serverId.equals(str(b, "server"))) throw new IllegalArgumentException("Die Steuernachricht ist für einen anderen Server.");
        String op = str(b, "op");
        if (op == null || !OPS.contains(op)) throw new IllegalArgumentException("Unbekannte Steueraktion: " + op);
        return new Control(o, seq, b, op);
    }

    /** Operations the planner can send (AUTO_LINK.md §5). */
    static final Set<String> OPS = Set.of("status", "config", "team", "room", "plan", "scan", "rename", "invite", "forget");

    // ------------------------------------------------------------------ settings

    /** Kind of one setting the planner may change. */
    enum Kind { BOOL, INT, CHOICE }

    record Setting(String key, Kind kind, int min, int max, List<String> choices, boolean restart, String label) {}

    /**
     * Every config.yml key the planner may set. {@code team.kanal} is left out on purpose: switching it off
     * would cut the very way the setting came in. Keys marked {@code restart} take effect after a restart.
     */
    static final List<Setting> SETTINGS = List.of(
            new Setting("team.anzeige", Kind.BOOL, 0, 0, List.of(), true, "Aktionsleiste im Abschnitt"),
            new Setting("team.neue-spieler-beitreten", Kind.BOOL, 0, 0, List.of(), false, "Neue Spieler treten selbst als Helfer bei"),
            new Setting("team.schutz", Kind.CHOICE, 0, 0, List.of("hinweis", "sperren", "aus"), false, "Bauen in fremden Abschnitten"),
            new Setting("team.nachweis", Kind.BOOL, 0, 0, List.of(), false, "Baunachweis je Spieler"),
            new Setting("team.nachweis-minuten", Kind.INT, 1, 120, List.of(), true, "Baunachweis schreiben alle … Minuten"),
            new Setting("lager.modus", Kind.CHOICE, 0, 0, List.of("sperren", "hinweis"), false, "Lagerschutz"),
            new Setting("lager.schutz-standard", Kind.CHOICE, 0, 0, List.of("offen", "team", "abschnitt", "eingang", "gesperrt"), false, "Schutzstufe neuer Lager"),
            new Setting("lager.trichter", Kind.CHOICE, 0, 0, List.of("einlegen", "beides", "aus"), false, "Trichter an Lagern"),
            new Setting("lager.explosionsschutz", Kind.BOOL, 0, 0, List.of(), false, "Explosionen zerstören Lager nicht"),
            new Setting("lager.pruefen-beim-laden", Kind.BOOL, 0, 0, List.of(), false, "Lager prüfen, wenn ihr Chunk lädt"),
            new Setting("lager.meldung-an-baumeister", Kind.BOOL, 0, 0, List.of(), false, "Abweichungen an Baumeister melden"),
            new Setting("millisekunden-pro-tick", Kind.INT, 1, 50, List.of(), false, "Aufnahme: Millisekunden je Tick"),
            new Setting("chunks-nachladen", Kind.BOOL, 0, 0, List.of(), false, "Aufnahme: erzeugte Chunks nachladen"),
            new Setting("max-chunks", Kind.INT, 0, 65_536, List.of(), false, "Aufnahme: höchstens nachzuladende Chunks"));

    static Optional<Setting> setting(String key) { return SETTINGS.stream().filter(s -> s.key().equals(key)).findFirst(); }

    /**
     * Validates a {@code set} object of a {@code config} message and returns the typed values in order.
     * Unknown keys or wrong values reject the whole message (nothing is half applied).
     */
    static Map<String, Object> validate(JsonObject set) {
        if (set == null || set.size() == 0) throw new IllegalArgumentException("Keine Einstellung angegeben.");
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, JsonElement> e : set.entrySet()) {
            Setting s = setting(e.getKey()).orElseThrow(() -> new IllegalArgumentException("Diese Einstellung kann der Planer nicht ändern: " + e.getKey()));
            JsonElement v = e.getValue();
            if (!v.isJsonPrimitive()) throw new IllegalArgumentException(s.label() + ": ungültiger Wert.");
            JsonPrimitive p = v.getAsJsonPrimitive();
            switch (s.kind()) {
                case BOOL -> { if (!p.isBoolean()) throw new IllegalArgumentException(s.label() + ": ja oder nein erwartet."); out.put(s.key(), p.getAsBoolean()); }
                case INT -> {
                    if (!p.isNumber() || p.getAsDouble() != Math.rint(p.getAsDouble())) throw new IllegalArgumentException(s.label() + ": ganze Zahl erwartet.");
                    long n = p.getAsLong();
                    if (n < s.min() || n > s.max()) throw new IllegalArgumentException(s.label() + ": " + s.min() + " bis " + s.max() + ".");
                    out.put(s.key(), (int) n);
                }
                case CHOICE -> {
                    String c = p.isString() ? p.getAsString().toLowerCase(Locale.ROOT) : "";
                    if (!s.choices().contains(c)) throw new IllegalArgumentException(s.label() + ": eins von " + String.join(", ", s.choices()) + ".");
                    out.put(s.key(), c);
                }
            }
        }
        return out;
    }

    /** The settings list for the planner's form: key, kind, label, choices or range, restart. */
    static JsonArray settingsSchema() {
        JsonArray a = new JsonArray();
        for (Setting s : SETTINGS) {
            JsonObject o = new JsonObject();
            o.addProperty("key", s.key());
            o.addProperty("kind", s.kind().name().toLowerCase(Locale.ROOT));
            o.addProperty("label", s.label());
            if (s.kind() == Kind.INT) { o.addProperty("min", s.min()); o.addProperty("max", s.max()); }
            if (s.kind() == Kind.CHOICE) { JsonArray c = new JsonArray(); s.choices().forEach(c::add); o.add("choices", c); }
            if (s.restart()) o.addProperty("restart", true);
            a.add(o);
        }
        return a;
    }

    // ------------------------------------------------------------------ helpers

    static String token(int bytes) {
        byte[] b = new byte[bytes];
        RANDOM.nextBytes(b);
        return B64.encodeToString(b);
    }

    static String str(JsonObject o, String k) {
        JsonElement e = o == null ? null : o.get(k);
        return e != null && e.isJsonPrimitive() ? e.getAsString() : null;
    }

    static String clip(String s, int n) {
        String t = s.replaceAll("[\\p{Cntrl}]", "").trim();
        return t.length() > n ? t.substring(0, n) : t;
    }
}
