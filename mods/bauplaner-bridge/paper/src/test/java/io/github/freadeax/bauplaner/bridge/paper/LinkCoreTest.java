package io.github.freadeax.bauplaner.bridge.paper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LinkCoreTest {
    private static String body(LinkCore.State s, String op) { return "{\"server\":\"" + s.serverId + "\",\"op\":\"" + op + "\"}"; }

    @Test
    void freshStateRoundTripsAndKeepsKeys() {
        LinkCore.State s = LinkCore.State.fresh("LMNT");
        assertFalse(s.paired());
        LinkCore.Owner o = s.addOwner("Planer am PC", "Freadeax", Instant.parse("2026-11-04T01:00:00Z"));
        LinkCore.State back = LinkCore.State.parse(s.json());
        assertEquals(s.serverId, back.serverId);
        assertEquals("LMNT", back.name);
        assertTrue(back.paired());
        assertEquals(o.key(), back.owner(o.id()).orElseThrow().key());
        assertFalse(back.ownersPublic().toString().contains(o.key()), "public owner list never carries the key");
    }

    @Test
    void signatureMatchesTheWebsite() {
        // Same vector as tests/server-link.test.mjs (planner side, WebCrypto HMAC-SHA-256).
        assertEquals("Z4xxwD4_0cRGwTx6-G-LN_A1h2PzwaSBK_LsXLMOxYo",
                LinkCore.sign("abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG", "own_test", 1730682000000L, "{\"server\":\"srv_test01\",\"op\":\"status\"}"));
    }

    @Test
    void verifyAcceptsOnlySignedFreshMessagesForThisServer() {
        LinkCore.State s = LinkCore.State.fresh("x");
        LinkCore.Owner o = s.addOwner("a", "b", Instant.now());
        String b = body(s, "status");
        LinkCore.Control c = LinkCore.verify(s, o.id(), 5, b, LinkCore.sign(o.key(), o.id(), 5, b));
        assertEquals("status", c.op());
        s.replace(c.owner().withSeq(5));
        // replay
        assertThrows(IllegalArgumentException.class, () -> LinkCore.verify(s, o.id(), 5, b, LinkCore.sign(o.key(), o.id(), 5, b)));
        // wrong signature
        assertThrows(IllegalArgumentException.class, () -> LinkCore.verify(s, o.id(), 6, b, LinkCore.sign(o.key(), o.id(), 7, b)));
        // other server
        String other = "{\"server\":\"srv_otherserver\",\"op\":\"status\"}";
        assertThrows(IllegalArgumentException.class, () -> LinkCore.verify(s, o.id(), 8, other, LinkCore.sign(o.key(), o.id(), 8, other)));
        // unknown op
        String bad = body(s, "befehl");
        assertThrows(IllegalArgumentException.class, () -> LinkCore.verify(s, o.id(), 9, bad, LinkCore.sign(o.key(), o.id(), 9, bad)));
        // unknown owner, unpaired
        assertThrows(IllegalArgumentException.class, () -> LinkCore.verify(s, "own_x", 10, b, "x"));
        assertThrows(IllegalArgumentException.class, () -> LinkCore.verify(LinkCore.State.fresh("y"), o.id(), 10, b, "x"));
    }

    @Test
    void settingsAreValidatedAllOrNothing() {
        JsonObject ok = JsonParser.parseString("{\"team.schutz\":\"SPERREN\",\"team.nachweis\":false,\"max-chunks\":100}").getAsJsonObject();
        Map<String, Object> v = LinkCore.validate(ok);
        assertEquals("sperren", v.get("team.schutz"));
        assertEquals(false, v.get("team.nachweis"));
        assertEquals(100, v.get("max-chunks"));
        assertThrows(IllegalArgumentException.class, () -> LinkCore.validate(JsonParser.parseString("{\"team.kanal\":false}").getAsJsonObject()));
        assertThrows(IllegalArgumentException.class, () -> LinkCore.validate(JsonParser.parseString("{\"team.schutz\":\"weg\"}").getAsJsonObject()));
        assertThrows(IllegalArgumentException.class, () -> LinkCore.validate(JsonParser.parseString("{\"millisekunden-pro-tick\":51}").getAsJsonObject()));
        assertThrows(IllegalArgumentException.class, () -> LinkCore.validate(JsonParser.parseString("{\"team.nachweis\":\"ja\"}").getAsJsonObject()));
        assertEquals(LinkCore.SETTINGS.size(), LinkCore.settingsSchema().size());
    }

    @Test
    void ownersAreCapped() {
        LinkCore.State s = LinkCore.State.fresh("x");
        LinkCore.Owner first = s.addOwner("1", "p", Instant.now());
        for (int i = 0; i < LinkCore.MAX_OWNERS; i++) s.addOwner("n" + i, "p", Instant.now());
        assertEquals(LinkCore.MAX_OWNERS, s.owners.size());
        assertTrue(s.owner(first.id()).isEmpty());
    }
}
