package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

/**
 * Fold of the checked storage chests (COOP-05, docs/architecture/team/LAGERKISTEN.md §9) over the store events
 * of a team log. {@link TeamLog} checks rights and origin and then calls {@link #apply}; the planner
 * ({@code packages/domain/src/team/team.ts}) applies the same rules in the same order. Pure Java, no Bukkit.
 * <ul>
 * <li>{@code store.chest} marks (or with {@code remove} unmarks) a container; {@code store.config} sets
 * section, purpose, protection and the second half of a double chest.</li>
 * <li>{@code store.count} is the counted content; the expected content starts from it.</li>
 * <li>{@code store.move} books what a player (or a hopper) put in or took out; it moves the expected
 * content but is never booked again as stored/taken (that comes from the counts).</li>
 * <li>{@code store.check} is the server's comparison of a count with the expected content: {@code geprueft},
 * {@code abweichend} (with the unexplained difference, which adds up until a seal) or {@code fehlt}.</li>
 * <li>{@code store.seal} accepts the current content: open differences are closed.</li>
 * </ul>
 */
final class StoreIndex {
    static final int RECENT = 40;

    record Move(String at, String by, String via, TreeMap<String, Long> in, TreeMap<String, Long> out) {}

    static final class Store {
        final String id;
        String name, dimension;
        int[] pos, pos2;
        String section, purpose = "vorrat", protection;
        /** COOP-08: farm of a yield store, measured yield and loaded minutes (store.yield). */
        String farm;
        final TreeMap<String, Long> yieldIn = new TreeMap<>();
        long yieldMinutes;
        boolean removed;
        /** Last counted content and when; null before the first count. */
        TreeMap<String, Long> items;
        String countedAt;
        boolean partial;
        /** Content the server expects: last count plus moves booked since. */
        TreeMap<String, Long> expected;
        /** geprueft, abweichend, fehlt or ungeprueft (never checked). */
        String status = "ungeprueft";
        String checkedAt;
        /** Unexplained difference since the last seal (sum of the differences of all deviating checks). */
        final TreeMap<String, Long> deviation = new TreeMap<>();
        String sealedBy, sealedAt;
        /** In/out per member (player moves) and for hoppers ({@code "trichter"}). */
        final Map<String, TreeMap<String, Long>> in = new LinkedHashMap<>(), out = new LinkedHashMap<>();
        final Deque<Move> recent = new ArrayDeque<>();

        Store(String id) { this.id = id; }

        boolean at(String dim, int x, int y, int z) {
            if (removed || !dimension.equals(dim)) return false;
            return pos[0] == x && pos[1] == y && pos[2] == z || pos2 != null && pos2[0] == x && pos2[1] == y && pos2[2] == z;
        }

        String protectionOr(String fallback) { return protection != null ? protection : "eingang".equals(purpose) ? "eingang" : fallback; }
        boolean deviating() { return "abweichend".equals(status) || !deviation.isEmpty(); }
    }

    final Map<String, Store> stores = new LinkedHashMap<>();

    Store get(String id) { return stores.get(id); }

    Store at(String dim, int x, int y, int z) {
        for (Store s : stores.values()) if (s.at(dim, x, y, z)) return s;
        return null;
    }

    private static int[] xyz(JsonObject e, String field) {
        if (!e.has(field) || !e.get(field).isJsonArray()) return null;
        JsonArray a = e.getAsJsonArray(field);
        return a.size() == 3 ? new int[] { a.get(0).getAsInt(), a.get(1).getAsInt(), a.get(2).getAsInt() } : null;
    }

    private static String str(JsonObject e, String f) { return e.has(f) && !e.get(f).isJsonNull() ? e.get(f).getAsString() : null; }

    /** Applies one store event (rights already checked); returns a problem text or null. */
    String apply(JsonObject e) {
        String kind = str(e, "kind"), id = str(e, "chest"), at = str(e, "at"), by = str(e, "by");
        if (id == null) return "Lagerereignis ohne Kiste.";
        Store s = stores.get(id);
        if (kind.equals("store.chest")) {
            if (e.has("remove") && e.get("remove").getAsBoolean()) {
                if (s != null) s.removed = true;
                return null;
            }
            int[] p = xyz(e, "pos");
            if (p == null) return "Lagerkiste ohne Position.";
            if (s == null) { s = new Store(id); stores.put(id, s); }
            s.removed = false;
            s.name = str(e, "name") != null ? str(e, "name") : "Lager";
            s.dimension = str(e, "dimension") != null ? str(e, "dimension") : "minecraft:overworld";
            s.pos = p;
            return null;
        }
        if (s == null) return "Unbekannte Lagerkiste " + id + ".";
        return applyTo(s, kind, e, at, by);
    }

    private static String applyTo(Store s, String kind, JsonObject e, String at, String by) {
        switch (kind) {
            case "store.config" -> {
                if (e.has("section")) { String sec = str(e, "section"); s.section = sec == null || sec.isEmpty() ? null : sec; }
                if (e.has("purpose") && StoreLedger.PURPOSES.contains(str(e, "purpose"))) s.purpose = str(e, "purpose");
                if (e.has("protection")) { String p = str(e, "protection"); s.protection = StoreLedger.PROTECTIONS.contains(p) ? p : null; }
                if (e.has("pos2")) s.pos2 = xyz(e, "pos2");
                if (e.has("name") && str(e, "name") != null && !str(e, "name").isBlank()) s.name = str(e, "name");
                if (e.has("farm")) { String f = str(e, "farm"); s.farm = f == null || f.isEmpty() ? null : f; }
            }
            case "store.yield" -> {
                StoreLedger.read(e.getAsJsonArray("items"), "count").forEach((k, v) -> StoreLedger.add(s.yieldIn, k, v));
                if (e.has("minutes")) s.yieldMinutes += e.get("minutes").getAsLong();
            }
            case "store.count" -> {
                s.items = StoreLedger.read(e.getAsJsonArray("items"), "count");
                s.partial = e.has("more") && e.get("more").getAsBoolean();
                s.countedAt = at;
                s.expected = new TreeMap<>(s.items);
            }
            case "store.move" -> {
                TreeMap<String, Long> in = StoreLedger.read(e.getAsJsonArray("in"), "count"), out = StoreLedger.read(e.getAsJsonArray("out"), "count");
                String via = "trichter".equals(str(e, "via")) ? "trichter" : "spieler";
                String who = via.equals("trichter") ? "trichter" : by;
                in.forEach((k, v) -> StoreLedger.add(s.in.computeIfAbsent(who, x -> new TreeMap<>()), k, v));
                out.forEach((k, v) -> StoreLedger.add(s.out.computeIfAbsent(who, x -> new TreeMap<>()), k, v));
                if (s.expected != null) { s.expected = StoreLedger.plus(s.expected, in, 1); s.expected = StoreLedger.plus(s.expected, out, -1); }
                s.recent.addFirst(new Move(at, by, via, in, out));
                while (s.recent.size() > RECENT) s.recent.removeLast();
            }
            case "store.check" -> {
                String st = str(e, "status");
                if (!"geprueft".equals(st) && !"abweichend".equals(st) && !"fehlt".equals(st)) return "Unbekannter Prüfstatus " + st + ".";
                s.checkedAt = at;
                if (st.equals("abweichend")) StoreLedger.read(e.getAsJsonArray("diff"), "delta").forEach((k, v) -> StoreLedger.add(s.deviation, k, v));
                // A deviation stays until a seal; a later clean check does not hide it.
                s.status = st.equals("geprueft") && !s.deviation.isEmpty() ? "abweichend" : st;
            }
            case "store.seal" -> {
                s.deviation.clear();
                s.status = "geprueft";
                s.sealedBy = by; s.sealedAt = at;
                if (s.items != null) s.expected = new TreeMap<>(s.items);
            }
            default -> { return null; }
        }
        return null;
    }
}
