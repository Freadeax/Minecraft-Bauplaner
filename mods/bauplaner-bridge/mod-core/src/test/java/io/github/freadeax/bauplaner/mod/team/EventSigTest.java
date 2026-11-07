package io.github.freadeax.bauplaner.mod.team;

import static org.junit.jupiter.api.Assertions.*;

import io.github.freadeax.bauplaner.mod.live.Json;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** GAME-06: same vector as tests/unit/team/event-sig.test.mjs (planner) and EventTrustTest (plugin). */
class EventSigTest {
    static final String ADMIN = "adminKeyForTests_0123456789abcdefXYZ";
    static final String NOTE = "{\"id\":\"tev_vec1\",\"at\":\"2026-11-06T20:00:00.000Z\",\"by\":\"b_founder\",\"origin\":\"planer\",\"kind\":\"note.add\",\"noteId\":\"n1\","
            + "\"text\":\"Grüße \\\"Lea\\\"\\nZeile\\t2 ✓ 😀\",\"tag\":\"info\",\"pos\":[12,-3,70000]}";
    static final String PROTECT = "{\"id\":\"tev_vec2\",\"at\":\"2026-11-06T20:00:01.000Z\",\"by\":\"b_founder\",\"origin\":\"planer\",\"kind\":\"team.protect\",\"mode\":\"sperren\",\"free\":\"team\"}";

    static Map<String, Object> obj(String json) { return Json.obj(Json.parse(json), "Ereignis"); }

    @Test
    void matchesThePlanner() {
        String key = EventSig.deriveKey(ADMIN);
        assertEquals("P3ZsF8QJD_CcMeXC544qh4RJFOiwYUxgDc4kJHN6BSA", key);
        assertEquals("{\"at\":\"2026-11-06T20:00:00.000Z\",\"by\":\"b_founder\",\"id\":\"tev_vec1\",\"kind\":\"note.add\",\"noteId\":\"n1\",\"origin\":\"planer\",\"pos\":[12,-3,70000],\"tag\":\"info\",\"text\":\"Grüße \\\"Lea\\\"\\nZeile\\t2 ✓ 😀\"}",
                EventSig.canonical(obj(NOTE)));
        assertEquals("uJdu-WGDe5BtEiw7UzdcBYFNBAoWl_yT8t6dwlDjnC4", EventSig.sign(key, "team_vec", obj(NOTE)));
        assertEquals("wbupC3LIHBLvjVxV5wCXMcyZrkiO_MgRvvZFxTr5wSY", EventSig.sign(key, "team_vec", obj(PROTECT)));
    }

    @Test
    void signatureFitsOnlyItsTeamContentAndKey() {
        String key = EventSig.deriveKey(ADMIN);
        Map<String, Object> signed = EventSig.signed(key, "team_vec", obj(PROTECT));
        assertTrue(EventSig.verify(key, "team_vec", signed));
        assertFalse(EventSig.verify(key, "team_other", signed), "anderes Team");
        Map<String, Object> changed = new java.util.LinkedHashMap<>(signed); changed.put("mode", "aus");
        assertFalse(EventSig.verify(key, "team_vec", changed), "geänderter Inhalt");
        assertFalse(EventSig.verify(EventSig.deriveKey("someOtherAdminKey_0123456789abcdef"), "team_vec", signed), "anderer Schlüssel");
        assertFalse(EventSig.verify(key, "team_vec", obj(PROTECT)), "ohne Unterschrift");
        assertFalse(EventSig.verify(null, "team_vec", signed));
        assertEquals(signed, EventSig.signed(key, "team_vec", signed), "erneut unterschrieben bleibt gleich");
    }

    @Test
    void modLinkCarriesTheKey() {
        String key = EventSig.deriveKey(ADMIN);
        var c = new io.github.freadeax.bauplaner.mod.room.RoomClient.Config("https://a", "r_test1234", "k", "b_p", null, null, "dev", "s_srv", key);
        assertEquals("https://a/#/team/beitreten?raum=https%3A%2F%2Fa&id=r_test1234&s=s_srv&l=" + key, c.serverLink());
        var parsed = io.github.freadeax.bauplaner.mod.room.RoomClient.parse(Map.of("url", "https://a", "room", "r_test1234", "key", "k", "member", "b_p", "serverKey", "s_srv", "signKey", key));
        assertEquals(key, parsed.signKey());
        assertNull(io.github.freadeax.bauplaner.mod.room.RoomClient.parse(Map.of("url", "https://a", "room", "r_test1234", "key", "k", "member", "b_p", "signKey", "kurz")).signKey());
    }

    @Test
    void numbersLikeJavaScript() {
        assertEquals("70000", EventSig.number(70000.0));
        assertEquals("-3", EventSig.number(-3L));
        assertEquals("0.5", EventSig.number(0.5));
        assertEquals("1e-7", EventSig.number(1e-7));
        assertEquals("[1,\"a\",true,null]", EventSig.canonical(java.util.Arrays.asList(1, "a", true, null)));
        assertEquals("\"\\u0001\\b\\f\"", EventSig.canonical("\u0001\b\f"));
    }
}
