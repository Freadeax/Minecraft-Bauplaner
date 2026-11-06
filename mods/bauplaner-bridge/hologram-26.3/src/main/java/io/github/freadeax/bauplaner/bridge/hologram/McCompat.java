package io.github.freadeax.bauplaner.bridge.hologram;

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
public final class McCompat {
    private McCompat() {}

    public static String gameVersion() { return SharedConstants.getCurrentVersion().name(); }

    public static int dataVersion() { return SharedConstants.getCurrentVersion().dataVersion().version(); }

    public static String dimension(ClientLevel level) { return level.dimension().identifier().toString(); }

    /** Server address in multiplayer, world name in singleplayer: the key for the stored anchor. */
    public static String worldKey(Minecraft mc) {
        if (mc.getCurrentServer() != null) return "server:" + mc.getCurrentServer().ip;
        if (mc.getSingleplayerServer() != null) return "welt:" + mc.getSingleplayerServer().getWorldData().getLevelName();
        return "unbekannt";
    }

    /**
     * Whether the client really holds this chunk. {@code hasChunk} is not enough: the client answers
     * unknown chunks with an empty placeholder chunk (found by the MAP-03 game test).
     */
    public static boolean loaded(net.minecraft.world.level.Level level, int cx, int cz) {
        if (!(level instanceof ClientLevel client)) return level.hasChunk(cx, cz);
        net.minecraft.world.level.chunk.LevelChunk c = client.getChunkSource().getChunk(cx, cz, net.minecraft.world.level.chunk.status.ChunkStatus.FULL, false);
        return c != null && !c.isEmpty();
    }

    /** Read-only view on the blocks the client has loaded. Unloaded chunks are reported, never guessed. */
    public static BlockSource clientBlocks(ClientLevel level) {
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        return (x, y, z) -> {
            if (level.isOutsideBuildHeight(y)) return "minecraft:air";
            if (!loaded(level, x >> 4, z >> 4)) return null;
            return BlockStateParser.serialize(level.getBlockState(pos.set(x, y, z)));
        };
    }

    /** States seen so far: the game keeps one object per block state, so the text form is built once. */
    private static final java.util.Map<net.minecraft.world.level.block.state.BlockState, io.github.freadeax.bauplaner.mod.BlockState> STATES = new java.util.IdentityHashMap<>();

    /** Read-only reader for the live check; {@code null} for blocks in chunks that are not loaded. */
    public static io.github.freadeax.bauplaner.mod.LiveCheck.WorldReader liveReader(ClientLevel level) {
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        return (x, y, z) -> {
            if (level.isOutsideBuildHeight(y)) return io.github.freadeax.bauplaner.mod.BlockState.AIR;
            if (!loaded(level, x >> 4, z >> 4)) return null;
            return modState(level.getBlockState(pos.set(x, y, z)));
        };
    }

    public static io.github.freadeax.bauplaner.mod.BlockState modState(net.minecraft.world.level.block.state.BlockState state) {
        return STATES.computeIfAbsent(state, s -> io.github.freadeax.bauplaner.mod.BlockState.parse(BlockStateParser.serialize(s)));
    }

    /** Display name of a block in the player's language ("Eichenholztreppe"); the id for unknown blocks. */
    public static String blockName(io.github.freadeax.bauplaner.mod.BlockState state) {
        if (state == null) return "?";
        var id = net.minecraft.resources.Identifier.tryParse(state.id());
        if (id == null) return state.id();
        return net.minecraft.core.registries.BuiltInRegistries.BLOCK.getOptional(id).map(b -> b.getName().getString()).orElse(state.id());
    }

    /** Block the player looks at (crosshair), or the block below the player's feet. */
    public static BlockPos targetBlock(Minecraft mc) {
        if (mc.hitResult instanceof net.minecraft.world.phys.BlockHitResult hit && hit.getType() == net.minecraft.world.phys.HitResult.Type.BLOCK) return hit.getBlockPos();
        return mc.player.blockPosition().below();
    }

    /**
     * Items of the open container screen without the player's own inventory (chest, barrel, shulker …), as item id →
     * count; null when no container is open. Read from what the server already sent to the client.
     */
    public static java.util.Map<String, Integer> openContainer(Minecraft mc) {
        if (!(mc.gui.screen() instanceof net.minecraft.client.gui.screens.inventory.AbstractContainerScreen<?> screen) || mc.player == null) return null;
        if (screen instanceof net.minecraft.client.gui.screens.inventory.InventoryScreen) return null;
        var out = new java.util.TreeMap<String, Integer>();
        for (var slot : screen.getMenu().slots) {
            if (slot.container instanceof net.minecraft.world.entity.player.Inventory) continue;
            var stack = slot.getItem();
            if (stack.isEmpty()) continue;
            out.merge(net.minecraft.core.registries.BuiltInRegistries.ITEM.getKey(stack.getItem()).toString(), stack.getCount(), Integer::sum);
        }
        return out;
    }

    private static long shadersCheckedAt;
    private static boolean shaders;

    /**
     * Whether an Iris shader pack is in use (Iris is optional; looked up by name, at most every half second).
     * Shader packs relight the textured ghosts, so the renderer adds a tint and edges then.
     */
    public static boolean shadersActive() {
        long now = System.nanoTime();
        if (now - shadersCheckedAt < 500_000_000L && shadersCheckedAt != 0) return shaders;
        shadersCheckedAt = now;
        try {
            Object api = Class.forName("net.irisshaders.iris.api.v0.IrisApi").getMethod("getInstance").invoke(null);
            shaders = (Boolean) api.getClass().getMethod("isShaderPackInUse").invoke(api);
        } catch (ReflectiveOperationException | RuntimeException | LinkageError e) {
            shaders = false;
        }
        return shaders;
    }

    /**
     * Items the player carries, including the contents of shulker boxes and bundles in the inventory
     * (read from the item data the client already has; nothing is opened or sent).
     */
    public static java.util.Map<net.minecraft.world.item.Item, Integer> carried(net.minecraft.world.entity.player.Player player) {
        var out = new java.util.HashMap<net.minecraft.world.item.Item, Integer>();
        var inv = player.getInventory();
        for (int i = 0; i < inv.getContainerSize(); i++) {
            var stack = inv.getItem(i);
            if (stack.isEmpty()) continue;
            out.merge(stack.getItem(), stack.getCount(), Integer::sum);
            var box = stack.get(net.minecraft.core.component.DataComponents.CONTAINER);
            if (box != null) box.nonEmptyItemCopyStream().forEach(s -> out.merge(s.getItem(), s.getCount(), Integer::sum));
            var bundle = stack.get(net.minecraft.core.component.DataComponents.BUNDLE_CONTENTS);
            if (bundle != null) bundle.itemCopies().forEach(s -> out.merge(s.getItem(), s.getCount(), Integer::sum));
        }
        return out;
    }

    private static net.minecraft.client.renderer.rendertype.RenderType xray;

    /**
     * Lines without depth test (X-ray): built once from the vanilla line pipeline with the depth test switched
     * off, the same way vanilla draws see-through name tags. Falls back to normal lines if the game refuses it.
     */
    public static net.minecraft.client.renderer.rendertype.RenderType xrayLines() {
        if (xray != null) return xray;
        try {
            var pipeline = com.mojang.renderpearl.api.pipeline.RenderPipeline.builder(net.minecraft.client.renderer.RenderPipelines.LINES_SNIPPET)
                    .withLocation(net.minecraft.resources.Identifier.fromNamespaceAndPath("bauplaner_bridge", "pipeline/lines_xray"))
                    .withColorTargetState(new com.mojang.renderpearl.api.pipeline.ColorTargetState(com.mojang.renderpearl.api.pipeline.BlendFunction.TRANSLUCENT))
                    .withDepthStencilState(java.util.Optional.empty())
                    .build();
            xray = net.minecraft.client.renderer.rendertype.RenderType.create("bauplaner_bridge_lines_xray",
                    net.minecraft.client.renderer.rendertype.RenderSetup.builder(pipeline).createRenderSetup());
        } catch (RuntimeException | LinkageError e) {
            xray = net.minecraft.client.renderer.rendertype.RenderTypes.lines();
        }
        return xray;
    }

    /**
     * A message of the mod for this player (GAME-12, 0.23.0): by default an animated card at the top right
     * ({@link Toasts}) instead of a chat line, so the chat stays free; {@code /bauplaner meldungen chat|beides}
     * brings the chat back. Red text is an error card, gold a warning, green a success. Lists the player asked
     * for (sections, groups, packing list …) use {@link #chatLine}. Every message is also written once to the
     * game log and kept for the command page.
     */
    public static void chat(Minecraft mc, Component text) {
        String plain = text.getString();
        CommandScreen.REPLIES.own(plain, System.currentTimeMillis());
        ClientSettings.Notices where = ClientSettings.notices();
        if (where != ClientSettings.Notices.CHAT) {
            String shown = plain.startsWith("[Build Studio] ") ? plain.substring("[Build Studio] ".length()) : plain;
            Toasts.post(kind(text, shown), shown);
        }
        if (where == ClientSettings.Notices.POPUP || mc.player == null) LOG.info(plain);
        else line(mc, text);
    }

    /** A line that belongs in the chat (lists and tables the player asked for); also in the log via the chat. */
    public static void chatLine(Minecraft mc, Component text) {
        CommandScreen.REPLIES.own(text.getString(), System.currentTimeMillis());
        if (mc.player == null) { LOG.info(text.getString()); return; }
        line(mc, text);
    }

    private static void line(Minecraft mc, Component text) {
        ownLine = true;
        try { mc.player.sendSystemMessage(text); } finally { ownLine = false; }
    }

    /** Words that make a plain message an error, a warning or a success card (both languages). */
    private static final java.util.regex.Pattern ERROR_WORDS = java.util.regex.Pattern.compile(
            "^(fehler|error)|fehlgeschlagen|failed|ungültig|invalid|gibt es nicht|does not exist|there is no|nicht lesbar|not readable|nicht möglich|not possible|nicht gefunden|not found|nicht übernommen|not accepted|unbekannt|unknown|belegt oder gesperrt|in use or blocked|darf(st)? das nicht|may not");
    private static final java.util.regex.Pattern WARN_START = java.util.regex.Pattern.compile(
            "(achtung|warning|hinweis|note|kein |keine |no |nothing|nichts|erst |first |zuerst|bitte|please|du bist (noch )?nicht|you are not|welche|which)");
    private static final java.util.regex.Pattern OK_WORDS = java.util.regex.Pattern.compile(
            "gespeichert|saved|zugelassen|allowed|erledigt|resolved|übernommen|taken|geschickt|sent|bestätigt|confirmed|fertig gemeldet|reported .*as done|verbunden|connected|platziert|placed");

    private static Toasts.Kind kind(Component text, String plain) {
        var color = text.getStyle().getColor();
        if (color != null) {
            int rgb = color.getValue();
            if (rgb == 0xFF5555 || rgb == 0xAA0000) return Toasts.Kind.ERROR;
            if (rgb == 0xFFAA00 || rgb == 0xFFFF55) return Toasts.Kind.WARN;
            if (rgb == 0x55FF55 || rgb == 0x00AA00) return Toasts.Kind.OK;
        }
        String l = plain.toLowerCase(java.util.Locale.ROOT);
        if (ERROR_WORDS.matcher(l).find()) return Toasts.Kind.ERROR;
        if (WARN_START.matcher(l).lookingAt()) return Toasts.Kind.WARN;
        if (OK_WORDS.matcher(l).find()) return Toasts.Kind.OK;
        return Toasts.Kind.INFO;
    }

    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger("bauplaner");

    /** A system line from the server (loader chat event): kept for the command page if it answers a command sent from there. */
    public static void serverLine(Component text) { if (!ownLine) CommandScreen.REPLIES.offer(text.getString(), System.currentTimeMillis()); }

    /** True while {@link #chat} writes: the loader event then reports the mod's own line, already in the log. */
    private static boolean ownLine;

    /** Short status line above the hotbar (key presses: immediate feedback where the player looks). */
    public static void overlay(Minecraft mc, Component text) { if (mc.player != null) mc.player.sendOverlayMessage(text); }

    /** A background notice (website, team room, Weltplan) as a card at the top right, never in the chat. */
    public static void notice(Minecraft mc, Toasts.Kind kind, String text) {
        CommandScreen.REPLIES.own("[Build Studio] " + text, System.currentTimeMillis());
        LOG.info("[Build Studio] " + text);
        Toasts.post(kind, text);
    }
}
