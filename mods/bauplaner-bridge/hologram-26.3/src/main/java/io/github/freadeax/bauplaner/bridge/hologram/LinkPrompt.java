package io.github.freadeax.bauplaner.bridge.hologram;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;

/**
 * Questions instead of commands (LINK-03, docs/architecture/AUTO_LINK.md): a planner waits for "Zulassen", or the
 * server offers the Bauplaner plugin and the player has not allowed the team channel yet. A banner at the top of
 * the screen says "J drücken"; the J menu shows the two buttons. Nothing is sent before the click.
 */
final class LinkPrompt {
    private LinkPrompt() { }

    enum Kind { PLANER, TEAM }

    record Question(Kind kind, String text, String yes, String no) {}

    static Question current(HologramClient c) {
        if (c == null) return null;
        String device = c.link().pendingAsk();
        if (device != null) return new Question(Kind.PLANER, "Der Planer („" + device + "“) möchte sich mit dem Spiel verbinden.", "Planer zulassen", "Ablehnen");
        if (c.team().sync().asking()) return new Question(Kind.TEAM, "Dieser Server hat das Bauplaner-Plugin. Teambau und Server-Kopplung erlauben?", "Teambau erlauben", "Nein");
        return null;
    }

    /** Answers a question; returns the text for the menu. */
    static String answer(HologramClient c, Kind kind, boolean yes) {
        return switch (kind) {
            case PLANER -> yes ? c.link().approve() : c.link().deny();
            case TEAM -> c.team().sync().allow(yes);
        };
    }

    private static Question cached;
    private static long cachedAt;

    /** Banner at the top while no screen is open. */
    static void hud(GuiGraphicsExtractor g, HologramClient c) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.gui.screen() != null) return;
        long now = System.currentTimeMillis();
        if (now - cachedAt > 500) { cached = current(c); cachedAt = now; }
        Question q = cached;
        if (q == null) return;
        String text = "Bauplaner: " + (q.kind() == Kind.PLANER ? "Planer möchte sich verbinden" : "Server-Plugin gefunden") + " – J drücken";
        int w = mc.font.width(text), x = (g.guiWidth() - w) / 2, y = 6;
        g.fill(x - 4, y - 3, x + w + 4, y + mc.font.lineHeight + 2, 0xB0000000);
        g.text(mc.font, text, x, y, 0xFFFFD54A, true);
    }
}
