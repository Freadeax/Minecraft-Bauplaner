package io.github.freadeax.bauplaner.mod.room;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonParser;
import io.github.freadeax.bauplaner.mod.team.StoreStock;
import io.github.freadeax.bauplaner.mod.team.TeamState;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** COOP-05 S04: stock of the storage chests from the team room into the game, like the plugin's team channel. */
class RoomStockTest {
    private static com.google.gson.JsonObject ev(String id, String at, String by, String origin, String kind, String extra) {
        return JsonParser.parseString("{\"id\":\"" + id + "\",\"at\":\"" + at + "\",\"by\":\"" + by + "\",\"origin\":\"" + origin + "\",\"kind\":\"" + kind + "\"" + extra + "}").getAsJsonObject();
    }

    private static TeamState fold(TeamLog log) { return TeamState.parse(RoomState.of(log, log.view(), "mem_tom"), TeamState.Source.ROOM); }

    @Test
    void checkedChestsKeepStatusSectionPurposeAndTheCount() {
        TeamLog log = new TeamLog(JsonParser.parseString(RoomClientTest.HEADER).getAsJsonObject());
        log.add(ev("tev_1", "2026-11-06T09:00:00.000Z", "mem_lea", "server", "store.chest", ",\"chest\":\"st_a\",\"name\":\"Steinlager\",\"dimension\":\"minecraft:overworld\",\"pos\":[5,64,5]"));
        log.add(ev("tev_2", "2026-11-06T09:00:01.000Z", "mem_lea", "server", "store.config", ",\"chest\":\"st_a\",\"section\":\"sec_b\",\"purpose\":\"vorrat\",\"pos2\":[6,64,5]"));
        log.add(ev("tev_3", "2026-11-06T09:01:00.000Z", "mem_lea", "server", "store.count", ",\"chest\":\"st_a\",\"items\":[{\"item\":\"minecraft:stone\",\"count\":640},{\"item\":\"minecraft:oak_planks\",\"count\":32}]"));
        log.add(ev("tev_4", "2026-11-06T09:02:00.000Z", "mem_lea", "server", "store.check", ",\"chest\":\"st_a\",\"status\":\"abweichend\",\"diff\":[{\"item\":\"minecraft:stone\",\"delta\":-64}]"));
        // A later clean check does not hide the open deviation (same as the plugin and the planner).
        log.add(ev("tev_5", "2026-11-06T09:03:00.000Z", "mem_lea", "server", "store.check", ",\"chest\":\"st_a\",\"status\":\"geprueft\""));
        // What a player saw later never replaces the plugin's count.
        log.add(ev("tev_6", "2026-11-06T09:04:00.000Z", "mem_tom", "planer", "store.seen", ",\"chest\":\"st_a\",\"items\":[{\"item\":\"minecraft:stone\",\"count\":1}]"));
        TeamState.Store s = fold(log).stores().get(0);
        assertEquals("Steinlager", s.name());
        assertEquals("abweichend", s.status());
        assertEquals("sec_b", s.section());
        assertEquals("vorrat", s.purpose());
        assertEquals(6, s.pos2()[0]);
        assertEquals("2026-11-06T09:03:00.000Z", s.checkedAt());
        assertEquals("server", s.origin());
        assertFalse(s.unverified());
        assertEquals("2026-11-06T09:01:00.000Z", s.stockAt());
        assertEquals(640, s.count("minecraft:stone"));
        assertEquals(32, s.count("minecraft:oak_planks"));
    }

    @Test
    void withoutACountTheNewestSightingStandsInAndIsMarkedUnverified() {
        TeamLog log = new TeamLog(JsonParser.parseString(RoomClientTest.HEADER).getAsJsonObject());
        log.add(ev("tev_1", "2026-11-06T09:00:00.000Z", "mem_lea", "server", "store.chest", ",\"chest\":\"st_b\",\"name\":\"Holz\",\"dimension\":\"minecraft:overworld\",\"pos\":[1,64,1]"));
        TeamState.Store empty = fold(log).stores().get(0);
        assertNull(empty.origin());
        assertEquals("ungeprueft", empty.status());
        assertEquals("noch nicht gezählt", StoreStock.source(empty, Instant.parse("2026-11-06T10:00:00Z")));
        log.add(ev("tev_2", "2026-11-06T09:10:00.000Z", "mem_tom", "planer", "store.seen", ",\"chest\":\"st_b\",\"items\":[{\"item\":\"minecraft:oak_log\",\"count\":20}]"));
        log.add(ev("tev_3", "2026-11-06T09:20:00.000Z", "mem_tom", "planer", "store.seen", ",\"chest\":\"st_b\",\"items\":[{\"item\":\"minecraft:oak_log\",\"count\":12}],\"more\":true"));
        TeamState.Store s = fold(log).stores().get(0);
        assertEquals("spiel", s.origin());
        assertTrue(s.unverified());
        assertTrue(s.more());
        assertEquals(12, s.count("minecraft:oak_log"));
        assertEquals("Tom", s.stockBy());
        assertEquals("im Spiel gesehen von Tom vor 40 Min (ungeprüft)", StoreStock.source(s, Instant.parse("2026-11-06T10:00:00Z")));
        // A sighting of an unknown chest is dropped (the planner rejects it the same way).
        log.add(ev("tev_4", "2026-11-06T09:30:00.000Z", "mem_tom", "planer", "store.seen", ",\"chest\":\"st_x\",\"items\":[]"));
        assertEquals(1, fold(log).stores().size());
    }

    @Test
    void totalsPerItemInTheDimensionFlagSeenStock() {
        TeamState.Store a = new TeamState.Store("a", "A", "minecraft:overworld", new int[] { 0, 64, 0 }, null, null, "vorrat", "geprueft", null,
                List.of(new TeamState.Item("minecraft:stone", 100)), false, "server", null, null);
        TeamState.Store b = new TeamState.Store("b", "B", "minecraft:overworld", new int[] { 9, 64, 0 }, null, null, "vorrat", "ungeprueft", null,
                List.of(new TeamState.Item("minecraft:stone", 20), new TeamState.Item("minecraft:glass", 5)), false, "spiel", null, "Tom");
        TeamState.Store gone = new TeamState.Store("c", "C", "minecraft:overworld", new int[] { 9, 64, 9 }, null, null, "vorrat", "fehlt", null,
                List.of(new TeamState.Item("minecraft:stone", 999)), false, "server", null, null);
        TeamState.Store nether = new TeamState.Store("d", "D", "minecraft:the_nether", new int[] { 0, 64, 0 }, null, null, "vorrat", "geprueft", null,
                List.of(new TeamState.Item("minecraft:stone", 7)), false, "server", null, null);
        Map<String, StoreStock.Amount> t = StoreStock.totals(List.of(a, b, gone, nether), "minecraft:overworld");
        assertEquals(new StoreStock.Amount(120, true), t.get("minecraft:stone"));
        assertEquals("120*", t.get("minecraft:stone").label());
        assertEquals(new StoreStock.Amount(5, true), t.get("minecraft:glass"));
        assertEquals(new StoreStock.Amount(100, false), StoreStock.totals(List.of(a), "minecraft:overworld").get("minecraft:stone"));
        assertEquals("100", StoreStock.totals(List.of(a), null).get("minecraft:stone").label());
        assertEquals("vor 2 Tagen", StoreStock.ago("2026-11-04T09:00:00Z", Instant.parse("2026-11-06T10:00:00Z")));
        assertEquals("", StoreStock.ago("kaputt", Instant.parse("2026-11-06T10:00:00Z")));
    }
}
