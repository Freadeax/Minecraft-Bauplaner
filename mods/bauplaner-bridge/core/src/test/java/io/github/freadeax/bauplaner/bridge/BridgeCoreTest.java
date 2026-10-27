package io.github.freadeax.bauplaner.bridge;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class BridgeCoreTest {
    /** Hand-written plan: W×2×2 box (W = cells/4) at project min (−2, 64, 5), cells given in Sponge order. */
    static byte[] plan(String[] cells, Map<String, Nbt.Tag> extra, int version) {
        Map<String, Nbt.Tag> pal = new LinkedHashMap<>();
        byte[] data = new byte[cells.length];
        for (int i = 0; i < cells.length; i++) {
            pal.putIfAbsent(cells[i], Nbt.Tag.ofInt(pal.size()));
            data[i] = (byte) (int) (Integer) pal.get(cells[i]).value();
        }
        Map<String, Nbt.Tag> b = new LinkedHashMap<>();
        b.put("ProjectId", Nbt.Tag.ofString("prj_test"));
        b.put("RevisionId", Nbt.Tag.ofString("rev_test"));
        b.put("RevisionNumber", Nbt.Tag.ofInt(2));
        b.put("Profile", Nbt.Tag.ofString("java:registry-unverified"));
        b.put("ProjectMin", Nbt.Tag.ofIntArray(-2, 64, 5));
        b.putAll(extra);
        b.values().removeIf(t -> t == null);
        Map<String, Nbt.Tag> meta = new LinkedHashMap<>(Map.of("Name", Nbt.Tag.ofString("Burg · Revision 2"), "Bauplaner", Nbt.Tag.ofCompound(b)));
        Map<String, Nbt.Tag> blocks = new LinkedHashMap<>(Map.of("Palette", Nbt.Tag.ofCompound(pal), "Data", Nbt.Tag.ofBytes(data)));
        Map<String, Nbt.Tag> s = new LinkedHashMap<>();
        s.put("Version", Nbt.Tag.ofInt(version));
        s.put("DataVersion", Nbt.Tag.ofInt(4189));
        s.put("Width", Nbt.Tag.ofShort(cells.length / 4));
        s.put("Height", Nbt.Tag.ofShort(2));
        s.put("Length", Nbt.Tag.ofShort(2));
        s.put("Offset", Nbt.Tag.ofIntArray(-2, 64, 5));
        s.put("Metadata", Nbt.Tag.ofCompound(meta));
        s.put("Blocks", Nbt.Tag.ofCompound(blocks));
        return Nbt.writeGzip(new Nbt.Root("", Nbt.Tag.ofCompound(Map.of("Schematic", Nbt.Tag.ofCompound(s)))));
    }

    static final String[] CELLS = {
        "minecraft:stone", "minecraft:stone", "minecraft:oak_planks",
        "minecraft:stone", "minecraft:air", "minecraft:stone",
        "minecraft:oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]", "minecraft:air", "minecraft:air",
        "minecraft:air", "minecraft:air", "minecraft:torch",
    };

    @Test
    void readsPlanIdentityAndBox() {
        byte[] file = plan(CELLS, Map.of(), 3);
        Plan p = Plan.parse("burg-rev2.schem", file);
        assertEquals("prj_test", p.projectId());
        assertEquals("rev_test", p.revisionId());
        assertEquals(2, p.revisionNumber());
        assertEquals(4189, p.dataVersion());
        assertArrayEquals(new int[] { -2, 64, 5 }, p.projectMin());
        assertEquals(12, p.volume());
        assertEquals(Plan.sha256(file), p.sha256());
        assertEquals(64, p.sha256().length());
    }

    @Test
    void refusesRecordingsOldPlansAndOtherVersions() {
        var e1 = assertThrows(BridgeException.class, () -> Plan.parse("a.schem", plan(CELLS, Map.of("Kind", Nbt.Tag.ofString("scan")), 3)));
        assertTrue(e1.getMessage().contains("Spielaufnahme"));
        Map<String, Nbt.Tag> noMin = new LinkedHashMap<>();
        noMin.put("ProjectMin", null);
        var e2 = assertThrows(BridgeException.class, () -> Plan.parse("b.schem", plan(CELLS, noMin, 3)));
        assertTrue(e2.getMessage().contains("ProjectMin"));
        assertThrows(BridgeException.class, () -> Plan.parse("c.schem", plan(CELLS, Map.of(), 2)));
        assertThrows(BridgeException.class, () -> Plan.parse("d.schem", new byte[] { 1, 2, 3 }));
    }

    /** Hand-derived expectation: anchor (100, 0, -50) ⇒ world min (98, 64, -45); order x, z, y. */
    @Test
    void recordsInSpongeOrderWithUnloadedCellsAndMetadata() {
        Plan p = Plan.parse("burg.schem", plan(CELLS, Map.of(), 3));
        List<String> visited = new java.util.ArrayList<>();
        BlockSource world = (x, y, z) -> {
            visited.add(x + "," + y + "," + z);
            if (x == 98 && y == 65 && z == -44) return null; // not loaded
            return (x == 99 && y == 64) ? "minecraft:dirt" : "minecraft:stone";
        };
        var job = new ScanJob(p, new int[] { 100, 0, -50 }, world, 4300, new ScanJob.Info("26.3", "0.1.0", "fabric", "minecraft:overworld", "client"));
        assertArrayEquals(new int[] { 98, 64, -45 }, job.worldMin());
        assertFalse(job.step(5));
        assertEquals(5, job.done());
        assertTrue(job.step(100));
        assertEquals(List.of("98,64,-45", "99,64,-45", "100,64,-45", "98,64,-44", "99,64,-44", "100,64,-44",
                "98,65,-45", "99,65,-45", "100,65,-45", "98,65,-44", "99,65,-44", "100,65,-44"), visited);
        assertEquals(1, job.unloaded());
        var s = Nbt.readGzip(job.toFile(Instant.parse("2026-10-27T12:00:00Z")), 1_000_000).tag().compound("r").get("Schematic").compound("s");
        var blocks = s.get("Blocks").compound("b");
        assertEquals(Map.of("minecraft:stone", 0, "minecraft:dirt", 1, ScanJob.UNLOADED, 2),
                Map.of("minecraft:stone", blocks.get("Palette").compound("p").get("minecraft:stone").asInt("x"),
                        "minecraft:dirt", blocks.get("Palette").compound("p").get("minecraft:dirt").asInt("x"),
                        ScanJob.UNLOADED, blocks.get("Palette").compound("p").get(ScanJob.UNLOADED).asInt("x")));
        assertArrayEquals(new byte[] { 0, 1, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0 }, blocks.get("Data").asBytes("d"));
        assertEquals(4300, s.get("DataVersion").asInt("dv"));
        assertArrayEquals(new int[] { 98, 64, -45 }, s.get("Offset").asIntArray("o"));
        var b = s.get("Metadata").compound("m").get("Bauplaner").compound("b");
        assertEquals("scan", b.get("Kind").asString("k"));
        assertEquals(1, b.get("ScanVersion").asInt("v"));
        assertEquals("rev_test", b.get("RevisionId").asString("r"));
        assertArrayEquals(new int[] { -2, 64, 5 }, b.get("ProjectMin").asIntArray("pm"));
        assertArrayEquals(new int[] { 100, 0, -50 }, b.get("WorldAnchor").asIntArray("wa"));
        assertEquals(1, b.get("Unloaded").asInt("u"));
        assertEquals("2026-10-27T12:00:00Z", b.get("ScannedAt").asString("t"));
        assertEquals(p.sha256(), b.get("PlanSha256").asString("h"));
    }

    @Test
    void multiByteVarIntsAndStateValidation() {
        Plan p = Plan.parse("burg.schem", plan(CELLS, Map.of(), 3));
        int[] i = { 0 };
        var job = new ScanJob(p, new int[] { 0, 0, 0 }, (x, y, z) -> "test:b" + (i[0]++ * 100), 1, new ScanJob.Info("x", "x", "x", "x", "server"));
        job.step(100);
        byte[] data = Nbt.readGzip(job.toFile(Instant.EPOCH), 1_000_000).tag().compound("r").get("Schematic").compound("s")
                .get("Blocks").compound("b").get("Data").asBytes("d");
        assertEquals(12, data.length, "palette ids 0..11 fit one byte");
        var big = new ScanJob(Plan.parse("big.schem", plan(CELLS, Map.of(), 3)), new int[] { 0, 0, 0 }, (x, y, z) -> "minecraft:oak_stairs[facing=EAST]", 1, new ScanJob.Info("x", "x", "x", "x", "client"));
        assertThrows(BridgeException.class, () -> big.step(1), "upper-case property values are not in the format");
        assertThrows(IllegalStateException.class, () -> new ScanJob(p, new int[] { 0, 0, 0 }, (x, y, z) -> "minecraft:air", 1, null).toFile(Instant.EPOCH));
    }

    /** 200 distinct states: ids 0..127 take one VarInt byte, 128..199 two bytes (128 = 0x80 0x01). */
    @Test
    void varIntAbove127UsesTwoBytes() {
        String[] cells = new String[200];
        java.util.Arrays.fill(cells, "minecraft:stone");
        Plan p = Plan.parse("p.schem", plan(cells, Map.of(), 3));
        int[] n = { 0 };
        var job = new ScanJob(p, new int[] { 0, 0, 0 }, (x, y, z) -> "test:s" + n[0]++, 1, new ScanJob.Info("x", "x", "x", "x", "client"));
        assertTrue(job.step(1000));
        var blocks = Nbt.readGzip(job.toFile(Instant.EPOCH), 1_000_000).tag().compound("r").get("Schematic").compound("s").get("Blocks").compound("b");
        byte[] data = blocks.get("Data").asBytes("d");
        assertEquals(128 + 72 * 2, data.length);
        assertEquals((byte) 127, data[127]);
        assertEquals((byte) 0x80, data[128]);
        assertEquals((byte) 0x01, data[129]);
        assertEquals(128, blocks.get("Palette").compound("p").get("test:s128").asInt("x"));
    }

    @Test
    void anchorStoreRoundtripAndFileName(@TempDir Path dir) throws Exception {
        Path f = dir.resolve("bauplaner/state.properties");
        var store = new AnchorStore(f);
        assertTrue(store.get("server.lmnt-gaming.net").isEmpty());
        store.put("server.lmnt-gaming.net", new AnchorStore.Entry("burg-rev2.schem", "minecraft:overworld", new int[] { -120, 63, 4500 }));
        var again = new AnchorStore(f).get("server.lmnt-gaming.net").orElseThrow();
        assertEquals("burg-rev2.schem", again.planFile());
        assertArrayEquals(new int[] { -120, 63, 4500 }, again.anchor());
        assertTrue(Files.readString(f).contains("server.lmnt-gaming.net.anchor"));
        Plan p = Plan.parse("x.schem", plan(CELLS, Map.of(), 3));
        assertEquals("burg_r2_20261027-120000.schem", ScanJob.fileName(p, Instant.parse("2026-10-27T12:00:00Z")));
    }
}
