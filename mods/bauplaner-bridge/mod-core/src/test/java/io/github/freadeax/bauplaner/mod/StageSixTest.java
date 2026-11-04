package io.github.freadeax.bauplaner.mod;

import static io.github.freadeax.bauplaner.mod.ModCoreTest.schem;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.team.TeamState;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** GAME-07 stage 6: packing list and scaffold hints. */
class StageSixTest {
    private static TeamState.Store store(String name, int x, String item, int count) {
        return new TeamState.Store(name, name, "minecraft:overworld", new int[] { x, 64, 0 }, null, null, null, "geprueft", null,
                List.of(new TeamState.Item(item, count)), false);
    }

    @Test
    void packingListSubtractsWhatYouCarryAndTakesFromTheNearestChest() {
        var open = List.of(new Materials.Line("minecraft:stone", 200, 300), new Materials.Line("minecraft:oak_sign", 20, 20),
                new Materials.Line("minecraft:glass", 0, 10));
        Map<String, Integer> carried = Map.of("minecraft:stone", 40);
        var stores = List.of(store("Fern", 100, "minecraft:stone", 500), store("Nah", 5, "minecraft:stone", 100));
        var r = PackList.of(open, carried, id -> id.endsWith("_sign") ? 16 : 64, stores, new double[] { 0, 64, 0 }, 10);
        assertEquals(2, r.lines().size(), "erledigtes Material fehlt in der Packliste");
        var stone = r.lines().stream().filter(l -> l.id().equals("minecraft:stone")).findFirst().orElseThrow();
        assertEquals(160, stone.fetch());
        assertEquals(3, stone.stacks());
        assertEquals("Nah", stone.from().get(0).store(), "nächste Kiste zuerst");
        assertEquals(100, stone.from().get(0).count());
        assertEquals(60, stone.from().get(1).count());
        assertEquals(0, stone.missing());
        var sign = r.lines().stream().filter(l -> l.id().equals("minecraft:oak_sign")).findFirst().orElseThrow();
        assertEquals(2, sign.stacks(), "Schilder stapeln nur bis 16");
        assertEquals(20, sign.missing(), "in keinem Lager");
        assertEquals(5, r.stacks());
        assertEquals(1, r.boxes());
        assertTrue(r.fits());
        assertEquals(20, r.missing());
        assertFalse(PackList.of(open, Map.of(), id -> 64, List.of(), null, 2).fits());
    }

    @Test
    void scaffoldFindsHangingAndFallingBlocks() {
        // Row of three on x: stone at 0 (on the ground), stone at 1, sand at 2; plus a lone stone two blocks up at x=0.
        PlanModel plan = PlanModel.parse("g.schem", schem(3, 3, 1, new int[] { 0, 0, 0 },
                new String[] { "minecraft:air", "minecraft:stone", "minecraft:sand" },
                // index = x + z*w + y*w*l  (w=3,l=1): y=0 row, y=1 row, y=2 row
                new int[] { 1, 1, 2, 0, 0, 0, 1, 0, 0 }));
        var placement = new Placement("minecraft:overworld", 0, 64, 0, 0, false);
        var check = new LiveCheck(plan, placement);
        Map<String, BlockState> world = new HashMap<>();
        LiveCheck.WorldReader reader = (x, y, z) -> y == 63 && x != 2 ? BlockState.parse("minecraft:dirt") : world.getOrDefault(x + "," + y + "," + z, BlockState.AIR);
        check.sweep(reader, 1000);
        assertEquals(4, check.count(Verdict.MISSING));
        var r = Scaffold.of(check, Filter.ALL, reader, 0, 64, 0);
        // The bottom row touches the ground; the lone stone two blocks up touches nothing of plan or world: it hangs.
        assertEquals(1, r.hanging(), "nur der einzelne Stein oben hängt");
        assertEquals(1, r.falling(), "Sand über Luft fällt");
        assertEquals(66, check.worldY(r.nearestHanging()));
        assertEquals(2, check.worldX(r.nearestFalling()));
        world.put("2,63,0", BlockState.parse("minecraft:stone"));
        check.sweep(reader, 1000);
        assertEquals(0, Scaffold.of(check, Filter.ALL, reader, 0, 64, 0).falling(), "mit Block darunter fällt nichts");
        assertTrue(Scaffold.falls("minecraft:white_concrete_powder"));
    }
}
