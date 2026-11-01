package io.github.freadeax.bauplaner.bridge.forge;

import io.github.freadeax.bauplaner.bridge.client.BridgeCommands;
import io.github.freadeax.bauplaner.bridge.client.ClientHost;
import io.github.freadeax.bauplaner.bridge.session.BridgeSession;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RegisterClientCommandsEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import net.minecraftforge.fml.loading.FMLEnvironment;
import net.minecraftforge.fml.loading.FMLPaths;

/**
 * Forge entry point. Client only: on a dedicated server the mod does nothing. Registers the
 * {@code /bauplaner} client commands and advances a running scan each client tick. Commands only read
 * the world and write files below {@code <game dir>/bauplaner/}.
 */
@Mod(BridgeForge.MOD_ID)
public final class BridgeForge {
    public static final String MOD_ID = "bauplaner_bridge";

    public BridgeForge(FMLJavaModLoadingContext context) {
        if (FMLEnvironment.dist != Dist.CLIENT) return;
        String version = context.getContainer().getModInfo().getVersion().toString();
        Client.start(version);
    }

    /** Separate class so a dedicated server never loads client classes. */
    private static final class Client {
        static void start(String version) {
            BridgeSession session = new BridgeSession(FMLPaths.GAMEDIR.get().resolve("bauplaner"), new ClientHost("forge", version));
            RegisterClientCommandsEvent.BUS.addListener(e -> BridgeCommands.register(e.getDispatcher(), session));
            TickEvent.ClientTickEvent.Post.BUS.addListener(e -> session.tick(BridgeSession.CELLS_PER_TICK));
        }
    }
}
