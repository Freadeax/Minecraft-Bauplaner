package io.github.freadeax.bauplaner.bridge.neoforge;

import io.github.freadeax.bauplaner.bridge.client.BridgeCommands;
import io.github.freadeax.bauplaner.bridge.client.ClientHost;
import io.github.freadeax.bauplaner.bridge.hologram.HologramClient;
import io.github.freadeax.bauplaner.bridge.hologram.HologramKeys;
import io.github.freadeax.bauplaner.bridge.session.BridgeSession;
import net.minecraft.client.Minecraft;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.resources.Identifier;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.loading.FMLPaths;
import net.neoforged.neoforge.client.event.ClientPlayerNetworkEvent;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.InputEvent;
import net.neoforged.neoforge.client.event.RegisterClientCommandsEvent;
import net.neoforged.neoforge.client.event.RegisterGuiLayersEvent;
import net.neoforged.neoforge.client.event.RegisterKeyMappingsEvent;
import net.neoforged.neoforge.client.event.SubmitCustomGeometryEvent;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.level.ChunkEvent;

/**
 * NeoForge entry point (client only; on a dedicated server the mod is not loaded). Same client mod as on
 * Fabric: hologram with live check, HUD, keys, plan menu, material list, layers, placement helper and website link come
 * from {@code hologram-26.3}; this class only connects them to NeoForge's events. The recording commands
 * ({@code plan}, {@code anker}, {@code scan}) come from {@code client-26.3}. Nothing is sent to the server
 * except the player's own normal clicks.
 */
@Mod(value = BridgeNeoForge.MOD_ID, dist = Dist.CLIENT)
public final class BridgeNeoForge {
    public static final String MOD_ID = "bauplaner_bridge";

    private final BridgeSession session;
    private final HologramClient client;

    public BridgeNeoForge(ModContainer container) {
        String version = container.getModInfo().getVersion().toString();
        var root = FMLPaths.GAMEDIR.get().resolve("bauplaner");
        session = new BridgeSession(root, new ClientHost("neoforge", version));
        client = new HologramClient(root, "neoforge", version);

        var modBus = container.getEventBus();
        modBus.addListener((RegisterKeyMappingsEvent e) -> {
            e.registerCategory(HologramKeys.CATEGORY);
            client.keys().forEach(e::register);
        });
        // Teambau (COOP-03): optional payload for the team channel of the Paper plugin; servers without it are fine.
        // NeoForge 26.3 wants the client handler of a clientbound payload explicitly (otherwise the game stops at
        // load: "clientbound payloads are missing client-side handlers"). The server side ignores the payload:
        // the mod is client only, an integrated server never takes part in the team channel.
        modBus.addListener((net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent e) ->
                e.registrar("1").optional().playBidirectional(io.github.freadeax.bauplaner.bridge.hologram.TeamPayload.TYPE,
                        io.github.freadeax.bauplaner.bridge.hologram.TeamPayload.CODEC, (payload, ctx) -> { },
                        (payload, ctx) -> client.teamFrame(payload.data())));
        modBus.addListener((RegisterGuiLayersEvent e) ->
                e.registerAboveAll(Identifier.fromNamespaceAndPath(MOD_ID, "fortschritt"), client::hud));

        var bus = NeoForge.EVENT_BUS;
        bus.addListener((RegisterClientCommandsEvent e) -> {
            BridgeCommands.register(e.getDispatcher(), session);
            var root2 = net.minecraft.commands.Commands.literal("bauplaner");
            client.<CommandSourceStack>commands().forEach(root2::then);
            e.getDispatcher().register(root2);
        });
        bus.addListener((ClientTickEvent.Post e) -> {
            session.tick(BridgeSession.CELLS_PER_TICK);
            client.tick(Minecraft.getInstance());
        });
        bus.addListener((SubmitCustomGeometryEvent e) ->
                client.render(e.getPoseStack(), e.getSubmitNodeCollector(), e.getLevelRenderState().cameraRenderState.pos));
        // Website link (MAP-03): off until /bauplaner verbinden; resumes after a restart once switched on.
        bus.addListener((net.neoforged.neoforge.client.event.lifecycle.ClientStartedEvent e) -> client.started(e.getClient()));
        bus.addListener((net.neoforged.neoforge.event.GameShuttingDownEvent e) -> client.stopping());
        bus.addListener((ClientPlayerNetworkEvent.LoggingIn e) -> client.join(Minecraft.getInstance(), teamChannel));
        bus.addListener((ClientPlayerNetworkEvent.LoggingOut e) -> client.leave());
        // GAME-10: server answers to commands sent from the command page (system lines, not the action bar).
        bus.addListener((net.neoforged.neoforge.client.event.ClientChatReceivedEvent.System e) -> { if (!e.isOverlay()) io.github.freadeax.bauplaner.bridge.hologram.McCompat.serverLine(e.getMessage()); });
        bus.addListener((ChunkEvent.Unload e) -> {
            if (e.getLevel().isClientSide()) client.chunkUnloaded(e.getChunk().getPos().x(), e.getChunk().getPos().z());
        });
        // Placement helper: the key event fires in Minecraft.startUseItem/startAttack/continueAttack before
        // MultiPlayerGameMode sends anything. Cancelled = the click never happens (nothing placed, nothing sent).
        bus.addListener(this::click);
    }

    /** The team channel on NeoForge: the server announced it (minecraft:register from the plugin); NeoForge registers its side itself. */
    private final io.github.freadeax.bauplaner.mod.team.TeamSync.Transport teamChannel = new io.github.freadeax.bauplaner.mod.team.TeamSync.Transport() {
        @Override public boolean serverHasChannel() {
            var c = Minecraft.getInstance().getConnection();
            try { return c != null && net.neoforged.neoforge.network.registration.NetworkRegistry.hasChannel(c, io.github.freadeax.bauplaner.bridge.hologram.TeamPayload.TYPE.id()); }
            catch (RuntimeException e) { return false; }
        }
        @Override public void open() { }
        @Override public void send(byte[] frame) {
            net.neoforged.neoforge.client.network.ClientPacketDistributor.sendToServer(new io.github.freadeax.bauplaner.bridge.hologram.TeamPayload(frame));
        }
    };

    private void click(InputEvent.InteractionKeyMappingTriggered e) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.level == null) return;
        if (!(mc.hitResult instanceof BlockHitResult hit) || hit.getType() != HitResult.Type.BLOCK) return;
        InteractionResult r = InteractionResult.PASS;
        if (e.isUseItem()) r = client.use(mc.player, mc.level, e.getHand(), hit);
        else if (e.isAttack()) r = client.attack(mc.player, mc.level, hit.getBlockPos());
        if (r == InteractionResult.FAIL) {
            e.setSwingHand(false);
            e.setCanceled(true);
        }
    }
}
