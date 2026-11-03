package io.github.freadeax.bauplaner.bridge.paper;

import static io.github.freadeax.bauplaner.bridge.paper.StoreLedger.Action.BREAK;
import static io.github.freadeax.bauplaner.bridge.paper.StoreLedger.Action.DEPOSIT;
import static io.github.freadeax.bauplaner.bridge.paper.StoreLedger.Action.WITHDRAW;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import java.util.TreeMap;
import org.junit.jupiter.api.Test;

class StoreLedgerTest {
    private static TreeMap<String, Long> m(Object... kv) {
        TreeMap<String, Long> out = new TreeMap<>();
        for (int i = 0; i < kv.length; i += 2) out.put((String) kv[i], ((Number) kv[i + 1]).longValue());
        return out;
    }

    @Test
    void rightsMatrix() {
        // not in team (-1), gast 0, helfer 1, meister 2, leitung 3
        assertTrue(StoreLedger.allowed("offen", WITHDRAW, -1, false, false));
        assertFalse(StoreLedger.allowed("offen", BREAK, 1, false, false));
        assertTrue(StoreLedger.allowed("team", DEPOSIT, 0, false, false));
        assertFalse(StoreLedger.allowed("team", WITHDRAW, 0, false, false));
        assertTrue(StoreLedger.allowed("team", WITHDRAW, 1, false, false));
        assertFalse(StoreLedger.allowed("team", DEPOSIT, -1, false, false));
        assertFalse(StoreLedger.allowed("abschnitt", WITHDRAW, 1, false, false));
        assertTrue(StoreLedger.allowed("abschnitt", WITHDRAW, 1, true, false));
        assertTrue(StoreLedger.allowed("abschnitt", WITHDRAW, 2, false, false));
        assertTrue(StoreLedger.allowed("eingang", DEPOSIT, -1, false, false));
        assertFalse(StoreLedger.allowed("eingang", WITHDRAW, 1, true, false));
        assertFalse(StoreLedger.allowed("gesperrt", DEPOSIT, 1, true, false));
        assertFalse(StoreLedger.allowed("gesperrt", BREAK, 2, false, false));
        assertTrue(StoreLedger.allowed("gesperrt", BREAK, 3, false, false));
        assertTrue(StoreLedger.allowed("gesperrt", WITHDRAW, -1, false, true), "bauplaner.lager.verwalten darf alles");
        assertFalse(StoreLedger.allowed("unbekannt", WITHDRAW, 0, false, false), "unbekannte Stufe gilt als team");
    }

    @Test
    void diffAndSum() {
        var before = m("minecraft:stone", 64, "minecraft:oak_log", 10);
        var after = m("minecraft:stone", 76, "minecraft:dirt", 1);
        var d = StoreLedger.diff(before, after);
        assertEquals(m("minecraft:stone", 12, "minecraft:dirt", 1, "minecraft:oak_log", -10), d);
        assertEquals(after, StoreLedger.plus(before, d, 1));
        assertEquals(m("minecraft:stone", 12, "minecraft:dirt", 1), StoreLedger.positive(d));
        assertEquals(m("minecraft:oak_log", 10), StoreLedger.negativeAsPositive(d));
        assertEquals(StoreLedger.sha256(m("a:b", 1, "c:d", 2)), StoreLedger.sha256(Map.of("c:d", 2L, "a:b", 1L)));
        assertNotEquals(StoreLedger.sha256(m("a:b", 1)), StoreLedger.sha256(m("a:b", 2)));
        assertEquals(StoreLedger.sha256(m()), StoreLedger.sha256(m("a:b", 0)), "Nullzeilen zählen nicht");
        assertEquals("+12 stone, −10 oak_log, +1 dirt", StoreLedger.diffText(d, 5));
    }

    @Test
    void jsonLimitsAndAmounts() {
        TreeMap<String, Long> many = new TreeMap<>();
        for (int i = 0; i < 70; i++) many.put("minecraft:item_" + i, (long) i + 1);
        assertEquals(64, StoreLedger.json(many).size());
        assertTrue(StoreLedger.truncated(many));
        assertEquals("minecraft:item_69", StoreLedger.json(many).get(0).getAsJsonObject().get("item").getAsString());
        assertEquals(m("x:y", 5), StoreLedger.read(StoreLedger.json(m("x:y", 5)), "count"));
        assertEquals("3×64", StoreLedger.amount(192));
        assertEquals("2×64+5", StoreLedger.amount(133));
        assertEquals("−70", StoreLedger.amount(-70));
        assertEquals("eingang", StoreLedger.protection("ein").orElseThrow());
        assertEquals("rest", StoreLedger.purpose("r").orElseThrow());
    }
}
