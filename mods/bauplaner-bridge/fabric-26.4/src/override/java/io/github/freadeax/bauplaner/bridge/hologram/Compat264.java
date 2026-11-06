package io.github.freadeax.bauplaner.bridge.hologram;

import com.mojang.blaze3d.pipeline.RenderPipeline;
import com.mojang.renderpearl.api.pipeline.BlendFunction;
import com.mojang.renderpearl.api.pipeline.ColorTargetState;
import com.mojang.renderpearl.api.pipeline.CompareOp;
import com.mojang.renderpearl.api.pipeline.DepthStencilState;
import net.minecraft.client.renderer.pipeline.RenderPipelines;
import net.minecraft.client.renderer.pipeline.variant.LineRenderPipelineVariant;

/**
 * Only in the Minecraft 26.4 adapter: what 26.4 builds differently from 26.3. McCompat (shared with 26.3)
 * calls it through the replacements in fabric-26.4/compat-26.4.gradle.
 */
final class Compat264 {
    private Compat264() {}

    /**
     * Lines without depth test (X-ray). 26.4 builds line pipelines from a variant (colour target and depth state)
     * instead of a snippet; this variant blends like translucent lines and always passes the depth test.
     * Not part of order-independent transparency, so it keeps drawing over the world like in 26.3.
     */
    static RenderPipeline xrayPipeline() {
        var variant = new LineRenderPipelineVariant("bauplaner_bridge_lines_xray", new ColorTargetState(BlendFunction.TRANSLUCENT),
                new DepthStencilState(CompareOp.ALWAYS_PASS, false), false);
        return RenderPipelines.lines(new RenderPipelines.LinesParameters(variant, null));
    }
}
