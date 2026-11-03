package io.github.freadeax.bauplaner.mod;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.freadeax.bauplaner.bridge.BridgeException;
import io.github.freadeax.bauplaner.bridge.Nbt;
import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import java.io.ByteArrayOutputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** SIZE-01 (mod 0.9.0): big plans – millions of blocks, boxes beyond 4 million cells, sections as runs. */
class BigPlanTest {
    /** A plan box with a hollow-ish "town": every cell in a checkerboard of 2×2 columns holds a block. */
    private static byte[] town(int w, int h, int l, boolean runs) {
        var data = new ByteArrayOutputStream(w * h * l);
        byte[] sections = new byte[w * h * l];
        for (int y = 0; y < h; y++) for (int z = 0; z < l; z++) for (int x = 0; x < w; x++) {
            boolean solid = ((x >> 1) + (z >> 1)) % 2 == 0;
            data.write(solid ? 1 + (y % 3) : 0);
            sections[x + z * w + y * w * l] = (byte) (x < w / 2 ? 1 : 2);
        }
        Map<String, Nbt.Tag> extra = new LinkedHashMap<>();
        extra.put("SectionNames", new Nbt.Tag(Nbt.LIST, new Nbt.NbtList(Nbt.STRING, List.of(Nbt.Tag.ofString("West"), Nbt.Tag.ofString("Ost")))));
        if (runs) extra.put("SectionRuns", Nbt.Tag.ofIntArray(runsOf(sections)));
        else extra.put("SectionCells", Nbt.Tag.ofBytes(sections));
        return schem(w, h, l, new String[] { "minecraft:air", "minecraft:stone", "minecraft:oak_planks", "minecraft:oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]" }, data.toByteArray(), extra);
    }

    static int[] runsOf(byte[] cells) {
        var out = new java.util.ArrayList<Integer>();
        for (int i = 0; i < cells.length;) {
            int j = i + 1;
            while (j < cells.length && cells[j] == cells[i]) j++;
            out.add(j - i); out.add(cells[i] & 0xff);
            i = j;
        }
        return out.stream().mapToInt(Integer::intValue).toArray();
    }

    static byte[] schem(int w, int h, int l, String[] palette, byte[] data, Map<String, Nbt.Tag> extra) {
        Map<String, Nbt.Tag> pal = new LinkedHashMap<>();
        for (int i = 0; i < palette.length; i++) pal.put(palette[i], Nbt.Tag.ofInt(i));
        Map<String, Nbt.Tag> bauplaner = new LinkedHashMap<>();
        bauplaner.put("ProjectId", Nbt.Tag.ofString("p1"));
        bauplaner.put("RevisionId", Nbt.Tag.ofString("r1"));
        bauplaner.put("RevisionNumber", Nbt.Tag.ofInt(1));
        bauplaner.put("ProjectMin", Nbt.Tag.ofIntArray(new int[] { -20, 0, 7 }));
        bauplaner.putAll(extra);
        Map<String, Nbt.Tag> meta = new LinkedHashMap<>();
        meta.put("Name", Nbt.Tag.ofString("Großstadt"));
        meta.put("Bauplaner", Nbt.Tag.ofCompound(bauplaner));
        Map<String, Nbt.Tag> blocks = new LinkedHashMap<>();
        blocks.put("Palette", Nbt.Tag.ofCompound(pal));
        blocks.put("Data", Nbt.Tag.ofBytes(data));
        Map<String, Nbt.Tag> s = new LinkedHashMap<>();
        s.put("Version", Nbt.Tag.ofInt(3));
        s.put("DataVersion", Nbt.Tag.ofInt(5023));
        s.put("Width", Nbt.Tag.ofShort(w));
        s.put("Height", Nbt.Tag.ofShort(h));
        s.put("Length", Nbt.Tag.ofShort(l));
        s.put("Metadata", Nbt.Tag.ofCompound(meta));
        s.put("Blocks", Nbt.Tag.ofCompound(blocks));
        return Nbt.writeGzip(new Nbt.Root("", Nbt.Tag.ofCompound(Map.of("Schematic", Nbt.Tag.ofCompound(s)))));
    }

    @Test
    void bigPlanBeyondTheOldBoxLimitLoadsQuickly() {
        // 512 × 48 × 256 = 6.3 million cells box (old limit: 4 million), 3.1 million planned blocks.
        byte[] file = town(512, 48, 256, true);
        long t0 = System.nanoTime();
        PlanModel plan = PlanModel.parse("stadt.schem", file);
        long t1 = System.nanoTime();
        assertEquals(512 * 48 * 256 / 2, plan.blockCount());
        LiveCheck check = new LiveCheck(plan, new Placement("minecraft:overworld", 1000, 70, -500, 1, true));
        long t2 = System.nanoTime();
        // Moving the hologram builds the check again (now warm, as in a running game).
        new LiveCheck(plan, new Placement("minecraft:overworld", 1001, 70, -500, 1, true));
        long t3 = System.nanoTime();
        System.out.printf("SIZE-01: %d Blöcke, Datei %d KB, lesen %d ms, Abgleich aufbauen %d ms, nach Verschieben %d ms%n",
                plan.blockCount(), file.length / 1024, (t1 - t0) / 1_000_000, (t2 - t1) / 1_000_000, (t3 - t2) / 1_000_000);
        // Generous bounds for slow CI machines; the point is "seconds, not minutes".
        assertTrue((t1 - t0) / 1_000_000 < 15_000, "lesen");
        assertTrue((t2 - t1) / 1_000_000 < 15_000, "Abgleich");
        // Every block is found again at its world position, and nothing else is.
        for (int i = 0; i < plan.blockCount(); i += 9973) {
            assertEquals(i, check.indexAt(check.worldX(i), check.worldY(i), check.worldZ(i)));
        }
        assertEquals(-1, check.indexAt(check.worldX(0), check.worldY(0) + 1000, check.worldZ(0)));
        // Sections from runs: west half 1, east half 2.
        int west = 0;
        for (int i = 0; i < plan.blockCount(); i++) if (plan.section(i) == 1) west++;
        assertEquals(plan.blockCount() / 2, west);
        // Kept totals per section equal a full count, also after verdicts moved.
        for (int i = 0; i < plan.blockCount(); i += 7) check.update(check.worldX(i), check.worldY(i), check.worldZ(i), i % 2 == 0 ? check.expected(i) : BlockState.AIR);
        for (int k = 1; k <= 2; k++) {
            int[] kept = check.count(new Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, k));
            int[] full = new int[Verdict.values().length];
            for (int i = 0; i < plan.blockCount(); i++) if (plan.section(i) == k) full[check.verdict(i).ordinal()]++;
            assertArrayEquals(full, kept, "Abschnitt " + k);
        }
        assertEquals(check.count(Verdict.OK) + check.count(Verdict.MISSING) + check.count(Verdict.UNKNOWN), plan.blockCount());
    }

    @Test
    void sectionRunsAndSectionCellsGiveTheSameSections() {
        PlanModel a = PlanModel.parse("a.schem", town(40, 6, 30, true)), b = PlanModel.parse("b.schem", town(40, 6, 30, false));
        assertEquals(a.blockCount(), b.blockCount());
        for (int i = 0; i < a.blockCount(); i++) {
            assertEquals(b.section(i), a.section(i));
            assertEquals(b.x(i), a.x(i)); assertEquals(b.y(i), a.y(i)); assertEquals(b.z(i), a.z(i));
            assertEquals(b.state(i), a.state(i));
        }
        assertEquals(List.of("West", "Ost"), a.sectionNames());
    }

    @Test
    void brokenRunsAndOversizedPlansAreRefusedWithAReason() {
        byte[] data = new byte[8];
        var bad = schem(2, 2, 2, new String[] { "minecraft:stone" }, data, Map.of(
                "SectionNames", new Nbt.Tag(Nbt.LIST, new Nbt.NbtList(Nbt.STRING, List.of(Nbt.Tag.ofString("A")))),
                "SectionRuns", Nbt.Tag.ofIntArray(new int[] { 5, 1 })));
        var e = assertThrows(BridgeException.class, () -> PlanModel.parse("x.schem", bad));
        assertTrue(e.getMessage().contains("SectionRuns"), e.getMessage());
        // Box over 16.7 million cells: refused before any block is read.
        var huge = schem(300, 200, 300, new String[] { "minecraft:air" }, new byte[0], Map.of());
        var e2 = assertThrows(BridgeException.class, () -> PlanModel.parse("riesig.schem", huge));
        assertTrue(e2.getMessage().contains("Teilprojekte"), e2.getMessage());
        // More planned blocks than the model limit.
        byte[] solid = new byte[256 * 64 * 256];
        java.util.Arrays.fill(solid, (byte) 1);
        var full = schem(256, 64, 256, new String[] { "minecraft:air", "minecraft:stone" }, solid, Map.of());
        var e3 = assertThrows(BridgeException.class, () -> PlanModel.parse("voll.schem", full));
        assertTrue(e3.getMessage().contains("4000000"), e3.getMessage());
    }
}
