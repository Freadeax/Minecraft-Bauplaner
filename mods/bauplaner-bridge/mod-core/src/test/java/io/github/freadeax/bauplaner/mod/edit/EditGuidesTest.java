package io.github.freadeax.bauplaner.mod.edit;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.github.freadeax.bauplaner.bridge.Nbt;
import io.github.freadeax.bauplaner.mod.BlockState;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import io.github.freadeax.bauplaner.mod.PlanModel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.junit.jupiter.api.Test;

/** EDIT-04 in the mod: curves and symmetry like the planner (shared vectors), build guides, guide plans. */
class EditGuidesTest {
    static JsonObject vectors() throws Exception {
        Path p = Path.of("../../../fixtures/edit/mod-edit-vectors.json");
        return JsonParser.parseString(Files.readString(p)).getAsJsonObject();
    }

    static int[] ints(JsonElement e) {
        JsonArray a = e.getAsJsonArray();
        int[] out = new int[a.size()];
        for (int i = 0; i < out.length; i++) out[i] = a.get(i).getAsInt();
        return out;
    }

    static BlockState state(JsonObject o) {
        Map<String, String> props = new TreeMap<>();
        for (var e : o.getAsJsonObject("properties").entrySet()) props.put(e.getKey(), e.getValue().getAsString());
        return new BlockState(o.get("id").getAsString(), props);
    }

    @Test
    void curvesGiveTheSameCellsAsThePlanner() throws Exception {
        for (JsonElement el : vectors().getAsJsonArray("curves")) {
            JsonObject c = el.getAsJsonObject();
            List<int[]> points = new ArrayList<>();
            for (JsonElement p : c.getAsJsonArray("points")) points.add(ints(p));
            JsonObject o = c.getAsJsonObject("options");
            Curve.Options opt = new Curve.Options(Curve.Profile.parse(o.get("profile").getAsString()), o.has("radius") ? o.get("radius").getAsInt() : 0,
                    o.has("width") ? o.get("width").getAsInt() : 3, o.has("height") ? o.get("height").getAsInt() : 4,
                    o.has("closed") && o.get("closed").getAsBoolean(), o.has("tension") ? o.get("tension").getAsDouble() : 1);
            List<int[]> cells = new ArrayList<>(Curve.cells(points, opt));
            cells.sort(Comparator.<int[]>comparingInt(a -> a[0]).thenComparingInt(a -> a[1]).thenComparingInt(a -> a[2]));
            JsonArray want = c.getAsJsonArray("cells");
            String name = c.get("name").getAsString();
            assertEquals(want.size(), cells.size(), name);
            for (int i = 0; i < cells.size(); i++) assertArrayEquals(ints(want.get(i)), cells.get(i), name + " Zelle " + i);
        }
    }

    @Test
    void symmetryGivesTheSameGroupImagesAndStatesAsThePlanner() throws Exception {
        JsonObject v = vectors();
        JsonArray cells = v.getAsJsonArray("cells"), states = v.getAsJsonArray("states");
        for (JsonElement el : v.getAsJsonArray("symmetries")) {
            JsonObject s = el.getAsJsonObject(), d = s.getAsJsonObject("symmetry");
            int[] c2 = ints(d.get("centre2"));
            Symmetry sym = new Symmetry(d.get("mirrorX").getAsBoolean(), d.get("mirrorZ").getAsBoolean(), d.get("rotate").getAsInt(), c2[0], c2[1]);
            List<Symmetry.Turn> group = sym.group();
            JsonArray wantGroup = s.getAsJsonArray("group");
            assertEquals(wantGroup.size(), group.size(), sym.label());
            for (int g = 0; g < group.size(); g++) {
                JsonArray t = wantGroup.get(g).getAsJsonArray();
                assertEquals(new Symmetry.Turn(t.get(0).getAsInt(), t.get(1).getAsBoolean()), group.get(g), sym.label() + " Element " + g);
            }
            for (int i = 0; i < cells.size(); i++) {
                int[] cell = ints(cells.get(i));
                JsonArray want = s.getAsJsonArray("images").get(i).getAsJsonArray();
                for (int g = 0; g < group.size(); g++) assertArrayEquals(ints(want.get(g)), sym.image(cell[0], cell[1], cell[2], group.get(g)), sym.label());
            }
            for (int i = 0; i < states.size(); i++) {
                BlockState st = state(states.get(i).getAsJsonObject());
                JsonArray want = s.getAsJsonArray("states").get(i).getAsJsonArray();
                for (int g = 0; g < group.size(); g++)
                    assertEquals(state(want.get(g).getAsJsonObject()), new BlockState(st.id(), new TreeMap<>(sym.state(st, group.get(g)).properties())), st + " unter " + group.get(g));
            }
        }
    }

    @Test
    void symmetryRejectsWhatThePlannerRejectsAndLabelsTheAxis() {
        assertThrows(IllegalArgumentException.class, () -> new Symmetry(false, false, 3, 0, 0));
        assertThrows(IllegalArgumentException.class, () -> new Symmetry(false, false, 4, 1, 0));
        assertEquals(2, Symmetry.around(0, 0).withRotate(4).withAxis(1, 0).rotate(), "Achse auf Zellgrenze nur in X: Vierteldrehung fällt auf 2-fach zurück");
        assertEquals("Spiegeln Ost/West · Achse X 10,5 · Z -3", new Symmetry(true, false, 1, 21, -6).label());
        assertEquals("Spiegeln Ost/West + Nord/Süd · 4-fach drehen · Achse X -0,5 · Z 1,5", new Symmetry(true, true, 4, -1, 3).label());
        assertEquals("aus", Symmetry.OFF.label());
    }

    /** World as a map; missing = air. */
    static LiveCheck.WorldReader world(Map<String, BlockState> w) { return (x, y, z) -> w.getOrDefault(x + "," + y + "," + z, BlockState.AIR); }

    @Test
    void placedBlocksGetMirroredGhostsAndFollowingTheGuideStartsNothing() {
        BuildGuides g = new BuildGuides();
        g.setSymmetry(Symmetry.around(0, 0).withMirrorX(true), "minecraft:overworld");
        BlockState door = BlockState.parse("minecraft:oak_door[facing=east,half=lower,hinge=left]");
        assertTrue(g.placed(3, 64, 1, door, "minecraft:overworld"));
        assertEquals(1, g.targets().size());
        BuildGuides.Target t = g.targets().iterator().next();
        assertEquals(-3, t.x()); assertEquals(1, t.z());
        assertEquals("west", t.state().properties().get("facing"));
        assertEquals("right", t.state().properties().get("hinge"));
        // Placing onto the ghost follows the guide: no new source, no ghost at 3/64/1.
        assertFalse(g.placed(-3, 64, 1, t.state(), "minecraft:overworld"));
        assertEquals(1, g.sources());
        Map<String, BlockState> w = new HashMap<>();
        w.put("3,64,1", door);
        assertEquals(new BuildGuides.Progress(0, 1, 0, 0), g.progress(world(w)));
        w.put("-3,64,1", t.state());
        assertEquals(new BuildGuides.Progress(1, 0, 0, 0), g.progress(world(w)));
        // Other dimension: nothing is taken.
        assertFalse(g.placed(5, 64, 5, door, "minecraft:the_nether"));
        // Breaking the source: ghost gone, the standing image gets a break mark until it is gone.
        assertTrue(g.broken(3, 64, 1, "minecraft:overworld"));
        assertEquals(0, g.targets().size());
        assertEquals(1, g.toBreak().size());
        g.sweepBreaks(world(w));
        assertEquals(1, g.toBreak().size());
        w.remove("-3,64,1");
        g.sweepBreaks(world(w));
        assertEquals(0, g.toBreak().size());
    }

    @Test
    void fourFoldSymmetryAndCurveGhostsWithAPlan() throws Exception {
        BuildGuides g = new BuildGuides();
        g.setSymmetry(Symmetry.around(0, 0).withRotate(4), "minecraft:overworld");
        g.placed(5, 64, 0, BlockState.parse("minecraft:stone"), "minecraft:overworld");
        assertEquals(3, g.targets().size());
        assertNull(g.curveError());
        g.addPoint(10, 64, 10, "minecraft:overworld");
        assertNotNull(g.curveError(), "ein Punkt reicht nicht");
        g.addPoint(20, 64, 10, "minecraft:overworld");
        assertEquals("Erst einen Block für die Kurve wählen.", g.curveError());
        g.setBlock(BlockState.parse("minecraft:gravel"));
        g.setCurve(Curve.Options.of(Curve.Profile.WEG).withWidth(1));
        assertNull(g.curveError());
        int line = g.curveCells().length / 3;
        assertEquals(11, line);
        // Curve cells are mirrored too: 4 × 11 curve ghosts + 3 images of the stone.
        assertEquals(4 * 11 + 3, g.targets().size());
        g.shiftCurve(-1);
        assertEquals(63, g.curveCells()[1]);
        assertTrue(g.undoPoint());
        assertEquals(3, g.targets().size());
        g.addPoint(20, 63, 10, "minecraft:overworld");
        // As a plan: the hologram reads it like a website export.
        GuidePlan.Result plan = GuidePlan.write("Kiesweg", g.targets(), 4671, Instant.parse("2026-11-06T10:00:00Z"));
        assertArrayEquals(new int[] { -20, 63, -20 }, plan.anchor());
        PlanModel model = PlanModel.parse(plan.fileName(), plan.bytes());
        assertEquals(g.targets().size(), model.blockCount());
        assertEquals("Kiesweg", model.name());
        assertTrue(plan.fileName().startsWith("bauhilfe-kiesweg-"));
        assertEquals(3, Nbt.readGzip(plan.bytes(), 1 << 20).tag().compound("Wurzel").get("Schematic").compound("Schematic").get("Version").asInt("Version"));
        // Switching off clears the mirror sources.
        g.setSymmetry(Symmetry.OFF, "minecraft:overworld");
        assertEquals(0, g.sources());
        assertEquals(11, g.targets().size());
        g.clearAll();
        assertFalse(g.active());
    }
}
