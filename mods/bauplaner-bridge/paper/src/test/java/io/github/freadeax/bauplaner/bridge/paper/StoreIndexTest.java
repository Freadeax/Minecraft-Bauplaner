package io.github.freadeax.bauplaner.bridge.paper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.util.TreeMap;
import org.junit.jupiter.api.Test;

class StoreIndexTest {
    private static JsonObject e(String json) { return JsonParser.parseString(json).getAsJsonObject(); }

    @Test
    void markCountMoveCheckSeal() {
        StoreIndex idx = new StoreIndex();
        assertNull(idx.apply(e("{kind:'store.chest',chest:'c1',name:'Stein Nord',pos:[10,64,-3],dimension:'minecraft:overworld',at:'t1',by:'m'}")));
        assertNull(idx.apply(e("{kind:'store.config',chest:'c1',section:'sec_roh',purpose:'eingang',pos2:[11,64,-3],at:'t2',by:'m'}")));
        StoreIndex.Store s = idx.get("c1");
        assertEquals("eingang", s.protectionOr("team"), "Zweck Eingang wählt die Schutzstufe Eingang");
        assertTrue(s.at("minecraft:overworld", 11, 64, -3));
        assertEquals("ungeprueft", s.status);
        idx.apply(e("{kind:'store.count',chest:'c1',items:[{item:'minecraft:stone',count:64}],at:'t3'}"));
        idx.apply(e("{kind:'store.move',chest:'c1',in:[{item:'minecraft:stone',count:10}],out:[{item:'minecraft:stone',count:2}],via:'spieler',at:'t4',by:'anna'}"));
        assertEquals(72L, s.expected.get("minecraft:stone"));
        assertEquals(10L, s.in.get("anna").get("minecraft:stone"));
        idx.apply(e("{kind:'store.check',chest:'c1',status:'geprueft',at:'t5'}"));
        assertEquals("geprueft", s.status);
        // Somebody filled the chest without booking (other plugin, /item): deviation stays until a seal.
        idx.apply(e("{kind:'store.check',chest:'c1',status:'abweichend',diff:[{item:'minecraft:dirt',delta:5}],at:'t6'}"));
        idx.apply(e("{kind:'store.count',chest:'c1',items:[{item:'minecraft:stone',count:72},{item:'minecraft:dirt',count:5}],at:'t6b'}"));
        idx.apply(e("{kind:'store.check',chest:'c1',status:'geprueft',at:'t7'}"));
        assertEquals("abweichend", s.status);
        assertEquals(5L, s.deviation.get("minecraft:dirt"));
        idx.apply(e("{kind:'store.seal',chest:'c1',sha256:'x',at:'t8',by:'ben'}"));
        assertEquals("geprueft", s.status);
        assertTrue(s.deviation.isEmpty());
        assertEquals("ben", s.sealedBy);
        idx.apply(e("{kind:'store.check',chest:'c1',status:'fehlt',at:'t9'}"));
        assertEquals("fehlt", s.status);
        idx.apply(e("{kind:'store.chest',chest:'c1',remove:true,at:'t10',by:'m'}"));
        assertFalse(s.at("minecraft:overworld", 10, 64, -3));
        assertEquals("Unbekannte Lagerkiste c9.", idx.apply(e("{kind:'store.count',chest:'c9',items:[],at:'t11'}")));
    }

    @Test
    void hopperMovesHaveTheirOwnAccount() {
        StoreIndex idx = new StoreIndex();
        idx.apply(e("{kind:'store.chest',chest:'c',pos:[0,0,0],at:'1',by:'m'}"));
        idx.apply(e("{kind:'store.move',chest:'c',in:[{item:'minecraft:iron_ingot',count:3}],via:'trichter',at:'2',by:'server'}"));
        assertEquals(new TreeMap<>(java.util.Map.of("minecraft:iron_ingot", 3L)), idx.get("c").in.get("trichter"));
        assertNull(idx.get("c").expected, "ohne Zählung kein Sollstand");
    }
}
