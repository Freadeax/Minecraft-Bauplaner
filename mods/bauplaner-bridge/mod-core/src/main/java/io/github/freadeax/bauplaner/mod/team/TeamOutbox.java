package io.github.freadeax.bauplaner.mod.team;

import io.github.freadeax.bauplaner.mod.live.Json;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Team actions the player triggered in the game (take over, give back, report done, note, delivery …)
 * that no one has confirmed yet. Each action already carries its final event id, so sending it twice
 * (after a lost answer, a restart, a reconnect) never counts twice: the planner merges by id and the
 * plugin answers "schon übernommen". Kept on disk per server, so actions made while the server or the
 * planner were away survive a game restart and go out when a way is open again.
 * <p>
 * An action leaves the outbox when the plugin confirms it ({@code ack}), the planner acknowledges it
 * ({@code POST /v1/team/ack}) or the plugin rejects it (then with a reason the player sees).
 */
public final class TeamOutbox {
    public static final int MAX = 200;
    /** Kinds the mod may write; rights are checked again by the plugin or the planner fold. */
    public static final List<String> KINDS = List.of("section.claim", "section.release", "section.done", "section.verify", "section.assign",
            "contribution", "gather.claim", "note.add", "note.resolve");
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

    /** One action: event body without {@code by}/{@code origin} (the receiving side sets them). */
    public record Action(String id, String at, String kind, String teamId, Map<String, Object> body) {
        public String str(String key) { return body.get(key) instanceof String s ? s : null; }

        /** As a team event of {@code by} written in the planner (origin "planer"). */
        public Map<String, Object> asEvent(String by) {
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("id", id); e.put("at", at); e.put("by", by); e.put("origin", "planer"); e.put("kind", kind);
            e.putAll(body);
            return e;
        }

        /** As sent on the plugin channel (the plugin sets by, origin and the server time). */
        public Map<String, Object> asWire() {
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("id", id); e.put("at", at); e.put("kind", kind);
            e.putAll(body);
            return e;
        }
    }

    private final Path file;
    private final List<Action> actions = new ArrayList<>();
    private final java.util.function.Supplier<Instant> clock;

    public TeamOutbox(Path file) { this(file, Instant::now); }

    public TeamOutbox(Path file, java.util.function.Supplier<Instant> clock) {
        this.file = file;
        this.clock = clock;
        load();
    }

    /** Event id in the planner's form ({@code tev_} + 16 characters), but marked as written in the mod. */
    public static String newId() {
        StringBuilder b = new StringBuilder("tev_m");
        for (int i = 0; i < 15; i++) b.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        return b.toString();
    }

    /** Adds an action for {@code teamId}; returns it. Throws when the kind is unknown or the box is full. */
    public synchronized Action add(String teamId, String kind, Map<String, Object> body) {
        if (!KINDS.contains(kind)) throw new IllegalArgumentException("Unbekannte Teamaktion " + kind);
        if (actions.size() >= MAX) throw new IllegalStateException("Schon " + MAX + " Teamaktionen warten. Bitte erst mit Server oder Planer abgleichen.");
        Action a = new Action(newId(), TeamWire.time(clock.get()), kind, teamId, Map.copyOf(body));
        actions.add(a);
        save();
        return a;
    }

    public synchronized List<Action> pending() { return List.copyOf(actions); }

    public synchronized List<Action> pending(String teamId) { return actions.stream().filter(a -> a.teamId.equals(teamId)).toList(); }

    public synchronized boolean isEmpty() { return actions.isEmpty(); }

    /** Removes confirmed/rejected actions; returns how many were removed. */
    public synchronized int remove(java.util.Collection<String> ids) {
        int before = actions.size();
        actions.removeIf(a -> ids.contains(a.id));
        if (actions.size() != before) save();
        return before - actions.size();
    }

    public synchronized void clear() { actions.clear(); save(); }

    // ------------------------------------------------------------------ disk

    private void load() {
        if (file == null || !Files.exists(file)) return;
        try {
            for (Object o : Json.arr(Json.parse(Files.readString(file, StandardCharsets.UTF_8)), "Ausgangskorb")) {
                Map<String, Object> m = Json.obj(o, "Aktion");
                String kind = Json.str(m.get("kind"), "Art", 40);
                if (!KINDS.contains(kind)) continue;
                @SuppressWarnings("unchecked") Map<String, Object> body = m.get("body") instanceof Map<?, ?> b ? (Map<String, Object>) b : Map.of();
                actions.add(new Action(Json.str(m.get("id"), "ID", 64), Json.str(m.get("at"), "Zeit", 40), kind, Json.str(m.get("teamId"), "Team", 64), Map.copyOf(body)));
                if (actions.size() >= MAX) break;
            }
        } catch (IOException | RuntimeException e) {
            // A damaged file must not stop the game; keep it for the diagnose report.
            try { Files.move(file, file.resolveSibling(file.getFileName() + ".defekt"), StandardCopyOption.REPLACE_EXISTING); } catch (IOException ignored) { }
        }
    }

    private void save() {
        if (file == null) return;
        List<Object> out = new ArrayList<>();
        for (Action a : actions) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.id); m.put("at", a.at); m.put("kind", a.kind); m.put("teamId", a.teamId); m.put("body", a.body);
            out.add(m);
        }
        try {
            Files.createDirectories(file.getParent());
            Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
            Files.writeString(tmp, Json.write(out), StandardCharsets.UTF_8);
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException ignored) {
            // Not fatal: the actions stay in memory until the game closes.
        }
    }
}
