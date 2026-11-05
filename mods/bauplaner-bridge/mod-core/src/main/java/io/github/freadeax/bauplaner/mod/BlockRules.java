package io.github.freadeax.bauplaner.mod;

import java.util.HashSet;
import java.util.Set;

/**
 * Comparison of a planned and a found block, rule for rule the same as the website
 * ({@code packages/domain/src/building/gameCheck.ts}: {@code compareBlock}, {@code ignoredProperties}).
 * scripts/bridge_crosscheck.mjs feeds both sides the same cases.
 */
public final class BlockRules {
    private BlockRules() {}

    public enum Verdict {
        /** Same block, all relevant properties equal. */ OK,
        /** Same block, other orientation or construction property. */ STATE,
        /** Air where a block is planned. */ MISSING,
        /** Another block. */ WRONG,
        /** Not readable (chunk not loaded). */ UNKNOWN
    }

    private static final Set<String> AIR = Set.of("minecraft:air", "minecraft:cave_air", "minecraft:void_air");
    private static final Set<String> GLOBAL_IGNORED = Set.of("powered", "power", "open", "occupied", "triggered", "extended", "enabled", "in_wall",
            "attached", "disarmed", "instrument", "has_book", "has_record", "has_bottle_0", "has_bottle_1", "has_bottle_2", "snowy", "age", "stage", "moisture");
    private static final Set<String> CONNECTIONS = Set.of("north", "east", "south", "west", "up", "down");
    private static final Set<String> CONNECTING_NAMES = Set.of("iron_bars", "glass_pane", "chorus_plant", "tripwire", "redstone_wire", "mushroom_stem");
    private static final String[] CONNECTING_SUFFIX = { "_fence", "_pane", "_wall", "_mushroom_block" };
    private static final Set<String> LIT_DERIVED = Set.of("furnace", "blast_furnace", "smoker", "redstone_lamp", "redstone_torch", "redstone_wall_torch",
            "redstone_ore", "deepslate_redstone_ore");

    public static boolean isAir(String id) { return AIR.contains(id); }

    /** Properties the game derives from neighbours or operation; no building mistake. Mod namespaces compare everything. */
    public static Set<String> ignoredProperties(String id) {
        if (!id.startsWith("minecraft:")) return Set.of();
        String name = id.substring("minecraft:".length());
        var out = new HashSet<>(GLOBAL_IGNORED);
        boolean connecting = CONNECTING_NAMES.contains(name);
        for (String s : CONNECTING_SUFFIX) connecting |= name.endsWith(s);
        if (connecting) out.addAll(CONNECTIONS);
        if (name.endsWith("_leaves")) { out.add("distance"); out.add("persistent"); }
        if (name.equals("scaffolding")) { out.add("distance"); out.add("bottom"); }
        if (name.endsWith("_stairs")) out.add("shape");
        if (name.equals("chest") || name.equals("trapped_chest")) out.add("type");
        if (LIT_DERIVED.contains(name)) out.add("lit");
        if (name.equals("redstone_wire")) out.add("power");
        return out;
    }

    /** Verdict for one planned block; {@code actual == null} means not readable. Properties the plan leaves out are free. */
    public static Verdict compare(BlockState expected, BlockState actual) {
        if (actual == null) return Verdict.UNKNOWN;
        if (actual.isAir()) return expected.isAir() ? Verdict.OK : Verdict.MISSING;
        if (!actual.id().equals(expected.id())) return Verdict.WRONG;
        var ignored = ignoredProperties(expected.id());
        for (var e : expected.properties().entrySet())
            if (!ignored.contains(e.getKey()) && !e.getValue().equals(actual.properties().get(e.getKey()))) return Verdict.STATE;
        return Verdict.OK;
    }
}
