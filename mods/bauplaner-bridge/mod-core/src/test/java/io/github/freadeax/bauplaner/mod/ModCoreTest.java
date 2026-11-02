package io.github.freadeax.bauplaner.mod;

import static org.junit.jupiter.api.Assertions.*;

import io.github.freadeax.bauplaner.bridge.Nbt;
import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ModCoreTest {
    private static BlockState s(String text) { return BlockState.parse(text); }

    @Test
    void blockStatesParseSortAndPrint() {
        assertEquals("minecraft:oak_stairs[facing=east,half=bottom]", s("minecraft:oak_stairs[half=bottom,facing=east]").toString());
        assertEquals("minecraft:stone", s("minecraft:stone").toString());
        assertTrue(s("minecraft:cave_air").isAir());
        for (String bad : List.of("stone", "minecraft:Stone", "minecraft:a[x]", "minecraft:a[x=1,x=2]", "minecraft:a[x=1"))
            assertThrows(IllegalArgumentException.class, () -> s(bad), bad);
    }

    @Test
    void rulesMatchTheWebsite() {
        assertEquals(Verdict.OK, BlockRules.compare(s("minecraft:stone"), s("minecraft:stone")));
        assertEquals(Verdict.MISSING, BlockRules.compare(s("minecraft:stone"), s("minecraft:air")));
        assertEquals(Verdict.WRONG, BlockRules.compare(s("minecraft:stone"), s("minecraft:dirt")));
        assertEquals(Verdict.UNKNOWN, BlockRules.compare(s("minecraft:stone"), null));
        assertEquals(Verdict.STATE, BlockRules.compare(s("minecraft:oak_stairs[facing=east,half=bottom]"), s("minecraft:oak_stairs[facing=west,half=bottom]")));
        // Derived from neighbours or operation: no mistake.
        assertEquals(Verdict.OK, BlockRules.compare(s("minecraft:oak_stairs[facing=east,shape=straight]"), s("minecraft:oak_stairs[facing=east,shape=inner_left]")));
        assertEquals(Verdict.OK, BlockRules.compare(s("minecraft:oak_fence[north=false]"), s("minecraft:oak_fence[north=true]")));
        assertEquals(Verdict.OK, BlockRules.compare(s("minecraft:oak_door[open=false,facing=north]"), s("minecraft:oak_door[open=true,facing=north]")));
        // Mod blocks compare everything; properties the plan leaves out are free.
        assertEquals(Verdict.STATE, BlockRules.compare(s("create:shaft[open=false]"), s("create:shaft[open=true]")));
        assertEquals(Verdict.OK, BlockRules.compare(s("minecraft:oak_log"), s("minecraft:oak_log[axis=x]")));
    }

    @Test
    void positionsTurnClockwiseAndInvert() {
        var p = new Placement("minecraft:overworld", 100, 64, -50, 1, false);
        // One clockwise turn: project north (−z) becomes world east (+x).
        assertArrayEquals(new int[] { 101, 64, -50 }, p.toWorld(0, 0, -1));
        assertArrayEquals(new int[] { 100, 64, -49 }, p.toWorld(1, 0, 0));
        for (int turns = 0; turns < 4; turns++) for (boolean mirror : new boolean[] { false, true }) {
            var q = new Placement("d", 7, -3, 11, turns, mirror);
            for (int[] v : new int[][] { { 0, 0, 0 }, { 3, 2, -5 }, { -4, 9, 1 } }) {
                int[] w = q.toWorld(v[0], v[1], v[2]);
                assertArrayEquals(v, q.toProject(w[0], w[1], w[2]), turns + " " + mirror);
            }
        }
        assertArrayEquals(new int[] { 7 - 3, -3, 11 }, new Placement("d", 7, -3, 11, 0, true).toWorld(3, 0, 0), "mirror flips x");
    }

    @Test
    void statesTurnAndMirrorLikeTheGame() {
        var one = Placement.at("d", 0, 0, 0).turned(1);
        assertEquals("minecraft:oak_stairs[facing=east,half=top,shape=inner_left]", one.toWorld(s("minecraft:oak_stairs[facing=north,half=top,shape=inner_left]")).toString());
        assertEquals("minecraft:oak_log[axis=z]", one.toWorld(s("minecraft:oak_log[axis=x]")).toString());
        assertEquals("minecraft:oak_sign[rotation=6]", one.toWorld(s("minecraft:oak_sign[rotation=2]")).toString());
        assertEquals("minecraft:rail[shape=east_west]", one.toWorld(s("minecraft:rail[shape=north_south]")).toString());
        assertEquals("minecraft:rail[shape=south_east]", one.toWorld(s("minecraft:rail[shape=north_east]")).toString());
        assertEquals("minecraft:rail[shape=ascending_south]", one.toWorld(s("minecraft:rail[shape=ascending_east]")).toString());
        assertEquals("minecraft:oak_fence[east=true,north=false,south=false,west=false]", one.toWorld(s("minecraft:oak_fence[east=false,north=true,south=false,west=false]")).toString());
        var mirror = Placement.at("d", 0, 0, 0).mirrored();
        assertEquals("minecraft:oak_door[facing=west,hinge=right]", mirror.toWorld(s("minecraft:oak_door[facing=east,hinge=left]")).toString());
        assertEquals("minecraft:oak_stairs[facing=north,shape=outer_right]", mirror.toWorld(s("minecraft:oak_stairs[facing=north,shape=outer_left]")).toString());
        assertEquals("minecraft:chest[facing=north,type=left]", mirror.toWorld(s("minecraft:chest[facing=north,type=right]")).toString());
        assertEquals("minecraft:oak_sign[rotation=12]", mirror.toWorld(s("minecraft:oak_sign[rotation=4]")).toString());
        assertEquals("minecraft:rail[shape=north_west]", mirror.toWorld(s("minecraft:rail[shape=north_east]")).toString());
        // Every combination is undone by toProject.
        for (int turns = 0; turns < 4; turns++) for (boolean m : new boolean[] { false, true }) {
            var p = new Placement("d", 0, 0, 0, turns, m);
            for (String text : List.of("minecraft:oak_stairs[facing=south,half=bottom,shape=outer_left]", "minecraft:rail[shape=south_west]",
                    "minecraft:oak_door[facing=west,half=upper,hinge=left]", "minecraft:white_banner[rotation=13]", "minecraft:oak_log[axis=z]",
                    "minecraft:redstone_wire[east=side,north=up,south=none,west=none]", "minecraft:chest[facing=east,type=left]"))
                assertEquals(text, p.toProject(p.toWorld(s(text))).toString(), turns + " " + m + " " + text);
        }
    }

    @Test
    void planReadsBlocksInProjectCoordinates(@TempDir Path dir) throws Exception {
        PlanModel plan = PlanModel.parse("haus.schem", schem(2, 2, 1, new int[] { -1, 0, 4 },
                new String[] { "minecraft:air", "minecraft:stone", "minecraft:oak_stairs[facing=north]" }, new int[] { 1, 0, 2, 1 }));
        assertEquals(3, plan.blockCount());
        assertEquals("minecraft:stone", plan.state(0).toString());
        assertArrayEquals(new int[] { -1, 0, 4 }, new int[] { plan.x(0), plan.y(0), plan.z(0) });
        // Index order x → z → y: index 2 is x=0, y=1; index 3 is x=1, y=1.
        assertArrayEquals(new int[] { -1, 1, 4 }, new int[] { plan.x(1), plan.y(1), plan.z(1) });
        assertEquals("minecraft:oak_stairs[facing=north]", plan.state(1).toString());
        assertEquals(2, plan.palette().size());
        Files.write(dir.resolve("p.schem"), schem(1, 1, 1, new int[] { 0, 0, 0 }, new String[] { "minecraft:stone" }, new int[] { 0 }));
        assertEquals(1, PlanModel.read(dir.resolve("p.schem")).blockCount());
        assertThrows(RuntimeException.class, () -> PlanModel.parse("x.schem", schem(1, 1, 1, new int[] { 0, 0, 0 }, new String[] { "minecraft:stone" }, new int[] { 1 })));
    }

    @Test
    void liveCheckFollowsTheWorld() {
        PlanModel plan = PlanModel.parse("haus.schem", schem(2, 1, 1, new int[] { 0, 0, 0 },
                new String[] { "minecraft:stone", "minecraft:oak_stairs[facing=north]" }, new int[] { 0, 1 }));
        var placement = new Placement("minecraft:overworld", 10, 64, 10, 1, false);
        var check = new LiveCheck(plan, placement);
        assertEquals(2, check.count(Verdict.UNKNOWN));
        assertEquals(0, check.percent());
        Map<String, BlockState> world = new LinkedHashMap<>();
        world.put("10,64,10", s("minecraft:stone"));
        world.put("10,64,11", s("minecraft:oak_stairs[facing=north]")); // turned plan expects facing=east
        assertEquals(2, check.sweep((x, y, z) -> world.getOrDefault(x + "," + y + "," + z, BlockState.AIR), 100));
        assertEquals(1, check.count(Verdict.OK));
        assertEquals(1, check.count(Verdict.STATE));
        assertEquals(50, check.percent());
        int problem = check.nearestProblem(0, 64, 0);
        assertEquals("10 64 11", check.worldX(problem) + " " + check.worldY(problem) + " " + check.worldZ(problem));
        long before = check.revision();
        assertTrue(check.update(10, 64, 11, s("minecraft:oak_stairs[facing=east]")));
        assertFalse(check.update(50, 64, 50, s("minecraft:stone")), "outside the plan");
        assertTrue(check.revision() > before);
        assertEquals(100, check.percent());
        assertEquals(-1, check.nearestProblem(0, 64, 0));
        check.forgetChunk(0, 0);
        assertEquals(2, check.count(Verdict.UNKNOWN), "chunk 0/0 holds both blocks");
        assertArrayEquals(new int[] { 10, 64, 10, 10, 64, 11 }, check.worldBox());
        assertEquals(2, check.inChunk(0, 0).length);
    }

    @Test
    void placementsAreRememberedPerWorld(@TempDir Path dir) throws Exception {
        var store = new PlacementStore(dir.resolve("bauplaner/platzierung.properties"));
        assertTrue(store.get("server:lmnt").isEmpty());
        var e = new PlacementStore.Entry("haus.schem", new Placement("minecraft:the_nether", -5, 70, 3, 3, true), false);
        store.put("server:server.lmnt-gaming.net", e);
        store.put("welt:Neue Welt", new PlacementStore.Entry("turm.schem", Placement.at("minecraft:overworld", 1, 2, 3), true));
        assertEquals(e, store.get("server:server.lmnt-gaming.net").orElseThrow());
        assertEquals("turm.schem", store.get("welt:Neue Welt").orElseThrow().planFile());
        store.remove("welt:Neue Welt");
        assertTrue(store.get("welt:Neue Welt").isEmpty());
    }

    /** Minimal plan file in the website's export format (Sponge v3 + Metadata.Bauplaner). */
    static byte[] schem(int w, int h, int l, int[] projectMin, String[] palette, int[] data) {
        Map<String, Nbt.Tag> pal = new LinkedHashMap<>();
        for (int i = 0; i < palette.length; i++) pal.put(palette[i], Nbt.Tag.ofInt(i));
        var bytes = new ByteArrayOutputStream();
        for (int v : data) { while ((v & ~0x7f) != 0) { bytes.write((v & 0x7f) | 0x80); v >>>= 7; } bytes.write(v); }
        Map<String, Nbt.Tag> bauplaner = new LinkedHashMap<>();
        bauplaner.put("ProjectId", Nbt.Tag.ofString("p1"));
        bauplaner.put("RevisionId", Nbt.Tag.ofString("r1"));
        bauplaner.put("RevisionNumber", Nbt.Tag.ofInt(1));
        bauplaner.put("ProjectMin", Nbt.Tag.ofIntArray(projectMin));
        Map<String, Nbt.Tag> meta = new LinkedHashMap<>();
        meta.put("Name", Nbt.Tag.ofString("Testhaus"));
        meta.put("Bauplaner", Nbt.Tag.ofCompound(bauplaner));
        Map<String, Nbt.Tag> blocks = new LinkedHashMap<>();
        blocks.put("Palette", Nbt.Tag.ofCompound(pal));
        blocks.put("Data", Nbt.Tag.ofBytes(bytes.toByteArray()));
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
}
