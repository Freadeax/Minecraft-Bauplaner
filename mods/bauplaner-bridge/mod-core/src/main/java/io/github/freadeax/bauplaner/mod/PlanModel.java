package io.github.freadeax.bauplaner.mod;

import io.github.freadeax.bauplaner.bridge.BridgeException;
import io.github.freadeax.bauplaner.bridge.Nbt;
import io.github.freadeax.bauplaner.bridge.Plan;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * A plan exported by the website with all its blocks. Air cells are "nothing to build"; the
 * hologram and the live check only look at planned blocks. Positions are project coordinates
 * (Bauplaner.ProjectMin + index), the same as in the website's editor.
 */
public final class PlanModel {
    private final Plan plan;
    private final BlockState[] palette;
    /** Per planned block: x, y, z (project coordinates) and palette index, packed as 4 ints. */
    private final int[] cells;

    private PlanModel(Plan plan, BlockState[] palette, int[] cells) {
        this.plan = plan;
        this.palette = palette;
        this.cells = cells;
    }

    public static PlanModel read(Path file) throws IOException {
        return parse(file.getFileName().toString(), Files.readAllBytes(file));
    }

    public static PlanModel parse(String fileName, byte[] bytes) {
        Plan plan = Plan.parse(fileName, bytes);
        var s = Nbt.readGzip(bytes, 64_000_000).tag().compound("Wurzel").get("Schematic").compound("Schematic");
        var blocks = s.get("Blocks");
        if (blocks == null) throw new BridgeException("Blocks fehlt.");
        var b = blocks.compound("Blocks");
        var paletteTag = b.get("Palette");
        var dataTag = b.get("Data");
        if (paletteTag == null || dataTag == null) throw new BridgeException("Blocks.Palette oder Blocks.Data fehlt.");
        var paletteMap = paletteTag.compound("Palette");
        BlockState[] palette = new BlockState[paletteMap.size()];
        paletteMap.forEach((k, v) -> {
            int i = v.asInt("Palette." + k);
            if (i < 0 || i >= palette.length || palette[i] != null) throw new BridgeException("Palette-Index " + i + " ungültig.");
            palette[i] = BlockState.parse(k);
        });
        byte[] data = dataTag.asBytes("Blocks.Data");
        int w = plan.width(), h = plan.height(), l = plan.length();
        int[] min = plan.projectMin();
        long volume = plan.volume();
        int[] out = new int[1024];
        int count = 0, pos = 0;
        for (long n = 0; n < volume; n++) {
            int value = 0, shift = 0, b8;
            do {
                if (pos >= data.length) throw new BridgeException("Blocks.Data ist zu kurz.");
                b8 = data[pos++] & 0xff;
                value |= (b8 & 0x7f) << shift;
                shift += 7;
                if (shift > 35) throw new BridgeException("Blocks.Data enthält eine zu lange Zahl.");
            } while ((b8 & 0x80) != 0);
            if (value < 0 || value >= palette.length) throw new BridgeException("Palette-Index " + value + " außerhalb der Palette.");
            if (palette[value].isAir()) continue;
            int x = (int) (n % w), z = (int) ((n / w) % l), y = (int) (n / ((long) w * l));
            if (count * 4 + 4 > out.length) out = Arrays.copyOf(out, out.length * 2);
            out[count * 4] = min[0] + x; out[count * 4 + 1] = min[1] + y; out[count * 4 + 2] = min[2] + z; out[count * 4 + 3] = value;
            count++;
        }
        if (pos != data.length) throw new BridgeException("Blocks.Data ist länger als die Planbox.");
        return new PlanModel(plan, palette, Arrays.copyOf(out, count * 4));
    }

    public Plan identity() { return plan; }
    public String name() { return plan.name(); }
    public int blockCount() { return cells.length / 4; }
    public int x(int i) { return cells[i * 4]; }
    public int y(int i) { return cells[i * 4 + 1]; }
    public int z(int i) { return cells[i * 4 + 2]; }
    public BlockState state(int i) { return palette[cells[i * 4 + 3]]; }

    /** Project box of the plan file: min corner and size. */
    public int[] min() { return plan.projectMin().clone(); }
    public int[] size() { return new int[] { plan.width(), plan.height(), plan.length() }; }

    /** Distinct planned states (without air), for material lists and render caches. */
    public List<BlockState> palette() {
        var list = new ArrayList<BlockState>();
        for (BlockState s : palette) if (!s.isAir()) list.add(s);
        return list;
    }
}
