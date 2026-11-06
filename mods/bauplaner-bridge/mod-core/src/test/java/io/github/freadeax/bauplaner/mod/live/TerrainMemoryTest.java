package io.github.freadeax.bauplaner.mod.live;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class TerrainMemoryTest {
    /** Chunk with grass at y 64 over stone, oak leaves on column 0, water on column 1, all plains but column 2 (river). */
    static TerrainMemory.Columns chunk(int lift) {
        List<List<SurfaceRuns.Run>> runs = new ArrayList<>();
        String[] biomes = new String[256];
        for (int c = 0; c < 256; c++) {
            if (c == 0) runs.add(List.of(new SurfaceRuns.Run(70 + lift, "minecraft:oak_leaves"), new SurfaceRuns.Run(64 + lift, "minecraft:grass_block"), new SurfaceRuns.Run(63 + lift, "minecraft:dirt")));
            else if (c == 1) runs.add(List.of(new SurfaceRuns.Run(62, "minecraft:water"), new SurfaceRuns.Run(58, "minecraft:sand"), new SurfaceRuns.Run(55, "minecraft:stone")));
            else runs.add(List.of(new SurfaceRuns.Run(64 + lift, "minecraft:grass_block"), new SurfaceRuns.Run(63 + lift, "minecraft:dirt")));
            biomes[c] = c == 2 ? "minecraft:river" : "minecraft:plains";
        }
        return new TerrainMemory.Columns(runs, biomes);
    }

    @Test
    void answersLiveChunksAndRemembersThemForLater() {
        TerrainMemory m = new TerrainMemory();
        String first = m.answer("minecraft:overworld", new int[][] { { 0, 0 }, { 1, 0 } }, 1000, (x, z) -> x == 0 ? chunk(0) : null);
        Map<String, Object> a = Json.obj(Json.parse(first), "a");
        List<Object> chunks = Json.arr(a.get("chunks"), "c");
        assertEquals(1, chunks.size());
        Map<String, Object> c = Json.obj(chunks.get(0), "c");
        assertEquals(true, c.get("live"));
        assertEquals(1000.0, c.get("at"));
        assertEquals(256, Json.arr(c.get("columns"), "cols").size());
        List<Object> ids = Json.arr(a.get("ids"), "ids");
        List<Object> col0 = Json.arr(Json.arr(c.get("columns"), "cols").get(0), "col");
        assertEquals(List.of(70.0, 0.0, 64.0, 1.0, 63.0, 2.0), col0);
        assertEquals("minecraft:oak_leaves", ids.get(0));
        List<Object> bio = Json.arr(c.get("biome"), "b");
        assertEquals("minecraft:river", Json.arr(a.get("biomes"), "bs").get(((Double) bio.get(2)).intValue()));
        assertEquals(List.of(List.of(1.0, 0.0)), a.get("missing"));

        // Later the player is elsewhere: the chunk comes from memory, not live.
        String later = m.answer("minecraft:overworld", new int[][] { { 0, 0 } }, 5000, (x, z) -> null);
        Map<String, Object> c2 = Json.obj(Json.arr(Json.obj(Json.parse(later), "a").get("chunks"), "c").get(0), "c");
        assertEquals(false, c2.get("live"));
        assertEquals(1000.0, c2.get("at"));
        // Other dimension knows nothing.
        assertTrue(m.answer("minecraft:the_nether", new int[][] { { 0, 0 } }, 5000, null).contains("\"missing\":[[0,0]]"));
    }

    @Test
    void knownListsRememberedChunksInARectangle() {
        TerrainMemory m = new TerrainMemory();
        m.put("minecraft:overworld", 2, 3, 77, chunk(0));
        m.put("minecraft:overworld", 9, 9, 78, chunk(0));
        Map<String, Object> k = Json.obj(Json.parse(m.knownJson("minecraft:overworld", 0, 0, 4, 4)), "k");
        assertEquals(List.of(List.of(2.0, 3.0, 77.0)), k.get("chunks"));
        assertEquals(2.0, k.get("total"));
        assertThrows(LiveLinkServer.HttpError.class, () -> m.knownJson("minecraft:overworld", 0, 0, 100, 100));
        assertArrayEquals(new int[] { -3, 4, 5, 6 }, TerrainMemory.area("-3,4,5,6"));
        assertThrows(LiveLinkServer.HttpError.class, () -> TerrainMemory.area("1,2,3"));
    }

    @Test
    void savesAndLoadsAndForgetsTheOldestBeyondTheLimit(@TempDir Path dir) throws Exception {
        TerrainMemory m = new TerrainMemory();
        m.put("minecraft:overworld", 0, 0, 10, chunk(0));
        m.put("minecraft:overworld", 0, 0, 20, chunk(5)); // newer reading replaces
        m.put("minecraft:the_nether", -4, 7, 30, chunk(1));
        Path f = dir.resolve("gelaende").resolve(TerrainMemory.fileName("server:mc.example.net:25565"));
        m.save(f);
        assertFalse(m.dirty());
        assertEquals("server_mc.example.net_25565.bpgd", f.getFileName().toString());
        TerrainMemory back = TerrainMemory.load(f);
        assertEquals(1, back.size("minecraft:overworld"));
        assertEquals(20, back.seenAt("minecraft:overworld", 0, 0));
        assertEquals(back.answer("minecraft:overworld", new int[][] { { 0, 0 } }, 99, null), m.answer("minecraft:overworld", new int[][] { { 0, 0 } }, 99, null));
        assertEquals(30, back.seenAt("minecraft:the_nether", -4, 7));
        // Damaged file → empty memory, never an exception.
        Files.write(f, new byte[] { 1, 2, 3 });
        assertEquals(0, TerrainMemory.load(f).total());
        assertEquals(0, TerrainMemory.load(dir.resolve("fehlt.bpgd")).total());

        TerrainMemory big = new TerrainMemory();
        for (int i = 0; i <= TerrainMemory.MAX_CHUNKS; i++) big.put("d:x", i, 0, i, chunk(0));
        assertEquals(TerrainMemory.MAX_CHUNKS, big.size("d:x"));
        assertEquals(-1, big.seenAt("d:x", 0, 0));
        assertEquals(1, big.seenAt("d:x", 1, 0));
    }

    @Test
    void boxReadsEveryCellInSchemOrderAndMarksUnloaded() {
        int[] b = BoxRead.parse("10,60,20,12,62,23");
        BoxRead r = new BoxRead("minecraft:overworld", b, (x, y, z) -> z == 22 ? null : y == 60 ? "minecraft:stone" : "minecraft:air");
        assertFalse(r.step(5));
        assertTrue(r.step(100));
        Map<String, Object> j = Json.obj(Json.parse(r.json()), "j");
        assertEquals(List.of("minecraft:stone", "bauplaner:unloaded", "minecraft:air"), j.get("palette"));
        byte[] data = Base64.getDecoder().decode((String) j.get("data"));
        assertEquals(2 * 2 * 3 * 2, data.length);
        // index = x + z·W + y·W·L; (x 0, z 2, y 0) is unloaded, (x 1, z 0, y 1) is air.
        assertEquals(1, data[2 * (0 + 2 * 2)]);
        assertEquals(2, data[2 * (1 + 0 + 1 * 2 * 3)]);
        assertEquals(4.0, j.get("unloaded"));
        assertThrows(LiveLinkServer.HttpError.class, () -> BoxRead.parse("0,0,0,0,1,1"));
        assertThrows(LiveLinkServer.HttpError.class, () -> BoxRead.parse("0,0,0,2000,100,2000"));
    }

    @Test
    void serverRoutesTerrainAndBox() {
        List<String> calls = new ArrayList<>();
        LiveLinkServer.Handler h = new LiveLinkServer.Handler() {
            public String status() { return "{}"; }
            public String chunks(int[][] c) { return "{}"; }
            public String plan(Map<String, String> q, byte[] b) { return "{}"; }
            public String placement(Map<String, Object> b) { return "{}"; }
            public String marks(Map<String, Object> b) { return "{}"; }
            public String terrain(int[][] c) { calls.add("terrain " + c.length); return "{}"; }
            public String terrainKnown(int[] a) { calls.add("known " + a[2]); return "{}"; }
            public String box(int[] b) { calls.add("box " + b[3]); return "{}"; }
        };
        var s = new LiveLinkServer(new LiveLinkServer.Info("0.20.0", "fabric", "26.3"), h, List.of("t".repeat(43)), t -> { }, () -> 1L);
        String tok = "t".repeat(43);
        assertEquals(200, s.handle(LiveLinkTest.req("GET", "/v1/terrain?c=0,0;1,0", LiveLinkTest.SITE, tok, null)).status());
        assertEquals(200, s.handle(LiveLinkTest.req("GET", "/v1/terrain/known?a=0,0,3,3", LiveLinkTest.SITE, tok, null)).status());
        assertEquals(200, s.handle(LiveLinkTest.req("GET", "/v1/box?b=0,0,0,4,4,4", LiveLinkTest.SITE, tok, null)).status());
        assertEquals(List.of("terrain 2", "known 3", "box 4"), calls);
        assertEquals(401, s.handle(LiveLinkTest.req("GET", "/v1/terrain?c=0,0", LiveLinkTest.SITE, null, null)).status());
        assertEquals(400, s.handle(LiveLinkTest.req("GET", "/v1/box?b=1,2", LiveLinkTest.SITE, tok, null)).status());
        assertTrue(s.handle(LiveLinkTest.req("GET", "/v1/hello", LiveLinkTest.SITE, null, null)).text().contains("\"terrain\",\"box\""));
    }
}
