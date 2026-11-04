package io.github.freadeax.bauplaner.mod;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.freadeax.bauplaner.mod.live.GameMarks;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.live.LiveLinkServer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Live protocol 3 (GAME-08): points set in the game wait for the Weltkarte, survive a restart, leave on ack. */
class GameMarksTest {
    @TempDir Path dir;

    @Test
    void outboxSurvivesARestartAndEmptiesOnAck() throws Exception {
        Path file = dir.resolve("m.json");
        GameMarks g = new GameMarks(file);
        var a = g.add("lager", "Holzlager", "minecraft:overworld", 10, 64, -5, "Philipp", Instant.parse("2026-11-04T09:00:00Z"));
        var b = g.add("gefahr", "", "minecraft:the_nether", 1, 70, 2, "Philipp", Instant.parse("2026-11-04T09:01:00Z"));
        assertEquals("Gefahr", b.name(), "ohne Namen der Name der Art");
        assertEquals("2026-11-04T09:00:00.000Z", a.at(), "Zeit wie toISOString");
        assertThrows(IllegalArgumentException.class, () -> g.add("burg", null, "minecraft:overworld", 0, 0, 0, null, Instant.now()));
        assertEquals(1, g.points("minecraft:overworld").size());
        assertEquals(GameMarks.LAYER, g.points("minecraft:overworld").get(0).extras().layer());

        GameMarks again = new GameMarks(file);
        again.load();
        assertEquals(2, again.size(), "nach Neustart noch da");
        var body = Json.obj(Json.parse(again.json()), "x");
        var first = Json.obj(Json.arr(body.get("marks"), "m").get(0), "m");
        assertEquals("lager", first.get("type"));
        assertEquals(10, ((Number) first.get("x")).intValue());

        assertEquals(1, again.ack(List.of(a.id(), "unbekannt")));
        assertTrue(again.remove("1"), "Nummer aus der Liste");
        assertFalse(again.remove("1"));
        assertEquals(0, again.size());
        assertTrue(Files.readString(file).contains("\"marks\":[]"));
        assertTrue(LiveLinkServer.FEATURES.contains("marks3"));
    }
}
