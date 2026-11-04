package io.github.freadeax.bauplaner.mod;

import io.github.freadeax.bauplaner.mod.team.TeamState;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.ToIntFunction;

/**
 * Packing list for the shown part of the plan (GAME-07 stage 6): what still has to be fetched after what the
 * player already carries, in stacks, shulker boxes and inventory rows, and which team storage chest holds it
 * (COOP-04 stores, nearest first). Pure arithmetic; the client passes inventory, stack sizes and stores.
 */
public final class PackList {
    /** Slots of a shulker box or a single chest. */
    public static final int BOX = 27;

    /** Where to take an item from: a team storage chest with its position and distance in blocks. */
    public record Take(String store, int[] pos, int count, int distance) {}

    /** One item: still open in the plan, already carried, to fetch, stacks for that, from chests, still missing. */
    public record Line(String id, int open, int carried, int fetch, int stacks, List<Take> from, int missing) {}

    /** Whole list: lines plus totals in stacks, shulker boxes, and whether it fits the free inventory slots. */
    public record Result(List<Line> lines, int stacks, int boxes, int freeSlots, int missing) {
        public boolean fits() { return stacks <= freeSlots; }
    }

    private PackList() {}

    /**
     * @param open      open materials (from {@link Materials#of(LiveCheck, Filter)})
     * @param carried   items carried per block id (inventory with shulker and bundle contents)
     * @param maxStack  stack size per block id (64, 16 for signs and pearls, 1 for beds …)
     * @param stores    team storage chests (may be empty)
     * @param from      player position for the distance to chests
     * @param freeSlots empty slots in the player's main inventory
     */
    public static Result of(List<Materials.Line> open, Map<String, Integer> carried, ToIntFunction<String> maxStack,
            List<TeamState.Store> stores, double[] from, int freeSlots) {
        List<Line> lines = new ArrayList<>();
        int stacks = 0, missing = 0;
        for (Materials.Line m : open) {
            if (m.open() <= 0) continue;
            int have = Math.max(0, carried.getOrDefault(m.id(), 0));
            int fetch = Math.max(0, m.open() - have);
            int size = Math.max(1, maxStack.applyAsInt(m.id()));
            int st = (fetch + size - 1) / size;
            List<Take> takes = new ArrayList<>();
            int left = fetch;
            if (left > 0) {
                List<TeamState.Store> holding = new ArrayList<>();
                for (TeamState.Store s : stores) if (count(s, m.id()) > 0) holding.add(s);
                holding.sort(Comparator.comparingDouble(s -> distance(s, from)));
                for (TeamState.Store s : holding) {
                    if (left <= 0) break;
                    int take = Math.min(left, count(s, m.id()));
                    takes.add(new Take(s.name() == null || s.name().isBlank() ? s.id() : s.name(), s.pos(), take, (int) Math.round(distance(s, from))));
                    left -= take;
                }
            }
            lines.add(new Line(m.id(), m.open(), Math.min(have, m.open()), fetch, st, List.copyOf(takes), left));
            stacks += st;
            missing += left;
        }
        lines.sort(Comparator.comparingInt(Line::stacks).reversed().thenComparing(Comparator.comparingInt(Line::fetch).reversed()).thenComparing(Line::id));
        return new Result(List.copyOf(lines), stacks, (stacks + BOX - 1) / BOX, Math.max(0, freeSlots), missing);
    }

    private static int count(TeamState.Store s, String id) {
        if (s.items() == null) return 0;
        int n = 0;
        for (TeamState.Item i : s.items()) if (id.equals(i.item())) n += i.count();
        return n;
    }

    private static double distance(TeamState.Store s, double[] from) {
        if (s.pos() == null || s.pos().length < 3 || from == null) return Double.MAX_VALUE / 4;
        double dx = s.pos()[0] + 0.5 - from[0], dy = s.pos()[1] + 0.5 - from[1], dz = s.pos()[2] + 0.5 - from[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
