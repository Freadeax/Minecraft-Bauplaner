package io.github.freadeax.bauplaner.bridge;

import static org.junit.jupiter.api.Assertions.*;

import io.github.freadeax.bauplaner.bridge.session.BridgeHost;
import io.github.freadeax.bauplaner.bridge.session.BridgeSession;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** The shared command logic of all loaders, driven like a player would, against a fake game. */
class BridgeSessionTest {
    static final class FakeHost implements BridgeHost {
        final List<String> lines = new ArrayList<>();
        String dimension = "minecraft:overworld";
        String source = "client";
        boolean inWorld = true;
        int[] target = { 100, 0, -50 };
        int prepareCalls = 0, prepareUntil = 0, ended = 0;
        @Override public void say(String text) { lines.add(text); }
        @Override public void error(String text) { lines.add("FEHLER " + text); }
        @Override public boolean inWorld() { return inWorld; }
        @Override public String worldKey() { return "server:example.net"; }
        @Override public String dimension() { return dimension; }
        @Override public int[] targetBlock() { return target; }
        @Override public BlockSource blocks(String dim) { return (x, y, z) -> "minecraft:stone"; }
        @Override public boolean prepareScan(String dim, int[] min, int[] size) { return ++prepareCalls > prepareUntil; }
        @Override public void scanEnded() { ended++; }
        @Override public int dataVersion() { return 4189; }
        @Override public String gameVersion() { return "26.3"; }
        @Override public String modVersion() { return "0.2.0"; }
        @Override public String loader() { return "neoforge"; }
        @Override public String source() { return source; }
        String last() { return lines.get(lines.size() - 1); }
    }

    static Path withPlan(Path dir) throws Exception {
        Path root = dir.resolve("bauplaner");
        Files.createDirectories(root.resolve("plans"));
        Files.write(root.resolve("plans/burg.schem"), BridgeCoreTest.plan(BridgeCoreTest.CELLS, Map.of(), 3));
        return root;
    }

    @Test
    void fullRoundTripWritesRecordingAndRemembersAnchor(@TempDir Path dir) throws Exception {
        Path root = withPlan(dir);
        var host = new FakeHost();
        var s = new BridgeSession(root, host);
        assertEquals(0, s.startScan());
        assertTrue(host.last().contains("Zuerst /bauplaner plan"));
        assertEquals(List.of("burg.schem"), s.planNames());
        assertEquals(0, s.loadPlan("../x.schem"));
        assertEquals(1, s.loadPlan("burg.schem"));
        assertEquals(0, s.startScan());
        assertTrue(host.last().contains("anker"));
        assertEquals(1, s.setAnchorHere());
        assertTrue(host.last().contains("Planbox von 98 64 -45 bis 100 65 -44"), host.last());
        host.prepareUntil = 2;
        assertEquals(1, s.startScan());
        assertEquals(0, s.startScan(), "only one scan at a time");
        assertNull(s.tick(5));
        assertNull(s.tick(5));
        assertNull(s.tick(5), "first cells only after preparation");
        Path out = s.tick(100);
        assertNotNull(out);
        assertEquals(1, host.ended);
        assertFalse(s.scanning());
        var b = Nbt.readGzip(Files.readAllBytes(out), 1_000_000).tag().compound("r").get("Schematic").compound("s")
                .get("Metadata").compound("m").get("Bauplaner").compound("b");
        assertEquals("neoforge", b.get("Loader").asString("l"));
        assertEquals("client", b.get("Source").asString("s"));
        assertArrayEquals(new int[] { 100, 0, -50 }, b.get("WorldAnchor").asIntArray("a"));
        assertTrue(host.last().contains("Aufnahme gespeichert"));

        // New session (game restarted): the stored anchor comes back with the plan.
        var host2 = new FakeHost();
        var again = new BridgeSession(root, host2);
        again.loadPlan("burg.schem");
        assertArrayEquals(new int[] { 100, 0, -50 }, again.anchor());
        assertTrue(host2.last().contains("Gespeicherter Anker"));
    }

    @Test
    void clientScanStopsOnDimensionChangeAndCancel(@TempDir Path dir) throws Exception {
        var host = new FakeHost();
        var s = new BridgeSession(withPlan(dir), host);
        s.loadPlan("burg.schem");
        s.setAnchor(0, 0, 0, null);
        host.dimension = "minecraft:the_nether";
        assertEquals(0, s.startScan());
        assertTrue(host.last().contains("du bist in minecraft:the_nether"));
        host.dimension = "minecraft:overworld";
        s.startScan();
        host.dimension = "minecraft:the_end";
        assertNull(s.tick(100));
        assertFalse(s.scanning());
        assertTrue(host.last().contains("Dimension gewechselt"));
        host.dimension = "minecraft:overworld";
        s.startScan();
        assertEquals(1, s.cancel());
        assertEquals(0, s.cancel());
        assertEquals(2, host.ended);
        host.target = null;
        assertEquals(0, s.setAnchorHere(), "console has no target block");
    }

    @Test
    void serverScanReadsAnotherWorld(@TempDir Path dir) throws Exception {
        var host = new FakeHost();
        host.source = "server";
        var s = new BridgeSession(withPlan(dir), host);
        s.loadPlan("burg.schem");
        assertEquals(1, s.setAnchor(10, 70, 10, "minecraft:the_nether"));
        assertEquals(1, s.startScan(), "server may read a world the sender is not in");
        assertNotNull(s.tick(100));
    }
}
