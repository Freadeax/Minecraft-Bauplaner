package io.github.freadeax.bauplaner.bridge.hologram;

import java.util.List;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;

/**
 * One look for every panel of the mod on the game screen (GAME-12, 0.23.0): dark card with a coloured edge,
 * same padding and line height as the message cards ({@link Toasts}). Panels at the bottom right are
 * stacked from the hotbar upwards, so the team panel and the Weltplan panel never cover each other.
 */
final class HudCard {
    private HudCard() {}

    static final int PAD = 4;
    /** UI-03 "Werkbank" colours, the same as the planner (docs/architecture/planer/UI.md). */
    static final int ACCENT = 0xFF7FD494, GOLD = 0xFFE9C46A, TEXT = 0xFFEDF3EE, MUTED = 0xFFA9B8AE, DIM = 0xFF77877D,
            WARN = 0xFFF0B45A, ERROR = 0xFFFF8A7A, INFO = 0xFF8CC8F0, SURFACE = 0xE61A2220, BACKGROUND = 0xE6111715;
    static final int BG_TOP = 0xDC1A2220, BG_BOTTOM = 0xDC111715, EDGE = 0x42000000;

    /** Next free row from the bottom for panels at the bottom right; reset every frame. */
    private static int bottom;

    /** Lowest row used at the top right (message cards, build panel): panels at the bottom right never go above it. */
    private static int ceiling;

    static void frame(GuiGraphicsExtractor g) { bottom = g.guiHeight() - 40; ceiling = 0; }

    static void ceiling(int y) { ceiling = Math.max(ceiling, y); }

    static int ceiling() { return ceiling; }

    static int line(Font font) { return font.lineHeight + 2; }

    /** Card background at x/y with this inner size and an accent colour on the left edge. */
    static void back(GuiGraphicsExtractor g, int x, int y, int w, int h, int accent) {
        g.fillGradient(x - PAD, y - PAD, x + w + PAD, y + h + PAD - 2, BG_TOP, BG_BOTTOM);
        g.fill(x - PAD, y + h + PAD - 4, x + w + PAD, y + h + PAD - 2, EDGE); // dark bottom edge, like a block
        g.fill(x - PAD, y - PAD, x - PAD + 2, y + h + PAD - 2, accent);
    }

    /** UI-03 overline: small accent square, then the label in capitals. Returns the width drawn. */
    static int overline(GuiGraphicsExtractor g, Font font, String label, int x, int y, int accent) {
        g.fill(x, y + 2, x + 4, y + 6, accent);
        String up = label.toUpperCase(java.util.Locale.ROOT);
        g.text(font, up, x + 7, y, MUTED, false);
        return 7 + font.width(up);
    }

    /** Rows {text, colour} as a card at the bottom right, above the cards drawn before in this frame. */
    static void bottomRight(GuiGraphicsExtractor g, Font font, List<String[]> rows, int accent) {
        if (rows.isEmpty()) return;
        int line = line(font), w = 0, max = Math.max(120, g.guiWidth() / 2 - 20);
        for (String[] r : rows) w = Math.max(w, Math.min(max, font.width(r[0])));
        // Small windows: drop the first rows rather than covering the build panel or the message cards.
        int fit = Math.max(0, (bottom - PAD - ceiling - 4) / line);
        if (fit == 0) return;
        if (rows.size() > fit) rows = rows.subList(0, fit);
        int h = rows.size() * line;
        int x = g.guiWidth() - w - 6 - PAD, y = bottom - h;
        back(g, x, y, w, h, accent);
        for (String[] r : rows) { g.text(font, fit(font, r[0], w), x, y, (int) Long.parseLong(r[1], 16), true); y += line; }
        bottom -= h + 2 * PAD + 4;
    }

    static String fit(Font font, String s, int w) { return font.width(s) <= w ? s : font.plainSubstrByWidth(s, Math.max(0, w - font.width("…"))) + "…"; }
}
