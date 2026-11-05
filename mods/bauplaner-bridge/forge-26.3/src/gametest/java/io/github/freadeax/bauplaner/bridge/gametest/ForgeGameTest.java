package io.github.freadeax.bauplaner.bridge.gametest;

import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.loading.FMLEnvironment;
import net.minecraftforge.fml.loading.FMLPaths;

/** Test-only mod: drives {@link ClientScenario} each client tick (scripts/mod/test_bridge_ingame_forge.sh forge). */
@Mod("bauplaner_bridge_gametest")
public final class ForgeGameTest {
    public ForgeGameTest() {
        if (FMLEnvironment.dist != Dist.CLIENT) return;
        ClientScenario scenario = new ClientScenario(FMLPaths.GAMEDIR.get());
        TickEvent.ClientTickEvent.Post.BUS.addListener(e -> scenario.tick());
    }
}
