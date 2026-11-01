package io.github.freadeax.bauplaner.bridge.client;

import io.github.freadeax.bauplaner.bridge.BlockSource;
import io.github.freadeax.bauplaner.bridge.session.BridgeHost;
import net.minecraft.ChatFormatting;
import net.minecraft.SharedConstants;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;

/**
 * {@link BridgeHost} for the local player of a Minecraft 26.3 client. Uses only vanilla classes, so the
 * NeoForge and Forge adapters share it unchanged (both run with Mojang's names). Every
 * Minecraft-version-specific call of these adapters is here; porting to another version means
 * adjusting this class. Messages go to the player's own chat; nothing is sent to the server.
 */
public final class ClientHost implements BridgeHost {
    private final String loader;
    private final String modVersion;

    public ClientHost(String loader, String modVersion) {
        this.loader = loader;
        this.modVersion = modVersion;
    }

    private static Minecraft mc() { return Minecraft.getInstance(); }

    private static void chat(Component text) {
        var player = mc().player;
        if (player != null) player.sendSystemMessage(text);
    }

    @Override public void say(String text) { chat(Component.literal(text)); }

    @Override public void error(String text) { chat(Component.literal(text).withStyle(ChatFormatting.RED)); }

    @Override public void status(String text) {
        var player = mc().player;
        if (player != null) player.sendOverlayMessage(Component.literal(text));
    }

    @Override public boolean inWorld() { return mc().level != null && mc().player != null; }

    /** Server address in multiplayer, world name in singleplayer: the key for the stored anchor. */
    @Override public String worldKey() {
        Minecraft mc = mc();
        if (mc.getCurrentServer() != null) return "server:" + mc.getCurrentServer().ip;
        if (mc.getSingleplayerServer() != null) return "welt:" + mc.getSingleplayerServer().getWorldData().getLevelName();
        return "unbekannt";
    }

    @Override public String dimension() {
        ClientLevel level = mc().level;
        return level == null ? "" : level.dimension().identifier().toString();
    }

    /** Block under the crosshair, or the block below the player's feet. */
    @Override public int[] targetBlock() {
        Minecraft mc = mc();
        if (mc.player == null) return null;
        BlockPos pos = mc.hitResult instanceof BlockHitResult hit && hit.getType() == HitResult.Type.BLOCK
                ? hit.getBlockPos() : mc.player.blockPosition().below();
        return new int[] { pos.getX(), pos.getY(), pos.getZ() };
    }

    /** Read-only view on the blocks the client has loaded. Unloaded chunks are reported, never guessed. */
    @Override public BlockSource blocks(String dimension) {
        ClientLevel level = mc().level;
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        return (x, y, z) -> {
            if (level.isOutsideBuildHeight(y)) return "minecraft:air";
            if (!level.hasChunk(x >> 4, z >> 4)) return null;
            return BlockStateParser.serialize(level.getBlockState(pos.set(x, y, z)));
        };
    }

    @Override public int dataVersion() { return SharedConstants.getCurrentVersion().dataVersion().version(); }

    @Override public String gameVersion() { return SharedConstants.getCurrentVersion().name(); }

    @Override public String modVersion() { return modVersion; }

    @Override public String loader() { return loader; }

    @Override public String source() { return "client"; }
}
