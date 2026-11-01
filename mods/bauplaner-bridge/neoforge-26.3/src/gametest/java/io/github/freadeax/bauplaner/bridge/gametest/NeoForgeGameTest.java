package io.github.freadeax.bauplaner.bridge.gametest;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.loading.FMLPaths;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.common.NeoForge;

/** Test-only mod: drives {@link ClientScenario} each client tick (scripts/test_bridge_ingame.sh neoforge). */
@Mod(value = "bauplaner_bridge_gametest", dist = Dist.CLIENT)
public final class NeoForgeGameTest {
    public NeoForgeGameTest() {
        ClientScenario scenario = new ClientScenario(FMLPaths.GAMEDIR.get());
        NeoForge.EVENT_BUS.addListener((ClientTickEvent.Post e) -> scenario.tick());
    }
}
