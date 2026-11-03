package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;

/**
 * Server copy of a team (COOP-02, docs/architecture/TEAMBAU.md): the header the planner exports
 * ({@code minecraft-bauplaner-team-server}: sections with world boxes, members, the team log) plus the
 * events written on this server. The fold follows {@code packages/domain/src/team.ts} rule by rule, so
 * the planner and the server always show the same state for the same events. Pure Java, no Bukkit.
 */
final class TeamLog {
    static final String FORMAT = "minecraft-bauplaner-team-server";
    static final List<String> ROLES = List.of("gast", "helfer", "meister", "leitung");
    static final Map<String, String> ROLE_LABEL = Map.of("leitung", "Bauleitung", "meister", "Baumeister", "helfer", "Helfer", "gast", "Gast");
    static final Map<String, String> STATUS_LABEL = Map.of("frei", "frei", "vergeben", "in Arbeit", "gemeldet", "fertig gemeldet", "bestaetigt", "bestätigt", "nacharbeit", "Nacharbeit");
    static final List<String> NOTE_TAGS = List.of("frage", "problem", "material", "info");
    private static final Map<String, String> NEED = new HashMap<>();
    static {
        NEED.put("member.join", "gast"); NEED.put("member.role", "leitung"); NEED.put("member.player", "gast");
        NEED.put("section.claim", "helfer"); NEED.put("section.assign", "meister"); NEED.put("section.release", "helfer");
        NEED.put("section.done", "helfer"); NEED.put("section.verify", "meister"); NEED.put("contribution", "helfer");
        NEED.put("gather.claim", "helfer"); NEED.put("note.add", "gast"); NEED.put("note.resolve", "helfer"); NEED.put("plan.release", "leitung");
        NEED.put("build.tally", "gast"); NEED.put("member.tally", "gast"); NEED.put("store.chest", "meister"); NEED.put("store.count", "gast");
        // Checked storage chests (COOP-05, docs/architecture/LAGERKISTEN.md).
        NEED.put("store.config", "meister"); NEED.put("store.seal", "meister"); NEED.put("store.move", "gast"); NEED.put("store.check", "gast");
        // Handover with acceptance, absence, acknowledged hints (COOP-06, TEAMBAU §4).
        NEED.put("section.handover", "helfer"); NEED.put("section.accept", "helfer"); NEED.put("section.decline", "helfer");
        NEED.put("member.away", "gast"); NEED.put("issue.ack", "meister");
    }
    /** Measurements only the server writes (origin server), as in team.ts SERVER_ONLY_KINDS. */
    static final Set<String> SERVER_ONLY = Set.of("build.tally", "store.count", "store.move", "store.check");
    static final Gson GSON = new GsonBuilder().disableHtmlEscaping().create();
    private static final SecureRandom RANDOM = new SecureRandom();

    record Box(String dimension, int minX, int minY, int minZ, int maxX, int maxY, int maxZ) {
        boolean contains(String dim, int x, int y, int z) {
            return dimension.equals(dim) && x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ;
        }
    }
    record Section(String id, String name, int number, List<Box> boxes) {}
    record Member(String id, String name, String player) {}

    final String teamId, name, projectName, founder;
    final JsonObject header;
    final List<Section> sections = new ArrayList<>();
    final List<Member> headerMembers = new ArrayList<>();
    /** All events (header log and server events), unique by id, sorted by (at, id). */
    private final TreeMap<String, JsonObject> events = new TreeMap<>();
    private final Map<String, String> sortKey = new HashMap<>();

    TeamLog(JsonObject header) {
        this.header = header;
        if (!FORMAT.equals(str(header, "format"))) throw new IllegalArgumentException("Keine Server-Teamdatei des Bauplaners (format " + FORMAT + " erwartet).");
        if (!header.has("formatVersion") || header.get("formatVersion").getAsInt() != 1) throw new IllegalArgumentException("Unbekannte Version der Teamdatei – bitte das Plugin aktualisieren.");
        teamId = req(header, "teamId"); name = req(header, "name"); founder = req(header, "founder");
        projectName = Optional.ofNullable(str(header, "projectName")).orElse(name);
        String dim = Optional.ofNullable(str(header, "dimension")).orElse("minecraft:overworld");
        int n = 0;
        for (JsonElement e : array(header, "sections")) {
            JsonObject s = e.getAsJsonObject();
            List<Box> boxes = new ArrayList<>();
            for (JsonElement b : array(s, "boxes")) {
                JsonArray a = b.getAsJsonArray();
                if (a.size() != 6) throw new IllegalArgumentException("Abschnittsbox braucht sechs Zahlen.");
                boxes.add(new Box(dim, a.get(0).getAsInt(), a.get(1).getAsInt(), a.get(2).getAsInt(), a.get(3).getAsInt(), a.get(4).getAsInt(), a.get(5).getAsInt()));
            }
            sections.add(new Section(req(s, "id"), req(s, "name"), ++n, boxes));
        }
        for (JsonElement e : array(header, "members")) {
            JsonObject m = e.getAsJsonObject();
            headerMembers.add(new Member(req(m, "id"), req(m, "name"), str(m, "player")));
        }
        for (JsonElement e : array(header, "events")) add(e.getAsJsonObject());
    }

    static TeamLog parse(String json) { return new TeamLog(JsonParser.parseString(json).getAsJsonObject()); }

    /** Adds an event; false if its id is known already. */
    boolean add(JsonObject event) {
        String id = req(event, "id"), at = req(event, "at");
        req(event, "by"); req(event, "kind");
        if (sortKey.containsKey(id)) return false;
        String key = at + "\u0000" + id;
        sortKey.put(id, key);
        events.put(key, event);
        return true;
    }

    List<JsonObject> events() { return new ArrayList<>(events.values()); }
    /** Whether an event with this id is in the log (Teamkanal: an action sent twice counts once). */
    boolean has(String id) { return sortKey.containsKey(id); }
    int size() { return events.size(); }

    /** Time for a new event: now, never before the last one (keeps the order of the planner). */
    String nextTime() {
        String now = io.github.freadeax.bauplaner.mod.team.TeamWire.time(Instant.now());
        if (events.isEmpty()) return now;
        String last = str(events.lastEntry().getValue(), "at");
        if (now.compareTo(last) > 0) return now;
        return io.github.freadeax.bauplaner.mod.team.TeamWire.time(Instant.parse(last).plusMillis(1));
    }

    static String newId(String prefix) {
        byte[] b = new byte[10];
        RANDOM.nextBytes(b);
        StringBuilder s = new StringBuilder(prefix).append('_');
        for (byte x : b) s.append(String.format("%02x", x));
        return s.toString();
    }

    JsonObject event(String by, String kind) {
        JsonObject e = new JsonObject();
        e.addProperty("id", newId("srv"));
        e.addProperty("at", nextTime());
        e.addProperty("by", by);
        e.addProperty("origin", "server");
        e.addProperty("kind", kind);
        return e;
    }

    /** Export: header with the merged log, readable by the planner like the file it came from. */
    String exportJson() {
        JsonObject out = header.deepCopy();
        JsonArray list = new JsonArray();
        for (JsonObject e : events.values()) list.add(e);
        out.add("events", list);
        out.addProperty("exportedAt", Instant.now().toString());
        return GSON.toJson(out);
    }

    Optional<Section> section(String ref) {
        String r = ref.trim();
        try {
            int n = Integer.parseInt(r);
            return sections.stream().filter(s -> s.number == n).findFirst();
        } catch (NumberFormatException e) {
            String l = r.toLowerCase(Locale.ROOT);
            return sections.stream().filter(s -> s.id.equals(r) || s.name.toLowerCase(Locale.ROOT).equals(l)).findFirst()
                    .or(() -> sections.stream().filter(s -> s.name.toLowerCase(Locale.ROOT).startsWith(l)).findFirst());
        }
    }

    // ------------------------------------------------------------------ fold

    static final class SectionState {
        String status = "frei", owner, doneBy, verifiedBy, note;
        /** Open handover offer (section.handover) until accepted, declined or overtaken. */
        Offer offer;
        final List<String> history = new ArrayList<>();
    }
    record Offer(String to, String by, String at, String note) {}
    /** Absence (member.away): until that day inclusive ({@code YYYY-MM-DD}) or open-ended. */
    record Away(String until, String note) {}
    static final class NoteState {
        String id, by, text, tag, section, at, resolvedBy;
        int[] pos;
    }
    static final class View {
        final Map<String, String> names = new LinkedHashMap<>(), roles = new HashMap<>(), players = new HashMap<>();
        final Set<String> known = new HashSet<>();
        final Map<String, SectionState> sections = new LinkedHashMap<>();
        final Map<String, NoteState> notes = new LinkedHashMap<>();
        final Map<String, Integer> blocks = new HashMap<>();
        final Map<String, Long> delivered = new TreeMap<>();
        final Map<String, Long> gather = new TreeMap<>();
        final List<String> rejected = new ArrayList<>(), conflicts = new ArrayList<>();
        /** Outcome of single events (id → rejection or conflict text) for answers to commands. */
        final Map<String, String> problems = new HashMap<>();
        final Set<String> rejectedIds = new HashSet<>();
        String releaseSummary;
        int releaseNumber = -1;
        /** Baunachweis (COOP-04), applied after the fold: members who switched it off are left out. */
        final Set<String> tallyOff = new HashSet<>();
        final List<JsonObject> tallies = new ArrayList<>();
        final Map<String, Long> placed = new HashMap<>(), broken = new HashMap<>();
        final Map<String, Long> sectionPlaced = new HashMap<>();
        final Map<String, Map<String, Long>> sectionBuilders = new HashMap<>();
        final Map<String, Long> placedBlocks = new TreeMap<>();
        final Map<String, Chest> chests = new TreeMap<>();
        final Map<String, Map<String, Long>> stored = new HashMap<>(), taken = new HashMap<>();
        /** Checked storage chests (COOP-05): expected content, check status, bookings per player. */
        final StoreIndex stores = new StoreIndex();
        /** COOP-06: absent members and event ids of hints marked as done. */
        final Map<String, Away> away = new HashMap<>();
        final Set<String> acknowledged = new java.util.LinkedHashSet<>();

        /** Sum of the last counts of all chests. */
        Map<String, Long> stock() {
            Map<String, Long> m = new TreeMap<>();
            for (Chest c : chests.values()) c.items.forEach((k, n) -> m.merge(k, n, Long::sum));
            return m;
        }

        String role(String id) { return roles.getOrDefault(id, known.contains(id) ? "helfer" : "gast"); }
        String name(String id) { return names.getOrDefault(id, id); }
        SectionState section(String id) { return sections.computeIfAbsent(id, k -> new SectionState()); }
        /** Member id of a player name (case-insensitive), via linked player names and names. */
        Optional<String> memberOfPlayer(String player) {
            for (var e : players.entrySet()) if (e.getValue().equalsIgnoreCase(player)) return Optional.of(e.getKey());
            return Optional.empty();
        }
    }

    static final class Chest {
        String name, dimension, countedBy, countedAt;
        int x, y, z;
        boolean partial, counted;
        Map<String, Long> items = new TreeMap<>();
    }

    static int rank(String role) { return ROLES.indexOf(role); }
    static boolean can(String role, String kind) { return NEED.containsKey(kind) && rank(role) >= rank(NEED.get(kind)); }

    View view() {
        View v = new View();
        for (Member m : headerMembers) { v.names.put(m.id, m.name); v.known.add(m.id); if (m.player != null) v.players.put(m.id, m.player); }
        v.known.add(founder);
        v.roles.put(founder, "leitung");
        for (Section s : sections) v.section(s.id);
        for (JsonObject e : events.values()) fold(v, e);
        for (JsonObject t : v.tallies) {
            String by = str(t, "by"), sec = str(t, "section");
            if (v.tallyOff.contains(by)) continue;
            long p = t.get("placed").getAsLong(), b = t.get("broken").getAsLong();
            v.placed.merge(by, p, Long::sum); v.broken.merge(by, b, Long::sum);
            v.sectionPlaced.merge(sec, p, Long::sum);
            if (p > 0) v.sectionBuilders.computeIfAbsent(sec, k -> new HashMap<>()).merge(by, p, Long::sum);
            for (JsonElement l : array(t, "blocks")) { JsonObject o = l.getAsJsonObject(); v.placedBlocks.merge(str(o, "item"), o.get("count").getAsLong(), Long::sum); }
        }
        return v;
    }

    private String sectionName(String id) { return sections.stream().filter(s -> s.id.equals(id)).map(Section::name).findFirst().orElse("entfernter Abschnitt"); }

    private void fold(View v, JsonObject e) {
        String kind = str(e, "kind"), by = str(e, "by"), id = str(e, "id"), at = str(e, "at");
        if (!NEED.containsKey(kind)) return; // newer kind: kept, no effect
        String role = v.role(by);
        boolean selfAllowed = (kind.equals("member.join") || kind.equals("member.player") || kind.equals("member.tally") || kind.equals("member.away")) && by.equals(str(e, "member"));
        if (SERVER_ONLY.contains(kind) && !"server".equals(str(e, "origin"))) { reject(v, id, "Dieser Eintrag kommt nur vom Server-Plugin."); return; }
        if (!selfAllowed && !can(role, kind)) {
            NoteState n = kind.equals("note.resolve") ? v.notes.get(str(e, "noteId")) : null;
            if (n == null || !n.by.equals(by)) { reject(v, id, v.name(by) + " ist " + ROLE_LABEL.get(role) + " und darf das nicht."); return; }
        }
        String sec = str(e, "section");
        switch (kind) {
            case "member.join" -> {
                String m = str(e, "member");
                if (!by.equals(m) && !role.equals("leitung")) { reject(v, id, "Nur die Bauleitung kann andere aufnehmen."); return; }
                v.known.add(m);
                v.names.putIfAbsent(m, str(e, "name"));
                if (str(e, "player") != null) v.players.put(m, str(e, "player"));
            }
            case "member.role" -> {
                String m = str(e, "member"), r = str(e, "role");
                if (!v.known.contains(m)) { reject(v, id, "Unbekanntes Mitglied."); return; }
                long leaders = v.known.stream().filter(x -> v.role(x).equals("leitung")).count();
                if (v.role(m).equals("leitung") && !"leitung".equals(r) && leaders <= 1) { reject(v, id, "Es muss mindestens eine Bauleitung bleiben."); return; }
                v.roles.put(m, r);
            }
            case "member.player" -> {
                String m = str(e, "member");
                if (!by.equals(m) && !role.equals("leitung")) { reject(v, id, "Den Spielernamen setzt jeder selbst oder die Bauleitung."); return; }
                v.players.put(m, str(e, "player"));
            }
            case "section.claim" -> {
                SectionState s = v.section(sec);
                if (by.equals(s.owner)) return;
                if (s.owner != null) { conflict(v, id, v.name(by) + " wollte „" + sectionName(sec) + "“ übernehmen, der Abschnitt war schon an " + v.name(s.owner) + " vergeben."); return; }
                if (s.status.equals("bestaetigt")) { reject(v, id, "„" + sectionName(sec) + "“ ist schon bestätigt."); return; }
                s.owner = by; s.status = "vergeben"; s.doneBy = null; s.verifiedBy = null; s.offer = null;
                if (str(e, "note") != null) s.note = str(e, "note");
                s.history.add(at + " " + v.name(by) + ": übernommen");
            }
            case "section.assign" -> {
                SectionState s = v.section(sec);
                String m = str(e, "member");
                if (!v.known.contains(m)) { reject(v, id, "Unbekanntes Mitglied."); return; }
                if (s.owner != null && !s.owner.equals(m)) conflict(v, id, v.name(by) + " hat „" + sectionName(sec) + "“ von " + v.name(s.owner) + " an " + v.name(m) + " umgewiesen.");
                s.owner = m; s.offer = null;
                if (s.status.equals("frei")) s.status = "vergeben";
                s.history.add(at + " " + v.name(by) + ": zugewiesen an " + v.name(m));
            }
            case "section.release" -> {
                SectionState s = v.section(sec);
                if (!by.equals(s.owner) && !can(role, "section.assign")) { reject(v, id, "Nur " + (s.owner == null ? "der Inhaber" : v.name(s.owner)) + " oder ein Baumeister kann „" + sectionName(sec) + "“ abgeben."); return; }
                if (s.status.equals("bestaetigt")) { reject(v, id, "„" + sectionName(sec) + "“ ist bestätigt und kann nicht mehr abgegeben werden."); return; }
                s.owner = null; s.status = "frei"; s.doneBy = null; s.offer = null;
                s.history.add(at + " " + v.name(by) + ": abgegeben");
            }
            case "section.done" -> {
                SectionState s = v.section(sec);
                if (s.owner != null && !s.owner.equals(by)) conflict(v, id, v.name(by) + " hat „" + sectionName(sec) + "“ fertig gemeldet, Inhaber ist " + v.name(s.owner) + ".");
                if (s.owner == null) s.owner = by;
                s.status = "gemeldet"; s.doneBy = by; s.verifiedBy = null; s.offer = null;
                if (str(e, "note") != null) s.note = str(e, "note");
                s.history.add(at + " " + v.name(by) + ": fertig gemeldet");
            }
            case "section.verify" -> {
                SectionState s = v.section(sec);
                if (s.status.equals("frei")) { reject(v, id, "„" + sectionName(sec) + "“ ist frei, es gibt nichts zu prüfen."); return; }
                boolean ok = e.get("ok").getAsBoolean();
                s.status = ok ? "bestaetigt" : "nacharbeit"; s.verifiedBy = by; s.offer = null;
                if (str(e, "note") != null) s.note = str(e, "note");
                s.history.add(at + " " + v.name(by) + ": " + (ok ? "bestätigt" : "Nacharbeit"));
            }
            case "contribution" -> {
                if (e.has("blocks")) v.blocks.merge(by, e.get("blocks").getAsInt(), Integer::sum);
                if (e.has("items")) for (JsonElement l : e.getAsJsonArray("items")) {
                    JsonObject o = l.getAsJsonObject();
                    v.delivered.merge(str(o, "item"), o.get("count").getAsLong(), Long::sum);
                }
            }
            case "gather.claim" -> {
                String key = by + " " + str(e, "item");
                long count = e.get("count").getAsLong();
                if (count == 0) v.gather.remove(key); else v.gather.put(key, count);
            }
            case "note.add" -> {
                String nid = str(e, "noteId");
                if (v.notes.containsKey(nid)) { reject(v, id, "Notiz-ID doppelt."); return; }
                NoteState n = new NoteState();
                n.id = nid; n.by = by; n.text = str(e, "text"); n.tag = str(e, "tag"); n.section = sec; n.at = at;
                if (e.has("pos")) { JsonArray p = e.getAsJsonArray("pos"); n.pos = new int[] { p.get(0).getAsInt(), p.get(1).getAsInt(), p.get(2).getAsInt() }; }
                v.notes.put(nid, n);
            }
            case "note.resolve" -> {
                NoteState n = v.notes.get(str(e, "noteId"));
                if (n == null) { reject(v, id, "Notiz unbekannt."); return; }
                if (!n.by.equals(by) && !can(role, "section.verify")) { reject(v, id, "Fremde Notizen schließt ein Baumeister."); return; }
                n.resolvedBy = by;
            }
            case "plan.release" -> { v.releaseNumber = e.get("revisionNumber").getAsInt(); v.releaseSummary = str(e, "summary"); }
            case "member.tally" -> {
                if (!by.equals(str(e, "member"))) { reject(v, id, "Den Baunachweis schaltet jeder nur für sich selbst."); return; }
                if (e.get("on").getAsBoolean()) v.tallyOff.remove(by); else v.tallyOff.add(by);
            }
            case "build.tally" -> v.tallies.add(e);
            case "store.chest" -> {
                String c = str(e, "chest");
                Chest known = v.chests.get(c);
                if (e.has("remove") && e.get("remove").getAsBoolean()) { if (known == null) reject(v, id, "Lagerkiste unbekannt."); else { v.chests.remove(c); v.stores.apply(e); } return; }
                Chest ch = known != null ? known : new Chest();
                JsonArray p = e.getAsJsonArray("pos");
                ch.name = str(e, "name"); ch.dimension = str(e, "dimension"); ch.x = p.get(0).getAsInt(); ch.y = p.get(1).getAsInt(); ch.z = p.get(2).getAsInt();
                v.chests.put(c, ch);
            }
            case "store.count" -> {
                Chest ch = v.chests.get(str(e, "chest"));
                if (ch == null) { reject(v, id, "Lagerkiste unbekannt oder entfernt."); return; }
                Map<String, Long> next = new TreeMap<>();
                for (JsonElement l : array(e, "items")) { JsonObject o = l.getAsJsonObject(); next.put(str(o, "item"), o.get("count").getAsLong()); }
                boolean more = e.has("more") && e.get("more").getAsBoolean();
                if (ch.counted && !ch.partial && !more) {
                    Set<String> all = new HashSet<>(ch.items.keySet()); all.addAll(next.keySet());
                    for (String item : all) {
                        long d = next.getOrDefault(item, 0L) - ch.items.getOrDefault(item, 0L);
                        if (d > 0) v.stored.computeIfAbsent(by, k -> new TreeMap<>()).merge(item, d, Long::sum);
                        else if (d < 0) v.taken.computeIfAbsent(by, k -> new TreeMap<>()).merge(item, -d, Long::sum);
                    }
                }
                ch.items = next; ch.partial = more; ch.counted = true; ch.countedBy = by; ch.countedAt = at;
            }
            case "section.handover" -> {
                SectionState s = v.section(sec);
                String m = str(e, "member"), label = sectionName(sec), note = opt(e, "note");
                if (s.status.equals("bestaetigt") || s.status.equals("gemeldet")) { reject(v, id, "„" + label + "“ ist " + (s.status.equals("bestaetigt") ? "bestätigt" : "fertig gemeldet") + " und wird nicht mehr übergeben."); return; }
                if (!by.equals(s.owner) && !can(role, "section.assign")) { reject(v, id, "Nur " + (s.owner == null ? "der Inhaber" : v.name(s.owner)) + " oder ein Baumeister kann „" + label + "“ übergeben."); return; }
                if (m == null || !v.known.contains(m)) { reject(v, id, "Unbekanntes Mitglied " + m + "."); return; }
                if (m.equals(s.owner)) { reject(v, id, v.name(m) + " hat „" + label + "“ schon."); return; }
                if (!can(v.role(m), "section.claim")) { reject(v, id, v.name(m) + " ist " + ROLE_LABEL.get(v.role(m)) + " und kann keine Abschnitte übernehmen."); return; }
                s.offer = new Offer(m, by, at, note);
                s.history.add(at + " " + v.name(by) + ": Übergabe an " + v.name(m) + " angeboten" + (note != null ? ": " + note : ""));
            }
            case "section.accept" -> {
                SectionState s = v.section(sec);
                if (s.offer == null || !s.offer.to().equals(by)) { reject(v, id, "Für " + v.name(by) + " liegt kein Übergabeangebot für „" + sectionName(sec) + "“ vor."); return; }
                String from = s.owner;
                s.owner = by; if (s.status.equals("frei")) s.status = "vergeben";
                if (s.offer.note() != null) s.note = s.offer.note();
                s.offer = null;
                s.history.add(at + " " + v.name(by) + ": Übergabe angenommen" + (from != null ? " (von " + v.name(from) + ")" : ""));
            }
            case "section.decline" -> {
                SectionState s = v.section(sec);
                if (s.offer == null) { reject(v, id, "Für „" + sectionName(sec) + "“ gibt es kein offenes Übergabeangebot."); return; }
                if (!by.equals(s.offer.to()) && !by.equals(s.offer.by()) && !by.equals(s.owner) && !can(role, "section.assign")) { reject(v, id, "Ein fremdes Übergabeangebot zieht ein Baumeister zurück."); return; }
                s.history.add(at + " " + v.name(by) + ": " + (by.equals(s.offer.to()) ? "Übergabe abgelehnt" : "Übergabeangebot zurückgezogen"));
                s.offer = null;
            }
            case "member.away" -> {
                String m = str(e, "member");
                if (!by.equals(m) && !role.equals("leitung")) { reject(v, id, "Abwesenheit trägt jeder selbst ein oder die Bauleitung."); return; }
                String until = opt(e, "until"), note = opt(e, "note");
                if (until != null || note != null) v.away.put(m, new Away(until, note)); else v.away.remove(m);
            }
            case "issue.ack" -> { for (JsonElement x : array(e, "events")) v.acknowledged.add(x.getAsString()); }
            case "store.config", "store.move", "store.check", "store.seal" -> {
                if (!v.chests.containsKey(str(e, "chest"))) { reject(v, id, "Lagerkiste unbekannt oder entfernt."); return; }
            }
            default -> { }
        }
        if (kind.startsWith("store.")) v.stores.apply(e);
    }

    private static void reject(View v, String id, String text) { v.rejected.add(text); v.problems.put(id, text); v.rejectedIds.add(id); }
    private static void conflict(View v, String id, String text) { v.conflicts.add(text); v.problems.put(id, text); }

    /** Sections sorted by distance-free plan order, for listing. */
    List<Section> ordered() {
        List<Section> l = new ArrayList<>(sections);
        l.sort(Comparator.comparingInt(Section::number));
        return l;
    }

    // ------------------------------------------------------------------ json helpers

    static String str(JsonObject o, String key) {
        JsonElement e = o.get(key);
        return e == null || e.isJsonNull() ? null : e.getAsString();
    }
    /** Like {@link #str} but an empty text counts as missing (as {@code event.note && …} in team.ts). */
    static String opt(JsonObject o, String key) {
        String s = str(o, key);
        return s == null || s.isEmpty() ? null : s;
    }
    static String req(JsonObject o, String key) {
        String s = str(o, key);
        if (s == null || s.isEmpty()) throw new IllegalArgumentException("Feld „" + key + "“ fehlt.");
        return s;
    }
    static JsonArray array(JsonObject o, String key) {
        JsonElement e = o.get(key);
        return e != null && e.isJsonArray() ? e.getAsJsonArray() : new JsonArray();
    }
}
