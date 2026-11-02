package io.github.freadeax.bauplaner.bridge.hologram;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import net.minecraft.client.Minecraft;
import net.minecraft.client.model.geom.builders.UVPair;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.client.resources.model.geometry.BakedQuad;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.RenderShape;
import net.minecraft.world.level.block.state.BlockState;
import org.joml.Vector3fc;

/**
 * The game's own block models for planned states, drawn see-through as ghost blocks. Only vanilla model
 * data (quads, UVs from the block atlas), so resource packs apply and no textures ship with the mod.
 * Blocks without a model (chests, signs, banners … drawn by block entity renderers) and unknown mod
 * blocks fall back to the coloured box.
 */
public final class GhostModels {
    /** Quads of one state plus whether it hides the faces of a neighbouring ghost block. */
    record Model(List<BakedQuad> quads, int[] tints, boolean fullCube) {}

    private final Map<io.github.freadeax.bauplaner.mod.BlockState, Model> cache = new HashMap<>();
    private final RandomSource random = RandomSource.create(42);
    private Object modelSet;

    /** Model for a planned state, or null when the box should be drawn instead. */
    Model model(io.github.freadeax.bauplaner.mod.BlockState planned) {
        Minecraft mc = Minecraft.getInstance();
        var set = mc.getModelManager().getBlockStateModelSet();
        if (set != modelSet) { cache.clear(); modelSet = set; } // resource pack reload
        return cache.computeIfAbsent(planned, p -> build(mc, p));
    }

    private Model build(Minecraft mc, io.github.freadeax.bauplaner.mod.BlockState planned) {
        BlockState state;
        try {
            state = BlockStateParser.parseForBlock(BuiltInRegistries.BLOCK, planned.toString(), false).blockState();
        } catch (Exception e) {
            return null;
        }
        if (state.getRenderShape() != RenderShape.MODEL) return null;
        var parts = new ArrayList<net.minecraft.client.renderer.block.dispatch.BlockStateModelPart>();
        random.setSeed(42);
        mc.getModelManager().getBlockStateModelSet().get(state).collectParts(random, parts);
        List<BakedQuad> quads = new ArrayList<>();
        for (var part : parts) {
            quads.addAll(part.getQuads(null));
            for (Direction d : Direction.values()) quads.addAll(part.getQuads(d));
        }
        if (quads.isEmpty()) return null;
        int[] tints = new int[quads.size()];
        var colors = mc.getBlockColors();
        for (int i = 0; i < tints.length; i++) {
            var info = quads.get(i).materialInfo();
            int color = 0xFFFFFF;
            if (info.isTinted()) {
                var source = colors.getTintSource(state, info.tintIndex());
                color = source == null ? 0xFFFFFF : source.color(state) & 0xFFFFFF;
            }
            tints[i] = color;
        }
        return new Model(quads, tints, state.isSolidRender());
    }

    /** Emit one ghost block at x/y/z (camera-relative), alpha 0–255, cool tint so it reads as "planned". */
    static void emit(PoseStack.Pose pose, VertexConsumer vc, Model m, float x, float y, float z, int alpha, int skipFaces) {
        List<BakedQuad> quads = m.quads();
        for (int q = 0; q < quads.size(); q++) {
            BakedQuad quad = quads.get(q);
            Direction dir = quad.direction();
            if (skipFaces != 0 && (skipFaces & (1 << dir.ordinal())) != 0 && touchesFace(quad, dir)) continue;
            int tint = m.tints()[q];
            // Cool blue cast: clearly "planned", textures stay recognisable.
            int r = ((tint >> 16) & 0xFF) * 150 / 255, g = ((tint >> 8) & 0xFF) * 190 / 255, b = tint & 0xFF;
            int color = (alpha << 24) | (r << 16) | (g << 8) | b;
            float nx = dir.getStepX(), ny = dir.getStepY(), nz = dir.getStepZ();
            for (int v = 0; v < 4; v++) {
                Vector3fc p = quad.position(v);
                long uv = quad.packedUV(v);
                vc.addVertex(pose, x + p.x(), y + p.y(), z + p.z()).setColor(color).setUv(UVPair.unpackU(uv), UVPair.unpackV(uv))
                        .setOverlay(OverlayTexture.NO_OVERLAY).setLight(0xF000F0).setNormal(pose, nx, ny, nz);
            }
        }
    }

    /** Only quads lying on the block face are hidden by a neighbour (not inner details like a door's frame). */
    private static boolean touchesFace(BakedQuad quad, Direction dir) {
        for (int v = 0; v < 4; v++) {
            Vector3fc p = quad.position(v);
            float c = switch (dir.getAxis()) { case X -> p.x(); case Y -> p.y(); case Z -> p.z(); };
            float edge = dir.getAxisDirection() == Direction.AxisDirection.POSITIVE ? 1f : 0f;
            if (Math.abs(c - edge) > 1e-4f) return false;
        }
        return true;
    }
}
