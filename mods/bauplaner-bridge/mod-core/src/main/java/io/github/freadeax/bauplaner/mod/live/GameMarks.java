package io.github.freadeax.bauplaner.mod.live;

import io.github.freadeax.bauplaner.mod.team.TeamWire;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Live protocol 3 (GAME-08): points set in the game with {@code /bauplaner markieren}, waiting for the Weltkarte
 * of the planner. They stay in a small outbox file until the planner took them into its Weltplan and acknowledged
 * them ({@code GET /v1/marks/game}, {@code POST /v1/marks/game/ack}); until then the game shows them on the layer
 * {@link #LAYER}. Every entry carries the time it was set, so the planner can order and de-duplicate them.
 */
public final class GameMarks {
    public static final String LAYER = "Aus dem Spiel";
    public static final int MAX = 200;
    public static final Set<String> TYPES = Set.of("anker", "ziel", "lager", "portal", "farm", "treffpunkt", "notiz", "gefahr", "rohstoff", "spawn", "aussicht");

    public record Mark(String id, String type, String name, String dimension, int x, int y, int z, String at, String by) {
        Map<String, Object> json() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", id); m.put("type", type); m.put("name", name); m.put("dimension", dimension);
            m.put("x", x); m.put("y", y); m.put("z", z); m.put("at", at);
            if (by != null) m.put("by", by);
            return m;
        }
    }

    private final List<Mark> marks = new ArrayList<>();
    private final Path file;
    private int counter;

    /** @param file outbox file, or null for memory only (tests) */
    public GameMarks(Path file) { this.file = file; }

    public synchronized List<Mark> list() { return List.copyOf(marks); }

    public synchronized int size() { return marks.size(); }

    /** Adds a point; the name defaults to the label of its kind. */
    public synchronized Mark add(String type, String name, String dimension, int x, int y, int z, String by, Instant now) {
        if (!TYPES.contains(type)) throw new IllegalArgumentException("Art unbekannt: " + type + ". Möglich: " + String.join(", ", TYPES.stream().sorted().toList()) + ".");
        if (marks.size() >= MAX) throw new IllegalArgumentException("Schon " + MAX + " Markierungen warten auf den Planer – erst auf der Weltkarte übernehmen.");
        String n = name == null || name.isBlank() ? WorldMarks.typeLabel(type) : name.strip();
        if (n.length() > 80) n = n.substring(0, 80);
        Mark m = new Mark("g" + Long.toString(now.toEpochMilli(), 36) + "-" + (counter++), type, n, dimension, x, y, z, TeamWire.time(now), by);
        marks.add(m);
        save();
        return m;
    }

    /** Removes one waiting point by id or by its number in {@link #list()} (1-based); false if unknown. */
    public synchronized boolean remove(String idOrNumber) {
        try {
            int n = Integer.parseInt(idOrNumber);
            if (n >= 1 && n <= marks.size()) { marks.remove(n - 1); save(); return true; }
        } catch (NumberFormatException ignored) { }
        boolean gone = marks.removeIf(m -> m.id().equals(idOrNumber));
        if (gone) save();
        return gone;
    }

    /** The planner took these into its Weltplan: they leave the outbox. Returns how many were removed. */
    public synchronized int ack(Collection<String> ids) {
        int before = marks.size();
        marks.removeIf(m -> ids.contains(m.id()));
        if (marks.size() != before) save();
        return before - marks.size();
    }

    /** {@code {"marks":[…]}} for GET /v1/marks/game. */
    public synchronized String json() {
        List<Object> out = new ArrayList<>();
        for (Mark m : marks) out.add(m.json());
        return Json.write(Map.of("marks", out));
    }

    /** Points of one dimension, as Weltplan points on {@link #LAYER} (for drawing in the game). */
    public synchronized List<WorldMarks.Point> points(String dimension) {
        List<WorldMarks.Point> out = new ArrayList<>();
        for (Mark m : marks) if (m.dimension().equals(dimension)) out.add(new WorldMarks.Point(m.name(), m.type(), m.x(), m.y(), m.z(), new WorldMarks.Extras(LAYER, null)));
        return out;
    }

    public synchronized void load() {
        if (file == null || !Files.exists(file)) return;
        try {
            var body = Json.obj(Json.parse(Files.readString(file, StandardCharsets.UTF_8)), "Markierungen aus dem Spiel");
            marks.clear();
            for (Object o : Json.arr(body.get("marks"), "Markierungen")) {
                var m = Json.obj(o, "Markierung");
                String type = Json.str(m.get("type"), "Art", 20);
                if (!TYPES.contains(type)) continue;
                marks.add(new Mark(Json.str(m.get("id"), "ID", 40), type, Json.str(m.get("name"), "Name", 80), Json.str(m.get("dimension"), "Dimension", 200),
                        Json.integer(m.get("x"), "x", -30_000_000, 30_000_000), Json.integer(m.get("y"), "y", -2048, 4096), Json.integer(m.get("z"), "z", -30_000_000, 30_000_000),
                        Json.str(m.get("at"), "Zeit", 40), m.get("by") == null ? null : Json.str(m.get("by"), "Spieler", 64)));
                if (marks.size() >= MAX) break;
            }
        } catch (IOException | RuntimeException ignored) {
            // A broken outbox is not worth a crash; the player can set the points again.
        }
    }

    private void save() {
        if (file == null) return;
        try {
            Files.createDirectories(file.getParent());
            Files.writeString(file, json(), StandardCharsets.UTF_8);
        } catch (IOException ignored) { }
    }
}
