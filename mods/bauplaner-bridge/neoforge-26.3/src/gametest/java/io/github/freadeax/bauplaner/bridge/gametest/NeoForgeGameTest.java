package io.github.freadeax.bauplaner.bridge.gametest;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.EventPriority;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.loading.FMLPaths;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.InputEvent;
import net.neoforged.neoforge.common.NeoForge;

/**
 * Test-only mod: drives {@link ClientScenario} each client tick (scripts/test_bridge_ingame_forge.sh neoforge),
 * followed by the client mod's hologram and placement helper ({@link HologramScenario}) and the website link ({@link LiveLinkScenario}).
 */
@Mod(value = "bauplaner_bridge_gametest", dist = Dist.CLIENT)
public final class NeoForgeGameTest {
    public NeoForgeGameTest() {
        ClientScenario scenario = new ClientScenario(FMLPaths.GAMEDIR.get(), s -> {
            var steps = new java.util.ArrayList<>(HologramScenario.steps(s));
            steps.addAll(LiveLinkScenario.steps(s));
            return steps;
        });
        NeoForge.EVENT_BUS.addListener((ClientTickEvent.Post e) -> scenario.tick());
        // Last in line and also for cancelled events: records whether the mod dropped the click.
        NeoForge.EVENT_BUS.addListener(EventPriority.LOWEST, true, InputEvent.InteractionKeyMappingTriggered.class,
                e -> HologramScenario.lastClickCancelled = e.isCanceled());
    }
}
