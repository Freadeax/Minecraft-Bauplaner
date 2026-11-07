package io.github.freadeax.bauplaner.bridge.paper;

import static org.junit.jupiter.api.Assertions.*;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.team.EventSig;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** GAME-06 (SIGNED_EVENTS.md): which room events the server lets into its fold, and the protection rules. */
class EventTrustTest {
    static final String KEY = EventSig.deriveKey("adminKeyForTests_0123456789abcdefXYZ");
    static final String HEADER = "{\"format\":\"minecraft-bauplaner-team-server\",\"formatVersion\":1,\"teamId\":\"team_vec\",\"name\":\"Burg\",\"founder\":\"b_philipp\","
            + "\"sections\":[{\"id\":\"s1\",\"name\":\"Turm\",\"boxes\":[[0,60,0,9,90,9]]},{\"id\":\"s2\",\"name\":\"Mauer\",\"boxes\":[[20,60,0,29,70,9]]}],"
            + "\"members\":[{\"id\":\"b_philipp\",\"name\":\"Philipp\",\"player\":\"Freadeax\"}],\"events\":[]}";
    int n = 0;
    final Map<String, Long> seqs = new HashMap<>();

    JsonObject ev(String by, String kind, String fields) {
        n++;
        return JsonParser.parseString("{\"id\":\"e" + n + "\",\"at\":\"2026-11-06T20:00:" + String.format("%02d", n) + ".000Z\",\"by\":\"" + by + "\",\"origin\":\"planer\",\"kind\":\"" + kind + "\"" + (fields.isEmpty() ? "" : "," + fields) + "}").getAsJsonObject();
    }
    /** As it arrives from the room: with the next arrival number. */
    JsonObject room(TeamLog t, JsonObject e) { seqs.put(e.get("id").getAsString(), (long) seqs.size() + 1); t.add(e); return e; }
    static JsonObject sign(JsonObject e) {
        Map<String, Object> m = EventSig.signed(KEY, "team_vec", Json.obj(Json.parse(TeamLog.GSON.toJson(e)), "e"));
        return JsonParser.parseString(Json.write(m)).getAsJsonObject();
    }

    @Test
    void checksTheRoomOnceTheBauleitungConfirmedItsPast() {
        TeamLog t = TeamLog.parse(HEADER);
        // Before GAME-06: Lea joined and Philipp made her Baumeister (unsigned, but confirmed later with team.trust).
        room(t, ev("b_lea", "member.join", "\"member\":\"b_lea\",\"name\":\"Lea\",\"player\":\"LeaMC\""));
        room(t, ev("b_philipp", "member.role", "\"member\":\"b_lea\",\"role\":\"meister\""));
        room(t, ev("b_tom", "member.join", "\"member\":\"b_tom\",\"name\":\"Tom\",\"player\":\"TomMC\""));
        EventTrust none = new EventTrust(t, KEY, EventTrust.of(seqs));
        assertFalse(none.active(), "ohne team.trust wird nichts gefiltert");
        room(t, sign(ev("b_philipp", "team.trust", "\"upTo\":\"3\"")));
        // After: Tom pretends to be Philipp and makes himself Bauleitung, switches the protection off, takes Lea's name.
        JsonObject forgedRole = room(t, ev("b_philipp", "member.role", "\"member\":\"b_tom\",\"role\":\"leitung\""));
        JsonObject forgedProtect = room(t, ev("b_tom", "team.protect", "\"mode\":\"aus\""));
        JsonObject forgedName = room(t, ev("b_lea", "member.player", "\"member\":\"b_lea\",\"player\":\"TomMC2\""));
        JsonObject stolen = room(t, ev("b_tom", "member.player", "\"member\":\"b_tom\",\"player\":\"LeaMC\""));
        JsonObject badSig = ev("b_philipp", "team.protect", "\"mode\":\"hinweis\""); badSig.addProperty("sig", "uJdu-WGDe5BtEiw7UzdcBYFNBAoWl_yT8t6dwlDjnC4"); room(t, badSig);
        // Real: Philipp's signed protection, Tom's own claim, the server's own event.
        room(t, sign(ev("b_philipp", "team.protect", "\"mode\":\"sperren\",\"free\":\"team\"")));
        room(t, ev("b_tom", "section.claim", "\"section\":\"s2\""));
        JsonObject server = ev("mc_1", "member.join", "\"member\":\"mc_1\",\"name\":\"Gast\",\"player\":\"Gast\""); server.addProperty("origin", "server"); t.add(server);

        EventTrust trust = new EventTrust(t, KEY, EventTrust.of(seqs));
        assertTrue(trust.active());
        assertEquals(3, trust.upTo);
        TeamLog.View v = t.view(trust);
        assertEquals("meister", v.role("b_lea"), "Rolle von vor der Bestätigung bleibt");
        assertEquals("helfer", v.role("b_tom"), "gefälschte Bauleitung nicht übernommen");
        assertEquals("sperren", v.protectMode);
        assertEquals("team", v.protectFree);
        assertEquals("LeaMC", v.players.get("b_lea"), "der erste Spielername gilt");
        assertEquals("TomMC", v.players.get("b_tom"));
        assertEquals("b_tom", v.section("s2").owner, "eigene Übernahme ohne Unterschrift geht");
        assertTrue(v.known.contains("mc_1"), "Ereignisse des Servers gelten");
        for (JsonObject x : new JsonObject[] {forgedRole, forgedProtect, forgedName, stolen, badSig})
            assertTrue(v.untrusted.containsKey(x.get("id").getAsString()), "nicht übernommen: " + x);
        assertEquals(5, v.untrusted.size());

        // The planner (no filter) still shows everything – only the server is strict.
        TeamLog.View all = t.view();
        assertEquals("leitung", all.role("b_tom"));
        // Without signing key the server behaves as up to 0.23.0.
        assertFalse(new EventTrust(t, null, EventTrust.of(seqs)).active());
    }

    @Test
    void eventsNotFromTheRoomCount() {
        TeamLog t = TeamLog.parse(HEADER);
        room(t, sign(ev("b_philipp", "team.trust", "\"upTo\":\"0\"")));
        t.add(ev("b_philipp", "member.role", "\"member\":\"b_philipp\",\"role\":\"leitung\"")); // from a team file on the server
        TeamLog.View v = t.view(new EventTrust(t, KEY, EventTrust.of(seqs)));
        assertTrue(v.untrusted.isEmpty());
        // A trust confirmation without signature counts for nothing.
        TeamLog u = TeamLog.parse(HEADER);
        seqs.clear();
        room(u, ev("b_philipp", "team.trust", "\"upTo\":\"99\""));
        assertFalse(new EventTrust(u, KEY, EventTrust.of(seqs)).active());
    }

    @Test
    void protectionByRole() {
        String other = ProtectRules.OTHER, done = ProtectRules.DONE, team = ProtectRules.TEAM_ONLY;
        assertNull(ProtectRules.blocked("vergeben", "b_lea", "b_tom", "meister", "team"), "Baumeister überall");
        assertNull(ProtectRules.blocked("bestaetigt", "b_lea", "b_x", "leitung", "alle"));
        assertEquals(done, ProtectRules.blocked("bestaetigt", "b_lea", "b_lea", "helfer", "alle"), "bestätigt nur Baumeister");
        assertNull(ProtectRules.blocked("vergeben", "b_lea", "b_lea", "helfer", "team"), "eigener Abschnitt");
        assertEquals(other, ProtectRules.blocked("gemeldet", "b_lea", "b_tom", "helfer", "alle"));
        assertEquals(other, ProtectRules.blocked("vergeben", "b_lea", null, "gast", "alle"), "Fremde nie");
        assertNull(ProtectRules.blocked("frei", null, null, "gast", "alle"), "frei: alle");
        assertEquals(team, ProtectRules.blocked("frei", null, null, "gast", "team"));
        assertEquals(team, ProtectRules.blocked("frei", null, "b_g", "gast", "team"), "Gäste nicht");
        assertNull(ProtectRules.blocked("frei", null, "b_tom", "helfer", "team"));
        assertNull(ProtectRules.blocked("nacharbeit", null, "b_tom", "helfer", "alle"));
    }
}
