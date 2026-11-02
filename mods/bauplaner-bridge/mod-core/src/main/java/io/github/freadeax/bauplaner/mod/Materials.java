package io.github.freadeax.bauplaner.mod;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Material list of a placed plan: per block id how many items the plan needs in total and how many
 * are still open (missing or wrong block). Two-cell blocks count once (door, tall plant, bed), a double
 * slab counts two slabs. States (facing …) do not matter for items.
 */
public final class Materials {
    /** One block type; {@code open} still has to be placed, {@code total} is the whole plan. */
    public record Line(String id, int open, int total) {}

    private Materials() {}

    /** Items one planned cell needs: 0 for the second half of two-cell blocks, 2 for double slabs. */
    public static int itemsFor(BlockState s) {
        var p = s.properties();
        if ("upper".equals(p.get("half"))) return 0;            // doors, tall flowers, tall grass
        if ("head".equals(p.get("part"))) return 0;             // beds
        if ("double".equals(p.get("type")) && s.id().endsWith("_slab")) return 2;
        if (s.id().equals("minecraft:piston_head") || s.id().equals("minecraft:moving_piston")) return 0;
        return 1;
    }

    /** Within world heights {@code minY..maxY}; sorted by open items, then total, then id. */
    public static List<Line> of(LiveCheck check, int minY, int maxY) { return of(check, new Filter(minY, maxY, 0)); }

    /** Inside a filter (layer mode, build section); same sorting. */
    public static List<Line> of(LiveCheck check, Filter filter) {
        Map<String, int[]> map = new HashMap<>();
        for (int i = 0; i < check.size(); i++) {
            if (!filter.test(check, i)) continue;
            BlockState s = check.expected(i);
            int n = itemsFor(s);
            if (n == 0) continue;
            int[] c = map.computeIfAbsent(s.id(), k -> new int[2]);
            c[1] += n;
            Verdict v = check.verdict(i);
            if (v == Verdict.MISSING || v == Verdict.WRONG) c[0] += n;
        }
        var out = new ArrayList<Line>();
        map.forEach((id, c) -> out.add(new Line(id, c[0], c[1])));
        out.sort(Comparator.comparingInt(Line::open).reversed().thenComparing(Comparator.comparingInt(Line::total).reversed()).thenComparing(Line::id));
        return out;
    }

    public static List<Line> of(LiveCheck check) { return of(check, Filter.ALL); }
}
