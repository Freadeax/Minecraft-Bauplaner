package io.github.freadeax.bauplaner.bridge.paper;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

/** LINK-11: the link the mod builds (RoomClient.Config.serverLink) is read by the plugin like the planner's server link. */
class RoomLinkTest {
    @Test
    void readsTheLinkFromTheMod() {
        RoomLink.Link l = RoomLink.parse("http://127.0.0.1:9/#/team/beitreten?raum=http%3A%2F%2F127.0.0.1%3A9&id=r_test1234&s=s_server%2F%2Bkey").orElseThrow();
        assertEquals("http://127.0.0.1:9", l.base());
        assertEquals("r_test1234", l.rid());
        assertEquals("s_server/+key", l.key());
        RoomLink.Link web = RoomLink.parse("https://freadeax.github.io/Minecraft-Bauplaner/#/team/beitreten?raum=https%3A%2F%2Fbauplaner-team.team-room.workers.dev&id=r_abc_DEF-1&s=abc").orElseThrow();
        assertEquals("https://bauplaner-team.team-room.workers.dev", web.base());
        assertTrue(RoomLink.parse("https://x/#/team/beitreten?raum=http%3A%2F%2Fevil.example&id=r_1&s=k").isEmpty(), "nur https oder 127.0.0.1");
        assertTrue(RoomLink.parse("https://x/#/team/beitreten?raum=https%3A%2F%2Fa&id=r_1").isEmpty(), "ohne Serverschlüssel");
        assertNull(l.signKey());
    }

    @Test
    void takesTheSigningKeyOfTheBauleitung() {
        String key = io.github.freadeax.bauplaner.mod.team.EventSig.deriveKey("adminKeyForTests_0123456789abcdefXYZ");
        assertEquals(key, RoomLink.parse("https://x/#/team/beitreten?raum=https%3A%2F%2Fa&id=r_1&s=k&l=" + key).orElseThrow().signKey());
        assertNull(RoomLink.parse("https://x/#/team/beitreten?raum=https%3A%2F%2Fa&id=r_1&s=k&l=kurz").orElseThrow().signKey(), "ungültiger Schlüssel wird ignoriert");
        // As the mod builds it (RoomClient.Config.serverLink, EventSigTest.modLinkCarriesTheKey).
        assertEquals(key, RoomLink.parse("https://a/#/team/beitreten?raum=https%3A%2F%2Fa&id=r_test1234&s=s_srv&l=" + key).orElseThrow().signKey());
    }
}
