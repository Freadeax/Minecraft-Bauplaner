package io.github.freadeax.bauplaner.bridge.neoforge;

import io.github.freadeax.bauplaner.bridge.client.BridgeCommands;
import io.github.freadeax.bauplaner.bridge.client.ClientHost;
import io.github.freadeax.bauplaner.bridge.session.BridgeSession;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.loading.FMLPaths;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.RegisterClientCommandsEvent;
import net.neoforged.neoforge.common.NeoForge;

/**
 * NeoForge entry point (client only; on a dedicated server the mod is not loaded). Registers the
 * {@code /bauplaner} client commands and advances a running scan each client tick. Commands only read
 * the world and write files below {@code <game dir>/bauplaner/}.
 */
@Mod(value = BridgeNeoForge.MOD_ID, dist = Dist.CLIENT)
public final class BridgeNeoForge {
    public static final String MOD_ID = "bauplaner_bridge";

    private final BridgeSession session;

    public BridgeNeoForge(ModContainer container) {
        String version = container.getModInfo().getVersion().toString();
        session = new BridgeSession(FMLPaths.GAMEDIR.get().resolve("bauplaner"), new ClientHost("neoforge", version));
        NeoForge.EVENT_BUS.addListener((RegisterClientCommandsEvent e) -> BridgeCommands.register(e.getDispatcher(), session));
        NeoForge.EVENT_BUS.addListener((ClientTickEvent.Post e) -> session.tick(BridgeSession.CELLS_PER_TICK));
    }
}
