package io.github.freadeax.bauplaner.bridge.fabric;

import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;

/**
 * Keys of the mod, changeable under Options → Controls → "Bauplaner". Arrow keys move the plan
 * relative to the view direction, so "up" always means "away from me". Key codes are InputConstants
 * constants (SDL scancodes since 26.x, not GLFW codes).
 */
final class HologramKeys {
    private static final KeyMapping.Category CATEGORY = KeyMapping.Category.register(Identifier.fromNamespaceAndPath("bauplaner_bridge", "bauplaner"));

    private final Hologram hologram;
    private final KeyMapping menu = key("menu", InputConstants.KEY_J);
    private final KeyMapping toggle = key("toggle", InputConstants.KEY_COMMA);
    private final KeyMapping finder = key("finder", InputConstants.KEY_PERIOD);
    private final KeyMapping forward = key("forward", InputConstants.KEY_UP);
    private final KeyMapping back = key("back", InputConstants.KEY_DOWN);
    private final KeyMapping left = key("left", InputConstants.KEY_LEFT);
    private final KeyMapping right = key("right", InputConstants.KEY_RIGHT);
    private final KeyMapping up = key("up", InputConstants.KEY_PAGEUP);
    private final KeyMapping down = key("down", InputConstants.KEY_PAGEDOWN);
    private final KeyMapping turn = key("turn", InputConstants.KEY_END);
    private final KeyMapping here = key("here", InputConstants.KEY_HOME);
    private final KeyMapping mirror = key("mirror", InputConstants.KEY_INSERT);

    HologramKeys(Hologram hologram) { this.hologram = hologram; }

    private static KeyMapping key(String name, int code) {
        return KeyMappingHelper.registerKeyMapping(new KeyMapping("key.bauplaner_bridge." + name, InputConstants.Type.KEYBOARD, code, CATEGORY));
    }

    void tick(Minecraft mc) {
        if (mc.player == null) return;
        while (menu.consumeClick()) PlanScreen.open(mc, hologram);
        boolean active = hologram.active();
        while (toggle.consumeClick()) if (active) { hologram.toggleVisible(); overlay(mc, hologram.visible() ? "Plan eingeblendet" : "Plan ausgeblendet"); }
        while (finder.consumeClick()) {
            if (!active) continue;
            int i = hologram.findNext(mc.player.getX(), mc.player.getY(), mc.player.getZ());
            overlay(mc, i < 0 ? "Keine Fehler in geladenen Chunks – alles richtig!" : "Fehler markiert (violetter Rahmen)");
        }
        Direction facing = mc.player.getDirection();
        Direction side = facing.getClockWise();
        while (forward.consumeClick()) move(mc, facing.getStepX(), 0, facing.getStepZ());
        while (back.consumeClick()) move(mc, -facing.getStepX(), 0, -facing.getStepZ());
        while (right.consumeClick()) move(mc, side.getStepX(), 0, side.getStepZ());
        while (left.consumeClick()) move(mc, -side.getStepX(), 0, -side.getStepZ());
        while (up.consumeClick()) move(mc, 0, 1, 0);
        while (down.consumeClick()) move(mc, 0, -1, 0);
        while (turn.consumeClick()) if (active) { hologram.turn(1); overlay(mc, "Gedreht: " + hologram.check().placement().turns() * 90 + "°"); }
        while (mirror.consumeClick()) if (active) { hologram.mirror(); overlay(mc, hologram.check().placement().mirror() ? "Gespiegelt" : "Nicht gespiegelt"); }
        while (here.consumeClick()) if (active) { hologram.moveTo(McCompat.targetBlock(mc)); overlay(mc, "Plan zum angeschauten Block verschoben"); }
    }

    private void move(Minecraft mc, int dx, int dy, int dz) {
        if (!hologram.active()) return;
        hologram.move(dx, dy, dz);
        var p = hologram.check().placement();
        overlay(mc, "Ursprung " + p.x() + " " + p.y() + " " + p.z());
    }

    private static void overlay(Minecraft mc, String text) { McCompat.overlay(mc, Component.literal(text)); }
}
