package io.github.freadeax.bauplaner.bridge.paper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** WORLD-SHARE-01: the team's Weltplan from the Team-Raum – markers per dimension and locked areas. */
class WorldShareTest {
    static final String DOC = """
        {"schema":1,"format":"bauplaner-weltplan","at":"2026-11-06T12:00:00Z","by":"bld_lea",
         "items":[
          {"kind":"site","id":"s1","name":"Marktplatz","note":"","dimension":"minecraft:overworld","minX":0,"minZ":0,"width":16,"length":8,"y":64,"projectId":null,"locked":true,"group":"Dorf"},
          {"kind":"site","id":"s2","name":"Frei","note":"","dimension":"minecraft:overworld","minX":100,"minZ":0,"width":4,"length":4,"y":null,"projectId":null},
          {"kind":"zone","id":"z1","name":"Wald","note":"","dimension":"minecraft:overworld","category":"natur","points":[[-20,-20],[-10,-20],[-10,-10],[-20,-10]],"locked":true},
          {"kind":"point","id":"p1","name":"Portal","note":"","dimension":"minecraft:the_nether","type":"portal","x":3,"y":70,"z":4,"locked":true}],
         "shapes":{
          "minecraft:overworld":[
            {"kind":"area","id":"projekt_burg","label":"Burg","detail":"1.200 Blöcke","color":"#f2b84b","group":"projekte","points":[[0,0],[10,0],[10,10],[0,10]],"minY":60,"maxY":80},
            {"kind":"line","id":"w1","label":"Hauptweg","detail":"Weg","color":"#c9a66b","group":"wege","points":[[0.5,0.5],[20.5,0.5]],"y":64,"width":3}],
          "minecraft:the_nether":[{"kind":"poi","id":"p1","label":"Portal <1>","detail":"","color":"#c79bff","group":"punkte","x":3,"y":70,"z":4}]}}""";

    @Test
    void readsMarkersAndLocks() {
        WorldShare w = WorldShare.parse(DOC);
        assertEquals(4, w.items);
        assertEquals("bld_lea", w.by);
        assertEquals(3, w.shapeCount());
        assertTrue(w.shapes.get("minecraft:overworld").get(0).extruded());
        assertEquals(0xc9a66b, w.shapes.get("minecraft:overworld").get(1).rgb());
        assertEquals("<b>Portal &lt;1&gt;</b>", WorldShare.html(w.shapes.get("minecraft:the_nether").get(0)));
        // Locked site and zone protect their columns; the point has no area; free sites protect nothing.
        assertEquals(2, w.lockCount());
        assertEquals("Marktplatz", w.lockAt("minecraft:overworld", 15, 7).name());
        assertNull(w.lockAt("minecraft:overworld", 16, 7), "east of the site");
        assertNull(w.lockAt("minecraft:overworld", 101, 1), "free site");
        assertEquals("zone", w.lockAt("minecraft:overworld", -15, -15).kind());
        assertNull(w.lockAt("minecraft:the_nether", 3, 4));
    }

    @Test
    void rejectsForeignOrBrokenDocuments() {
        assertThrows(RuntimeException.class, () -> WorldShare.parse("{\"format\":\"bauplaner-live-maps\",\"items\":[]}"));
        assertThrows(RuntimeException.class, () -> WorldShare.parse(DOC.replace("\"group\":\"wege\"", "\"group\":\"geheim\"")));
        assertThrows(RuntimeException.class, () -> WorldShare.parse(DOC.replace("[[0.5,0.5],[20.5,0.5]]", "[[0.5,0.5]]")));
    }

    @Test
    void severalTeamsDoNotCollide() {
        Map<String, WorldShare> teams = new LinkedHashMap<>();
        teams.put("team_a", WorldShare.parse(DOC));
        assertEquals("projekt_burg", WorldShare.combine(teams).get("minecraft:overworld").get(0).id(), "one team: ids as in the planner");
        teams.put("team_b", WorldShare.parse(DOC));
        var all = WorldShare.combine(teams).get("minecraft:overworld");
        assertEquals(4, all.size());
        assertNotNull(all.stream().filter(s -> s.id().equals("team_b_projekt_burg")).findFirst().orElse(null));
    }
}
