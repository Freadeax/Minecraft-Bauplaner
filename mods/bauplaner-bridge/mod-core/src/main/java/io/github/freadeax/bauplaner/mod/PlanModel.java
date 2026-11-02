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
    /** Build section names from the website, in build order (empty when the plan has none). */
    private final List<String> sectionNames;
    /** Per planned block: 1-based section number, 0 = in no section. */
    private final byte[] sections;

    private PlanModel(Plan plan, BlockState[] palette, int[] cells, List<String> sectionNames, byte[] sections) {
        this.plan = plan;
        this.palette = palette;
        this.cells = cells;
        this.sectionNames = sectionNames;
        this.sections = sections;
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
        // Optional build sections (website 0.7.0+): names and one byte per cell of the box.
        List<String> names = List.of();
        byte[] sectionOf = null;
        var meta = s.get("Metadata");
        var bp = meta == null ? null : meta.compound("Metadata").get("Bauplaner");
        if (bp != null && bp.compound("Bauplaner").containsKey("SectionNames") && bp.compound("Bauplaner").containsKey("SectionCells")) {
            var b2 = bp.compound("Bauplaner");
            var list = b2.get("SectionNames");
            if (list.type() != Nbt.LIST) throw new BridgeException("Bauplaner.SectionNames ist keine Liste.");
            var tags = ((Nbt.NbtList) list.value()).values();
            List<String> n = new ArrayList<>();
            for (var t : tags) n.add(t.asString("Bauplaner.SectionNames"));
            sectionOf = b2.get("SectionCells").asBytes("Bauplaner.SectionCells");
            if (sectionOf.length != plan.volume()) throw new BridgeException("Bauplaner.SectionCells passt nicht zur Planbox.");
            for (byte v : sectionOf) if ((v & 0xff) > n.size()) throw new BridgeException("Bauplaner.SectionCells nennt einen unbekannten Abschnitt.");
            names = List.copyOf(n);
        }
        int w = plan.width(), h = plan.height(), l = plan.length();
        int[] min = plan.projectMin();
        long volume = plan.volume();
        int[] out = new int[1024];
        byte[] sec = new byte[256];
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
            if (count >= sec.length) sec = Arrays.copyOf(sec, sec.length * 2);
            if (sectionOf != null) sec[count] = sectionOf[(int) n];
            out[count * 4] = min[0] + x; out[count * 4 + 1] = min[1] + y; out[count * 4 + 2] = min[2] + z; out[count * 4 + 3] = value;
            count++;
        }
        if (pos != data.length) throw new BridgeException("Blocks.Data ist länger als die Planbox.");
        return new PlanModel(plan, palette, Arrays.copyOf(out, count * 4), names, Arrays.copyOf(sec, count));
    }

    public Plan identity() { return plan; }
    public String name() { return plan.name(); }
    public int blockCount() { return cells.length / 4; }
    public int x(int i) { return cells[i * 4]; }
    public int y(int i) { return cells[i * 4 + 1]; }
    public int z(int i) { return cells[i * 4 + 2]; }
    public BlockState state(int i) { return palette[cells[i * 4 + 3]]; }

    /** Build sections of the plan in build order (from the website's Baustelle tab); empty when none. */
    public List<String> sectionNames() { return sectionNames; }
    /** 1-based build section of a planned block, 0 when it is in none. */
    public int section(int i) { return sections[i] & 0xff; }

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
