package io.github.freadeax.bauplaner.bridge.hologram;

import static io.github.freadeax.bauplaner.mod.Lang.t;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;

/**
 * Questions instead of commands (LINK-03, docs/architecture/team/AUTO_LINK.md): a planner waits for "Zulassen", or the
 * server offers the Build Studio plugin and the player has not allowed the team channel yet. A banner at the top of
 * the screen says "J drücken"; the J menu shows the two buttons. Nothing is sent before the click.
 */
final class LinkPrompt {
    private LinkPrompt() { }

    enum Kind { PLANER, TEAM }

    record Question(Kind kind, String text, String yes, String no) {}

    static Question current(HologramClient c) {
        if (c == null) return null;
        String device = c.link().pendingAsk();
        if (device != null) return new Question(Kind.PLANER, t("Der Planer („" + device + "“) möchte sich mit dem Spiel verbinden.", "The planner (“" + device + "”) wants to connect to the game."),
                t("Planer zulassen", "Allow planner"), t("Ablehnen", "Deny"));
        if (c.team().sync().asking()) return new Question(Kind.TEAM, t("Dieser Server hat das Build-Studio-Plugin. Teambau und Server-Kopplung erlauben?", "This server has the Build Studio plugin. Allow team building and the server link?"),
                t("Teambau erlauben", "Allow team building"), t("Nein", "No"));
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

    /**
     * Card at the top right while no screen is open, below the build panel and above the message cards (0.25.0:
     * before, a banner in the middle of the top edge covered the build panel in small windows).
     */
    static void hud(GuiGraphicsExtractor g, HologramClient c) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.gui.screen() != null) return;
        long now = System.currentTimeMillis();
        if (now - cachedAt > 500) { cached = current(c); cachedAt = now; }
        Question q = cached;
        if (q == null) return;
        String text = (q.kind() == Kind.PLANER ? t("Planer möchte sich verbinden", "Planner wants to connect") : t("Server-Plugin gefunden", "Server plugin found")) + t(" – J drücken", " – press J");
        var font = mc.font;
        int max = Math.max(120, Math.min(200, g.guiWidth() * 2 / 5)) - 2 * HudCard.PAD;
        java.util.List<String> lines = Toasts.wrap(font, text, max);
        int line = HudCard.line(font), w = 0;
        for (String l : lines) w = Math.max(w, font.width(l));
        int h = lines.size() * line;
        int x = g.guiWidth() - w - 6 - HudCard.PAD, y = Math.max(6, HudCard.ceiling() + 4 + HudCard.PAD);
        HudCard.back(g, x, y, w, h, HudCard.GOLD);
        HudLayout.note("Frage", x - HudCard.PAD, y - HudCard.PAD, x + w + HudCard.PAD, y + h + HudCard.PAD - 2);
        for (String l : lines) { g.text(font, l, x, y, HudCard.GOLD, true); y += line; }
        HudCard.ceiling(y + HudCard.PAD);
    }
}
