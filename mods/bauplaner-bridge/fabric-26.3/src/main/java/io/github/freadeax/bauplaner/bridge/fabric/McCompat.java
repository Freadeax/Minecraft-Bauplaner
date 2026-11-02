package io.github.freadeax.bauplaner.bridge.fabric;

import io.github.freadeax.bauplaner.bridge.BlockSource;
import net.minecraft.SharedConstants;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;

/**
 * Every Minecraft-version-specific call of the adapter in one place. Porting to another
 * Minecraft version means adjusting this class (and the build properties), nothing else.
 */
final class McCompat {
    private McCompat() {}

    static String gameVersion() { return SharedConstants.getCurrentVersion().name(); }

    static int dataVersion() { return SharedConstants.getCurrentVersion().dataVersion().version(); }

    static String dimension(ClientLevel level) { return level.dimension().identifier().toString(); }

    /** Server address in multiplayer, world name in singleplayer: the key for the stored anchor. */
    static String worldKey(Minecraft mc) {
        if (mc.getCurrentServer() != null) return "server:" + mc.getCurrentServer().ip;
        if (mc.getSingleplayerServer() != null) return "welt:" + mc.getSingleplayerServer().getWorldData().getLevelName();
        return "unbekannt";
    }

    /** Read-only view on the blocks the client has loaded. Unloaded chunks are reported, never guessed. */
    static BlockSource clientBlocks(ClientLevel level) {
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        return (x, y, z) -> {
            if (level.isOutsideBuildHeight(y)) return "minecraft:air";
            if (!level.hasChunk(x >> 4, z >> 4)) return null;
            return BlockStateParser.serialize(level.getBlockState(pos.set(x, y, z)));
        };
    }

    /** States seen so far: the game keeps one object per block state, so the text form is built once. */
    private static final java.util.Map<net.minecraft.world.level.block.state.BlockState, io.github.freadeax.bauplaner.mod.BlockState> STATES = new java.util.IdentityHashMap<>();

    /** Read-only reader for the live check; {@code null} for blocks in chunks that are not loaded. */
    static io.github.freadeax.bauplaner.mod.LiveCheck.WorldReader liveReader(ClientLevel level) {
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        return (x, y, z) -> {
            if (level.isOutsideBuildHeight(y)) return io.github.freadeax.bauplaner.mod.BlockState.AIR;
            if (!level.hasChunk(x >> 4, z >> 4)) return null;
            return modState(level.getBlockState(pos.set(x, y, z)));
        };
    }

    static io.github.freadeax.bauplaner.mod.BlockState modState(net.minecraft.world.level.block.state.BlockState state) {
        return STATES.computeIfAbsent(state, s -> io.github.freadeax.bauplaner.mod.BlockState.parse(BlockStateParser.serialize(s)));
    }

    /** Display name of a block in the player's language ("Eichenholztreppe"); the id for unknown blocks. */
    static String blockName(io.github.freadeax.bauplaner.mod.BlockState state) {
        if (state == null) return "?";
        var id = net.minecraft.resources.Identifier.tryParse(state.id());
        if (id == null) return state.id();
        return net.minecraft.core.registries.BuiltInRegistries.BLOCK.getOptional(id).map(b -> b.getName().getString()).orElse(state.id());
    }

    /** Block the player looks at (crosshair), or the block below the player's feet. */
    static BlockPos targetBlock(Minecraft mc) {
        if (mc.hitResult instanceof net.minecraft.world.phys.BlockHitResult hit && hit.getType() == net.minecraft.world.phys.HitResult.Type.BLOCK) return hit.getBlockPos();
        return mc.player.blockPosition().below();
    }

    /** Message in the chat, only visible to this player. */
    static void chat(Minecraft mc, Component text) { if (mc.player != null) mc.player.sendSystemMessage(text); }

    /** Short status line above the hotbar. */
    static void overlay(Minecraft mc, Component text) { if (mc.player != null) mc.player.sendOverlayMessage(text); }
}
