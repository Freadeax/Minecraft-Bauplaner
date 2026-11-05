package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

/**
 * Pure rules of the checked storage chests (COOP-05, docs/architecture/LAGERKISTEN.md): item counts,
 * check sum, difference against the expected content, booking of moves and the rights matrix. No Bukkit,
 * so the rules are unit tested and the planner fold ({@code packages/domain/src/team/team.ts}) can follow them
 * line by line.
 */
final class StoreLedger {
    private StoreLedger() {}

    /** Protection levels of a store, weakest first. */
    static final List<String> PROTECTIONS = List.of("offen", "team", "abschnitt", "eingang", "gesperrt");
    /** What a store is for; {@code eingang} also selects the protection {@code eingang} when marking. */
    static final List<String> PURPOSES = List.of("vorrat", "eingang", "ausgabe", "rest", "ertrag");
    /** Hopper rule: hoppers may fill a store ({@code einlegen}), also empty it ({@code beides}) or neither ({@code aus}). */
    static final List<String> HOPPER_MODES = List.of("einlegen", "beides", "aus");
    /** Most item lines per event, like {@code store.count} (team.ts). */
    static final int MAX_LINES = 64;

    enum Action { DEPOSIT, WITHDRAW, BREAK }

    /** Rank of a team role ({@code gast} 0 … {@code leitung} 3), −1 for players outside the team. */
    static int rank(String role) { return role == null ? -1 : TeamLog.rank(role); }

    /**
     * Whether a player may do {@code action} at a store. {@code rank} is the team role rank (−1 = not in
     * the team), {@code sectionOwner} whether the player holds the section the store belongs to,
     * {@code admin} the permission {@code bauplaner.lager.verwalten}.
     */
    static boolean allowed(String protection, Action action, int rank, boolean sectionOwner, boolean admin) {
        if (admin) return true;
        String p = PROTECTIONS.contains(protection) ? protection : "team";
        if (action == Action.BREAK) return rank >= (p.equals("gesperrt") ? 3 : 2);
        boolean in = action == Action.DEPOSIT;
        return switch (p) {
            case "offen" -> true;
            case "team" -> rank >= (in ? 0 : 1);
            case "abschnitt" -> in ? rank >= 0 : sectionOwner || rank >= 2;
            case "eingang" -> in || rank >= 2;
            default -> rank >= 2; // gesperrt
        };
    }

    /** One sentence what the level allows, for chat and the planner. */
    static String describe(String protection) {
        return switch (protection) {
            case "offen" -> "alle dürfen einlegen und entnehmen";
            case "abschnitt" -> "Team legt ein, entnehmen nur Inhaber des Abschnitts und Baumeister";
            case "eingang" -> "alle legen ein, entnehmen nur Baumeister";
            case "gesperrt" -> "nur Baumeister und Bauleitung";
            default -> "Team legt ein, Helfer und höher entnehmen";
        };
    }

    static boolean hopperMayInsert(String mode) { return !"aus".equals(mode); }
    static boolean hopperMayExtract(String mode) { return "beides".equals(mode); }

    // ---------------------------------------------------------------- counts

    /** Adds {@code count} of {@code item} (negative removes); zero lines disappear. */
    static void add(TreeMap<String, Long> map, String item, long count) {
        long n = map.getOrDefault(item, 0L) + count;
        if (n == 0) map.remove(item); else map.put(item, n);
    }

    /** {@code a + sign·b}, zero lines dropped. */
    static TreeMap<String, Long> plus(Map<String, Long> a, Map<String, Long> b, int sign) {
        TreeMap<String, Long> out = new TreeMap<>(a);
        b.forEach((k, v) -> add(out, k, sign * v));
        return out;
    }

    /** What changed from {@code before} to {@code after}: positive = added, negative = removed. */
    static TreeMap<String, Long> diff(Map<String, Long> before, Map<String, Long> after) { return plus(after, before, -1); }

    static TreeMap<String, Long> positive(Map<String, Long> delta) {
        TreeMap<String, Long> out = new TreeMap<>();
        delta.forEach((k, v) -> { if (v > 0) out.put(k, v); });
        return out;
    }

    static TreeMap<String, Long> negativeAsPositive(Map<String, Long> delta) {
        TreeMap<String, Long> out = new TreeMap<>();
        delta.forEach((k, v) -> { if (v < 0) out.put(k, -v); });
        return out;
    }

    /** SHA-256 (hex) over the sorted lines {@code item=count\n}; equal content gives the same sum everywhere. */
    static String sha256(Map<String, Long> items) {
        StringBuilder text = new StringBuilder();
        new TreeMap<>(items).forEach((k, v) -> { if (v != 0) text.append(k).append('=').append(v).append('\n'); });
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static long total(Map<String, Long> items) { return items.values().stream().mapToLong(Long::longValue).sum(); }

    // ---------------------------------------------------------------- JSON

    /** Item lines {@code [{item, count}]}, biggest first, at most {@link #MAX_LINES}. */
    static JsonArray json(Map<String, Long> items) {
        JsonArray a = new JsonArray();
        items.entrySet().stream().filter(e -> e.getValue() != 0)
                .sorted((x, y) -> Long.compare(Math.abs(y.getValue()), Math.abs(x.getValue())) != 0 ? Long.compare(Math.abs(y.getValue()), Math.abs(x.getValue())) : x.getKey().compareTo(y.getKey()))
                .limit(MAX_LINES).forEach(e -> { JsonObject l = new JsonObject(); l.addProperty("item", e.getKey()); l.addProperty("count", e.getValue()); a.add(l); });
        return a;
    }

    /** Difference lines {@code [{item, delta}]}, biggest change first, at most {@link #MAX_LINES}. */
    static JsonArray jsonDiff(Map<String, Long> delta) {
        JsonArray a = new JsonArray();
        for (JsonElement e : json(delta)) {
            JsonObject l = e.getAsJsonObject();
            JsonObject d = new JsonObject(); d.addProperty("item", l.get("item").getAsString()); d.addProperty("delta", l.get("count").getAsLong()); a.add(d);
        }
        return a;
    }

    static boolean truncated(Map<String, Long> items) { return items.values().stream().filter(v -> v != 0).count() > MAX_LINES; }

    static TreeMap<String, Long> read(JsonArray lines, String countField) {
        TreeMap<String, Long> out = new TreeMap<>();
        if (lines == null) return out;
        for (JsonElement e : lines) {
            JsonObject l = e.getAsJsonObject();
            if (l.has("item") && l.has(countField)) add(out, l.get("item").getAsString(), l.get(countField).getAsLong());
        }
        return out;
    }

    // ---------------------------------------------------------------- texts

    /** "3×64 + 12 Stein" style amount: stacks when it helps. */
    static String amount(long n) {
        long a = Math.abs(n);
        String s = a < 128 ? String.valueOf(a) : a % 64 == 0 ? a / 64 + "×64" : a / 64 + "×64+" + a % 64;
        return (n < 0 ? "−" : "") + s;
    }

    static String shortItem(String item) { return item.startsWith("minecraft:") ? item.substring(10) : item; }

    /** "+12 stone, −3 oak_log" (at most {@code max} parts). */
    static String diffText(Map<String, Long> delta, int max) {
        StringBuilder b = new StringBuilder();
        int n = 0;
        for (JsonElement e : json(delta)) {
            JsonObject l = e.getAsJsonObject();
            if (n++ == max) { b.append(", …"); break; }
            if (b.length() > 0) b.append(", ");
            long c = l.get("count").getAsLong();
            b.append(c > 0 ? "+" : "").append(amount(c)).append(' ').append(shortItem(l.get("item").getAsString()));
        }
        return b.toString();
    }

    /** Protection level from user text (also short forms), empty if unknown. */
    static Optional<String> protection(String text) {
        String t = text.toLowerCase(Locale.ROOT);
        return PROTECTIONS.stream().filter(p -> p.startsWith(t)).findFirst();
    }

    static Optional<String> purpose(String text) {
        String t = text.toLowerCase(Locale.ROOT);
        return PURPOSES.stream().filter(p -> p.startsWith(t)).findFirst();
    }
}
