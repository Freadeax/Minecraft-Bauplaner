package io.github.freadeax.bauplaner.mod;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.live.MarkAreas;
import io.github.freadeax.bauplaner.mod.live.WorldMarks;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** GAME-07-S11 (0.19.0): Weltplan groups and locks (schema 3) as areas for the hologram filter. */
class MarkAreasTest {
    private static WorldMarks marks(String items) {
        return WorldMarks.parse(Json.obj(Json.parse("{\"dimension\":\"minecraft:overworld\",\"items\":[" + items + "]}"), "m"));
    }

    private static final String OW = "\"note\":\"\",\"dimension\":\"minecraft:overworld\"";

    @Test
    void groupsAndLocksAreReadFromSchema3() {
        var m = marks("{\"kind\":\"site\",\"id\":\"s\",\"name\":\"Markt\"," + OW + ",\"minX\":0,\"minZ\":0,\"width\":4,\"length\":4,\"y\":null,\"projectId\":null,\"group\":\" Zentrum \",\"locked\":true},"
                + "{\"kind\":\"point\",\"id\":\"p\",\"name\":\"Lager\"," + OW + ",\"type\":\"lager\",\"x\":1,\"y\":64,\"z\":1,\"group\":\"Zentrum\"},"
                + "{\"kind\":\"path\",\"id\":\"w\",\"name\":\"Weg\"," + OW + ",\"style\":\"weg\",\"width\":3,\"points\":[[10,0],[20,0]]}");
        var site = m.sites().get(0).extras();
        assertEquals("Zentrum", site.group(), "getrimmt");
        assertTrue(site.locked());
        assertFalse(m.points().get(0).extras().locked());
        assertEquals(WorldMarks.Extras.NONE, m.paths().get(0).extras(), "Schema 2 ohne Gruppe und Sperre");
        assertEquals(Map.of("Zentrum", 2), m.groups());
        assertEquals(1, m.lockedCount());
        assertThrows(Json.JsonException.class, () -> marks("{\"kind\":\"point\",\"id\":\"p\",\"name\":\"L\"," + OW + ",\"type\":\"lager\",\"x\":1,\"y\":64,\"z\":1,\"group\":\"" + "x".repeat(41) + "\"}"));
    }

    @Test
    void areasOfSitesZonesAndPaths() {
        var m = marks("{\"kind\":\"site\",\"id\":\"s\",\"name\":\"Platz\"," + OW + ",\"minX\":0,\"minZ\":0,\"width\":4,\"length\":2,\"y\":64,\"projectId\":null,\"locked\":true},"
                + "{\"kind\":\"zone\",\"id\":\"z\",\"name\":\"Hof\"," + OW + ",\"category\":\"lager\",\"points\":[[20,0],[30,0],[20,10]],\"group\":\"Hof\"},"
                + "{\"kind\":\"path\",\"id\":\"w\",\"name\":\"Weg\"," + OW + ",\"style\":\"weg\",\"width\":3,\"points\":[[40,0],[50,0]],\"group\":\"Hof\",\"locked\":true},"
                + "{\"kind\":\"point\",\"id\":\"p\",\"name\":\"Anker\"," + OW + ",\"type\":\"anker\",\"x\":60,\"y\":64,\"z\":0,\"locked\":true}");
        var locked = MarkAreas.locked(m);
        assertEquals(2, locked.size(), "Punkte haben keine Fläche");
        assertTrue(locked.contains(0, 0)); assertTrue(locked.contains(3, 1));
        assertFalse(locked.contains(4, 0)); assertFalse(locked.contains(0, 2));
        assertTrue(locked.contains(45, 1), "Wegbreite 3: eine Spalte neben der Mittellinie");
        assertFalse(locked.contains(45, 2));
        assertFalse(locked.contains(60, 0));
        var hof = MarkAreas.group(m, "Hof");
        assertTrue(hof.contains(21, 1)); assertFalse(hof.contains(29, 9), "außerhalb des Dreiecks");
        assertTrue(hof.contains(40, 0));
        assertNull(MarkAreas.group(m, "Gibt es nicht").area());
        assertTrue(MarkAreas.groups(m, Set.of("Hof")).contains(22, 2));
        assertTrue(MarkAreas.groups(m, Set.of()).isEmpty());
    }

    @Test
    void filterWithAnAreaCountsOnlyInside() {
        // Four stones in a row x = 0..3; the site covers x = 0..1.
        PlanModel plan = PlanModel.parse("reihe.schem", ModCoreTest.schem(4, 1, 1, new int[] { 0, 0, 0 }, new String[] { "minecraft:stone" }, new int[] { 0, 0, 0, 0 }));
        var check = new LiveCheck(plan, Placement.at("minecraft:overworld", 0, 64, 0));
        check.sweep((x, y, z) -> x == 0 ? BlockState.parse("minecraft:stone") : BlockState.AIR, 10);
        var m = marks("{\"kind\":\"site\",\"id\":\"s\",\"name\":\"Platz\"," + OW + ",\"minX\":0,\"minZ\":0,\"width\":2,\"length\":1,\"y\":64,\"projectId\":null,\"group\":\"West\",\"locked\":true}");
        Filter west = Filter.ALL.within(MarkAreas.group(m, "West").area());
        int[] c = check.count(west);
        assertEquals(1, c[Verdict.OK.ordinal()]);
        assertEquals(1, c[Verdict.MISSING.ordinal()], "nur x = 1 fehlt im Platz");
        assertEquals(3, check.count(Filter.ALL)[Verdict.MISSING.ordinal()], "ohne Fläche alles");
        assertFalse(west.whole()); assertTrue(Filter.ALL.whole());
        assertTrue(west.allSections(), "Abschnitte bleiben unberührt");
        // Finder without locked areas: the nearest open block outside the site.
        var locked = MarkAreas.locked(m).area();
        Filter finder = Filter.ALL.within((x, z) -> !locked.contains(x, z));
        assertEquals(2, check.worldX(check.nearestProblem(0, 64, 0, finder)));
        assertEquals(1, check.worldX(check.nearestProblem(0, 64, 0, Filter.ALL)));
        // Two areas together: inside both.
        Filter both = west.within((x, z) -> x >= 1);
        assertEquals(1, check.count(both)[Verdict.MISSING.ordinal()]);
        assertEquals(0, check.count(both)[Verdict.OK.ordinal()]);
        assertEquals(List.of(new Materials.Line("minecraft:stone", 1, 2)), Materials.of(check, west));
    }

    /** WORLD-SHARE-01 (0.22.0): the team's Weltplan from the Team-Raum holds every dimension and up to 2000 entries. */
    @Test
    void sharedWeltplanIsCutPerDimension() {
        StringBuilder items = new StringBuilder();
        for (int i = 0; i < 700; i++) items.append(i == 0 ? "" : ",").append("{\"kind\":\"point\",\"id\":\"p").append(i).append("\",\"name\":\"P").append(i)
                .append("\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"type\":\"ziel\",\"x\":").append(i).append(",\"y\":64,\"z\":0}");
        items.append(",{\"kind\":\"site\",\"id\":\"n\",\"name\":\"Netherplatz\",\"note\":\"\",\"dimension\":\"minecraft:the_nether\",\"minX\":0,\"minZ\":0,\"width\":4,\"length\":4,\"y\":null,\"projectId\":null,\"locked\":true}");
        List<Object> all = Json.arr(Json.parse("[" + items + "]"), "items");
        WorldMarks over = WorldMarks.shared(all, "minecraft:overworld");
        assertEquals(WorldMarks.MAX_ITEMS, over.size(), "at most one request's worth per dimension");
        WorldMarks nether = WorldMarks.shared(all, "minecraft:the_nether");
        assertEquals(1, nether.size());
        assertTrue(MarkAreas.locked(nether).contains(2, 2));
        assertEquals(0, WorldMarks.shared(all, "minecraft:the_end").size());
    }
}
