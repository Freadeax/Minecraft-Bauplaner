package io.github.freadeax.bauplaner.mod.room;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonParser;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.team.TeamColors;
import io.github.freadeax.bauplaner.mod.team.TeamOutbox;
import io.github.freadeax.bauplaner.mod.team.TeamState;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * TEAM-03 in the mod (0.27.0): Mitbauer of a section come from the team room fold (same TeamLog as the plugin),
 * the plugin channel and the planner as {@code crew}; the mod shows them, counts their sections as the player's
 * own and overlays its own join/leave actions until they are confirmed.
 */
class RoomCrewTest {
    private static TeamLog log() {
        TeamLog log = new TeamLog(JsonParser.parseString(RoomClientTest.HEADER).getAsJsonObject());
        log.add(RoomClientTest.event("tev_1", "2026-11-07T10:00:00.000Z", "mem_lea", "member.join", ",\"member\":\"mem_tom\",\"name\":\"Tom\""));
        log.add(RoomClientTest.event("tev_2", "2026-11-07T10:00:01.000Z", "mem_lea", "member.join", ",\"member\":\"mem_ida\",\"name\":\"Ida\""));
        log.add(RoomClientTest.event("tev_3", "2026-11-07T10:01:00.000Z", "mem_lea", "section.claim", ",\"section\":\"sec_a\""));
        log.add(RoomClientTest.event("tev_4", "2026-11-07T10:02:00.000Z", "mem_tom", "section.join", ",\"section\":\"sec_a\""));
        log.add(RoomClientTest.event("tev_5", "2026-11-07T10:03:00.000Z", "mem_ida", "section.join", ",\"section\":\"sec_a\""));
        return log;
    }

    private static TeamState fold(TeamLog log, String me) { return TeamState.parse(RoomState.of(log, log.view(), me), TeamState.Source.ROOM); }

    @Test
    void roomFoldCarriesTheCrewInJoinOrder() {
        TeamState t = fold(log(), "mem_tom");
        TeamState.Section a = t.section("sec_a").orElseThrow();
        assertEquals("mem_lea", a.owner());
        assertEquals(List.of("mem_tom", "mem_ida"), a.crew());
        assertEquals(List.of("mem_lea", "mem_tom", "mem_ida"), a.builders());
        assertTrue(a.builds("mem_tom"));
        assertFalse(a.builds("mem_max"));
        assertEquals("Lea + Tom, Ida", t.buildersText(a, "frei"));
        assertEquals("frei", t.buildersText(t.section("sec_b").orElseThrow(), "frei"));
        assertEquals(List.of(), t.section("sec_b").orElseThrow().crew());
        // Tom is Mitbauer only: the section still counts as his task.
        assertEquals(List.of("sec_a"), t.mine().stream().map(TeamState.Section::id).toList());
        assertEquals(List.of("sec_a"), t.crewOf("mem_tom").stream().map(TeamState.Section::id).toList());
        assertEquals(List.of(), t.crewOf("mem_lea"), "owner is not crew");
    }

    @Test
    void ownerLeavingHandsTheSectionToTheFirstMitbauer() {
        TeamLog log = log();
        log.add(RoomClientTest.event("tev_6", "2026-11-07T10:04:00.000Z", "mem_lea", "section.leave", ",\"section\":\"sec_a\""));
        TeamState.Section a = fold(log, "mem_lea").section("sec_a").orElseThrow();
        assertEquals("mem_tom", a.owner());
        assertEquals(List.of("mem_ida"), a.crew());
        assertEquals("vergeben", a.status());
    }

    @Test
    void crewFieldIsParsedDefensively() {
        String json = """
                {"teamId":"t1","name":"T","sections":[
                  {"id":"a","nr":1,"name":"A","owner":"m1","crew":["m2","m1","m2","m3"],"status":"vergeben"},
                  {"id":"b","nr":2,"name":"B","crew":["m2"],"status":"frei"}],"members":[]}""";
        TeamState t = TeamState.parse(Json.obj(Json.parse(json), "x"), TeamState.Source.PLANER);
        assertEquals(List.of("m2", "m3"), t.section("a").orElseThrow().crew(), "owner and duplicates are dropped");
        assertEquals(List.of(), t.section("b").orElseThrow().crew(), "no crew without owner");
        String old = "{\"teamId\":\"t1\",\"name\":\"T\",\"sections\":[{\"id\":\"a\",\"name\":\"A\",\"owner\":\"m1\",\"status\":\"vergeben\"}]}";
        assertEquals(List.of(), TeamState.parse(Json.obj(Json.parse(old), "x"), TeamState.Source.SERVER).section("a").orElseThrow().crew(), "older senders without crew");
    }

    @Test
    void overlayShowsOwnJoinAndLeaveUntilConfirmed(@TempDir Path dir) {
        TeamOutbox box = new TeamOutbox(dir.resolve("korb.json"));
        TeamState max = fold(log(), "mem_max");
        // A newcomer (not yet in the log) joins sec_a and leaves nothing yet.
        box.add(max.teamId(), "section.join", Map.of("section", "sec_a"));
        box.add(max.teamId(), "section.join", Map.of("section", "sec_b"));
        TeamState o = max.overlay(box.pending(max.teamId()));
        TeamState.Section a = o.section("sec_a").orElseThrow(), b = o.section("sec_b").orElseThrow();
        assertEquals(List.of("mem_tom", "mem_ida", "mem_max"), a.crew());
        assertTrue(a.pending());
        assertEquals("mem_max", b.owner(), "joining a free section takes it");
        assertEquals("vergeben", b.status());

        TeamState lea = fold(log(), "mem_lea");
        TeamOutbox box2 = new TeamOutbox(dir.resolve("korb2.json"));
        box2.add(lea.teamId(), "section.leave", Map.of("section", "sec_a"));
        TeamState.Section l = lea.overlay(box2.pending(lea.teamId())).section("sec_a").orElseThrow();
        assertEquals("mem_tom", l.owner());
        assertEquals(List.of("mem_ida"), l.crew());

        TeamState ida = fold(log(), "mem_ida");
        TeamOutbox box3 = new TeamOutbox(dir.resolve("korb3.json"));
        box3.add(ida.teamId(), "section.release", Map.of("section", "sec_a"));
        TeamState.Section r = ida.overlay(box3.pending(ida.teamId())).section("sec_a").orElseThrow();
        assertEquals("mem_lea", r.owner(), "a Mitbauer giving back only leaves the crew");
        assertEquals(List.of("mem_tom"), r.crew());
    }

    @Test
    void crewColoursDifferFromTheOwnerAndFramesStayInside() {
        TeamState t = fold(log(), "mem_tom");
        TeamState.Section a = t.section("sec_a").orElseThrow();
        int[] c = TeamColors.ofCrew(t, a);
        assertEquals(2, c.length);
        int owner = TeamColors.ofSection(t, a);
        for (int x : c) assertNotEquals(owner, x);
        assertEquals(0, TeamColors.ofCrew(t, t.section("sec_b").orElseThrow()).length);
        float[] q1 = TeamColors.crewInset(new int[] { 0, 60, 0, 9, 70, 9 }, 1), q2 = TeamColors.crewInset(new int[] { 0, 60, 0, 9, 70, 9 }, 2);
        assertNotNull(q1);
        assertTrue(q2[0] > q1[0] && q2[3] < q1[3], "second frame inside the first");
        assertArrayEquals(new float[] { 0.08f, 60.08f, 0.08f, 9.92f, 70.92f, 9.92f }, q1, 1e-5f);
        assertNull(TeamColors.crewInset(new int[] { 0, 0, 0, 0, 0, 0 }, 4), "too thin for the fourth frame");
    }
}
