package io.github.freadeax.bauplaner.bridge.paper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonParser;
import java.util.List;
import org.junit.jupiter.api.Test;

/** TEAM-03: the plugin folds Mitbauer and versions like team.ts (tests/unit/team/teamCrew.test.mjs). */
class TeamLogCrewTest {
    private static final String HEAD = """
        {"format":"minecraft-bauplaner-team-server","formatVersion":1,"teamId":"team_crew0001","name":"Burg","founder":"phil",
         "sections":[{"id":"sec_a","name":"Fundament","boxes":[[0,0,0,9,9,9]]},{"id":"sec_b","name":"Dach","boxes":[[0,10,0,9,19,9]]}],
         "members":[{"id":"phil","name":"Philipp"},{"id":"anna","name":"Anna"},{"id":"ben","name":"Ben"},{"id":"cem","name":"Cem"}],
         "events":[%s]}""";

    private static int n;
    private static String ev(String by, String body) {
        n++;
        return "{\"id\":\"e" + (100 + n) + "\",\"at\":\"2026-11-06T10:" + (10 + n) + ":00.000Z\",\"by\":\"" + by + "\",\"origin\":\"planer\"," + body + "}";
    }
    private static TeamLog log(String... events) { n = 0; return new TeamLog(JsonParser.parseString(HEAD.formatted(String.join(",", events))).getAsJsonObject()); }

    @Test void crewJoinLeave() {
        n = 0;
        TeamLog t = new TeamLog(JsonParser.parseString(HEAD.formatted(String.join(",",
            ev("phil", "\"kind\":\"member.role\",\"member\":\"ben\",\"role\":\"meister\""),
            ev("ben", "\"kind\":\"section.crew\",\"section\":\"sec_a\",\"members\":[\"anna\",\"cem\"]"),
            ev("phil", "\"kind\":\"section.join\",\"section\":\"sec_a\",\"base\":1"),
            ev("anna", "\"kind\":\"section.leave\",\"section\":\"sec_a\",\"base\":2"),
            ev("phil", "\"kind\":\"section.done\",\"section\":\"sec_a\"")))).getAsJsonObject());
        TeamLog.View v = t.view();
        TeamLog.SectionState s = v.section("sec_a");
        assertEquals("cem", s.owner);
        assertEquals(List.of("phil"), s.crew);
        assertEquals("gemeldet", s.status);
        assertTrue(s.builds("phil"));
        assertFalse(s.builds("anna"));
        assertTrue(v.conflicts.isEmpty(), v.conflicts.toString());
    }

    @Test void staleChangeIsNotApplied() {
        n = 0;
        TeamLog t = new TeamLog(JsonParser.parseString(HEAD.formatted(String.join(",",
            ev("phil", "\"kind\":\"member.role\",\"member\":\"ben\",\"role\":\"meister\""),
            ev("ben", "\"kind\":\"section.crew\",\"section\":\"sec_a\",\"members\":[\"anna\"]"),
            ev("phil", "\"kind\":\"section.crew\",\"section\":\"sec_a\",\"members\":[\"anna\",\"cem\"],\"base\":1"),
            ev("ben", "\"kind\":\"section.crew\",\"section\":\"sec_a\",\"members\":[\"anna\",\"phil\"],\"base\":1"),
            ev("cem", "\"kind\":\"section.assign\",\"section\":\"sec_b\",\"member\":\"cem\"")))).getAsJsonObject());
        TeamLog.View v = t.view();
        assertEquals(List.of("cem"), v.section("sec_a").crew);
        assertTrue(v.rejected.stream().anyMatch(r -> r.startsWith("Überholt: „Fundament“ wurde inzwischen von Philipp geändert (gesehen Version 1, jetzt 2)")), v.rejected.toString());
        assertEquals(2, v.rejected.size()); // plus Cem (Helfer) darf nicht zuweisen
    }

    @Test void releaseByMitbauerOnlyLeaves() {
        TeamLog t = log(
            ev("ben", "\"kind\":\"section.claim\",\"section\":\"sec_a\""),
            ev("anna", "\"kind\":\"section.join\",\"section\":\"sec_a\""),
            ev("anna", "\"kind\":\"section.release\",\"section\":\"sec_a\""));
        TeamLog.SectionState s = t.view().section("sec_a");
        assertEquals("ben", s.owner);
        assertTrue(s.crew.isEmpty());
        assertEquals(3, s.changes.size());
    }
}
