package io.github.freadeax.bauplaner.bridge;

import java.util.HashMap;
import java.util.Map;

/**
 * Test world built from a plan file's own blocks: the plan box placed at an anchor,
 * everything else stone, optional overrides and an unloaded region (x &lt; unloadedBelowX).
 */
final class PlanWorld implements BlockSource {
    final Map<String, String> cells = new HashMap<>();
    final Map<String, String> overrides = new HashMap<>();
    Integer unloadedBelowX = null;

    PlanWorld(byte[] planFile, int[] anchor) {
        var s = Nbt.readGzip(planFile, 64_000_000).tag().compound("r").get("Schematic").compound("s");
        int w = s.get("Width").asUShort("w"), l = s.get("Length").asUShort("l");
        var b = s.get("Metadata").compound("m").get("Bauplaner").compound("b");
        int[] min = b.get("ProjectMin").asIntArray("pm");
        var blocks = s.get("Blocks").compound("b");
        String[] palette = new String[blocks.get("Palette").compound("p").size()];
        blocks.get("Palette").compound("p").forEach((k, v) -> palette[v.asInt(k)] = k);
        byte[] data = blocks.get("Data").asBytes("d");
        int pos = 0;
        for (int n = 0; pos < data.length; n++) {
            int value = 0, shift = 0, b8;
            do { b8 = data[pos++] & 0xff; value |= (b8 & 0x7f) << shift; shift += 7; } while ((b8 & 0x80) != 0);
            int x = n % w, z = (n / w) % l, y = n / (w * l);
            cells.put(key(anchor[0] + min[0] + x, anchor[1] + min[1] + y, anchor[2] + min[2] + z), palette[value]);
        }
    }

    static String key(int x, int y, int z) { return x + "," + y + "," + z; }

    @Override
    public String stateAt(int x, int y, int z) {
        if (unloadedBelowX != null && x < unloadedBelowX) return null;
        String k = key(x, y, z);
        return overrides.getOrDefault(k, cells.getOrDefault(k, "minecraft:stone"));
    }
}
