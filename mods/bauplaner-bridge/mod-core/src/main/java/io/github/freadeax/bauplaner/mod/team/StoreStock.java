package io.github.freadeax.bauplaner.mod.team;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * COOP-05 S04: stock of the team's storage chests in the game – from the plugin's team channel (counted and
 * checked on the server) or, without a plugin, from the team room (what a player's mod last saw, unverified).
 * Pure arithmetic for the material list, the packing list and {@code /bauplaner team lager}.
 */
public final class StoreStock {
    private StoreStock() {}

    /** Stock of one item over all chests in a dimension, and whether any of it is only seen (unverified). */
    public record Amount(int count, boolean unverified) {
        public static final Amount NONE = new Amount(0, false);
        /** "120" or "120*" (star: only seen in the game). */
        public String label() { return count == 0 ? "–" : count + (unverified ? "*" : ""); }
    }

    /** Stock per item over all chests of the dimension (chests without stock are skipped). */
    public static Map<String, Amount> totals(List<TeamState.Store> stores, String dimension) {
        Map<String, Amount> out = new TreeMap<>();
        if (stores == null) return out;
        for (TeamState.Store s : stores) {
            if (dimension != null && s.dimension() != null && !dimension.equals(s.dimension())) continue;
            if ("fehlt".equals(s.status())) continue;
            for (TeamState.Item i : s.items()) {
                if (i.count() <= 0) continue;
                out.merge(i.item(), new Amount(i.count(), s.unverified()), (a, b) -> new Amount(sat(a.count() + b.count()), a.unverified() || b.unverified()));
            }
        }
        return out;
    }

    private static int sat(long v) { return (int) Math.min(Integer.MAX_VALUE, v); }

    /** Where a chest's stock comes from, for chat and screens: "vom Server gezählt vor 3 Min" / "im Spiel gesehen von Tom vor 1 Std (ungeprüft)". */
    public static String source(TeamState.Store s, Instant now) {
        String when = ago(s.stockAt(), now);
        if (s.unverified()) return "im Spiel gesehen" + (s.stockBy() != null ? " von " + s.stockBy() : "") + (when.isEmpty() ? "" : " " + when) + " (ungeprüft)";
        if ("server".equals(s.origin())) return "vom Server gezählt" + (when.isEmpty() ? "" : " " + when);
        return "noch nicht gezählt";
    }

    /** "vor 3 Min", "vor 2 Std", "vor 4 Tagen", "gerade eben"; empty when the time is unknown. */
    public static String ago(String iso, Instant now) {
        if (iso == null || now == null) return "";
        try {
            long s = Duration.between(Instant.parse(iso), now).getSeconds();
            if (s < 60) return "gerade eben";
            if (s < 3600) return "vor " + (s / 60) + " Min";
            if (s < 86_400) return "vor " + (s / 3600) + " Std";
            long d = s / 86_400;
            return "vor " + d + (d == 1 ? " Tag" : " Tagen");
        } catch (DateTimeParseException e) {
            return "";
        }
    }
}
