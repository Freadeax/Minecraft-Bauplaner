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
    void modLinkCarriesOnlyThePublicKey() {
        // TEAM-SEC-01: the mod holds the Ed25519 seed (leaderSeed) and hands the plugin only the public key (p).
        String seed = EventSig.deriveSeed(ADMIN);
        var c = new io.github.freadeax.bauplaner.mod.room.RoomClient.Config("https://a", "r_test1234", "k", "b_p", null, null, "dev", "s_srv", seed);
        assertEquals("https://a/#/team/beitreten?raum=https%3A%2F%2Fa&id=r_test1234&s=s_srv&p=" + EventSig.publicKey(seed), c.serverLink());
        assertFalse(c.serverLink().contains(seed));
        var parsed = io.github.freadeax.bauplaner.mod.room.RoomClient.parse(Map.of("url", "https://a", "room", "r_test1234", "key", "k", "member", "b_p", "serverKey", "s_srv", "leaderSeed", seed));
        assertEquals(seed, parsed.signKey());
        assertNull(io.github.freadeax.bauplaner.mod.room.RoomClient.parse(Map.of("url", "https://a", "room", "r_test1234", "key", "k", "member", "b_p", "signKey", EventSig.deriveKey(ADMIN))).signKey(), "alter HMAC-Schlüssel wird nicht mehr übernommen");
        assertNull(io.github.freadeax.bauplaner.mod.room.RoomClient.parse(Map.of("url", "https://a", "room", "r_test1234", "key", "k", "member", "b_p", "leaderSeed", "kurz")).signKey());
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

    /** TEAM-SEC-01: same Ed25519 vector as tests/unit/team/team-identity.test.mjs. */
    @Test
    void ed25519MatchesThePlannerAndOnlyThePublicKeyChecks() {
        String seed = EventSig.deriveSeed(ADMIN);
        assertEquals("-0s3Mq0ZUv6MYfmUtM4j7IqQ0KSpT5KmGwPaLNUfRXU", seed);
        String pub = EventSig.publicKey(seed);
        assertEquals("LMHlystvLr428DYuRWGy9_baXTCFXRveAK3GVrwvaaQ", pub);
        Map<String, Object> p = EventSig.signedEd(seed, "team_vec", obj(PROTECT));
        assertEquals("swCnedyunj6mA2WM_9boTh4NXDenK3VSiEe1Sx-10VeFe95djdeF44O1J5ON9jCjHssMTU6v7CWl3fapKTVWCA", p.get("sig"));
        assertEquals("ZB2YND2NZ_CMlqze-h3oEnwnQEWxgV0pg7kyjw4D3OVhio_iMRv7XV-caAVnIwD94cU9gSHW0X8oYUIkf852DQ", EventSig.signedEd(seed, "team_vec", obj(NOTE)).get("sig"));
        assertTrue(EventSig.verifyEd(pub, "team_vec", p));
        assertFalse(EventSig.verifyEd(pub, "team_other", p), "anderes Team");
        Map<String, Object> changed = new java.util.LinkedHashMap<>(p); changed.put("mode", "aus");
        assertFalse(EventSig.verifyEd(pub, "team_vec", changed), "geänderter Inhalt");
        assertFalse(EventSig.verifyEd(EventSig.publicKey(EventSig.deriveSeed("other_admin_key_0123456789abcdef")), "team_vec", p), "anderer Schlüssel");
        // Whoever holds only the public key cannot make a signature: as HMAC key it gives nothing that verifies.
        Map<String, Object> forged = EventSig.signed(pub, "team_vec", obj(PROTECT));
        assertFalse(EventSig.verifyEd(pub, "team_vec", forged));
        assertFalse(EventSig.verifyEd(null, "team_vec", p));
    }
}
