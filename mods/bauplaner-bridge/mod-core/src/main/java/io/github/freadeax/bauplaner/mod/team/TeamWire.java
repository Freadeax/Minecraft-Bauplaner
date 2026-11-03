package io.github.freadeax.bauplaner.mod.team;

import io.github.freadeax.bauplaner.mod.live.Json;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Message format of the plugin channel {@code bauplaner:team} (COOP-03, the same class is compiled into
 * the Paper plugin, so both ends frame alike). A message is one UTF-8 JSON object {@code {"v":1,"t":type,…}}.
 * Vanilla limits a client → server custom payload to 32 767 bytes, so longer messages travel as parts
 * {@code {"v":1,"t":"part","id":…,"i":k,"n":count,"d":base64}} and are put together by {@link Assembler}.
 */
public final class TeamWire {
    private static final java.time.format.DateTimeFormatter TIME = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(java.time.ZoneOffset.UTC);

    /**
     * Event time exactly as the planner writes it ({@code Date.toISOString()}: always milliseconds, "Z"). The
     * planner sorts events by this text, so "…:05Z" (Instant.toString without fraction) or nanoseconds would
     * sort wrongly next to "…:05.200Z".
     */
    public static String time(java.time.Instant t) { return TIME.format(t); }

    private TeamWire() {}

    public static final String CHANNEL = "bauplaner:team";
    public static final int VERSION = 1;
    /** Bytes per frame; below the vanilla 32 767 for client → server, with room for the part envelope. */
    public static final int FRAME = 24_000;
    /** Largest message after assembly (a team file with 20 000 events is about 3 MB). */
    public static final int MAX_MESSAGE = 6 * 1024 * 1024;
    /** Parts open at the same time (per connection). */
    static final int MAX_OPEN = 8;

    /** Frames for one message (JSON of a map with at least {@code t}); {@code v} is added. */
    public static List<byte[]> frames(Map<String, Object> message, String partId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("v", VERSION);
        m.putAll(message);
        byte[] whole = Json.write(m).getBytes(StandardCharsets.UTF_8);
        if (whole.length > MAX_MESSAGE) throw new IllegalArgumentException("Nachricht zu groß (" + whole.length + " Bytes)");
        if (whole.length <= FRAME) return List.of(whole);
        int raw = FRAME * 3 / 4 - 200;
        int n = (whole.length + raw - 1) / raw;
        List<byte[]> out = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            int from = i * raw, to = Math.min(whole.length, from + raw);
            byte[] chunk = java.util.Arrays.copyOfRange(whole, from, to);
            Map<String, Object> part = new LinkedHashMap<>();
            part.put("v", VERSION); part.put("t", "part"); part.put("id", partId); part.put("i", i); part.put("n", n);
            part.put("d", Base64.getEncoder().encodeToString(chunk));
            out.add(Json.write(part).getBytes(StandardCharsets.UTF_8));
        }
        return out;
    }

    /** Puts parts together; whole messages pass straight through. Not thread safe (one per connection). */
    public static final class Assembler {
        private record Open(int n, byte[][] parts, int[] have, int bytes) {}
        private final Map<String, Open> open = new HashMap<>();

        /** The complete message, or null while parts are missing. Throws on malformed frames. */
        public Map<String, Object> accept(byte[] frame) {
            if (frame.length > 64 * 1024) throw new Json.JsonException("Teil zu groß");
            Map<String, Object> m = Json.obj(Json.parse(new String(frame, StandardCharsets.UTF_8)), "Nachricht");
            int v = m.get("v") == null ? 0 : Json.integer(m.get("v"), "Version", 0, 1000);
            if (v != VERSION) throw new Json.JsonException("Unbekannte Version " + v + " des Teamkanals");
            String t = Json.str(m.get("t"), "Typ", 40);
            if (!t.equals("part")) return m;
            String id = Json.str(m.get("id"), "Teil-ID", 64);
            int n = Json.integer(m.get("n"), "Teile", 1, MAX_MESSAGE / 1000), i = Json.integer(m.get("i"), "Teil", 0, n - 1);
            byte[] data = Base64.getDecoder().decode(Json.str(m.get("d"), "Daten", 64 * 1024));
            Open o = open.get(id);
            if (o == null) {
                if (open.size() >= MAX_OPEN) open.clear(); // a peer that never finishes must not fill the memory
                o = new Open(n, new byte[n][], new int[] { 0 }, 0);
                open.put(id, o);
            }
            if (o.n != n) throw new Json.JsonException("Teilanzahl wechselt");
            if (o.parts[i] == null) {
                o.parts[i] = data;
                o.have[0]++;
                int bytes = 0;
                for (byte[] p : o.parts) if (p != null) bytes += p.length;
                if (bytes > MAX_MESSAGE) { open.remove(id); throw new Json.JsonException("Nachricht zu groß"); }
            }
            if (o.have[0] < n) return null;
            open.remove(id);
            int total = 0;
            for (byte[] p : o.parts) total += p.length;
            byte[] whole = new byte[total];
            int at = 0;
            for (byte[] p : o.parts) { System.arraycopy(p, 0, whole, at, p.length); at += p.length; }
            return Json.obj(Json.parse(new String(whole, StandardCharsets.UTF_8)), "Nachricht");
        }

        public void clear() { open.clear(); }
    }
}
