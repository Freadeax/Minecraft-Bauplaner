package io.github.freadeax.bauplaner.bridge.hologram;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;

/**
 * Animated messages at the top right (GAME-12, 0.23.0) instead of chat lines: a card slides in from the right
 * edge, shows a thin bar with the time left and slides out again. Errors shake once and stay longer.
 * The same text again while it is shown only counts up („×3“), so a repeating message never floods the
 * screen; at most {@link #MAX} cards at once, the oldest leaves early. Thread safe: background threads
 * (website link, team room) may post.
 */
public final class Toasts {
    public enum Kind {
        INFO(HudCard.INFO, "i"), OK(HudCard.ACCENT, "✔"), WARN(HudCard.WARN, "!"), ERROR(HudCard.ERROR, "✖");
        final int color;
        final String icon;
        Kind(int color, String icon) { this.color = color; this.icon = icon; }
    }

    static final int MAX = 3, GAP = 4, TOP = 6, PAD = 5;
    private static final long IN = 200, OUT = 240; // UI-03: animations 120–240 ms

    private static final class Card {
        final String text;
        final Kind kind;
        long born, life;
        int count = 1;
        float y = Float.NaN;
        long leaving = -1;
        Card(String text, Kind kind, long now) {
            this.text = text;
            this.kind = kind;
            this.born = now;
            this.life = Math.min(6500, 2600 + 30L * text.length()) + (kind == Kind.ERROR ? 1500 : 0);
        }
    }

    private static final List<Card> CARDS = new ArrayList<>();
    /** Bottom edge of the cards last frame (for the build panel below them). */
    private static volatile float bottom = 0;

    private Toasts() {}

    public static void post(Kind kind, String text) {
        if (text == null || text.isBlank()) return;
        long now = System.currentTimeMillis();
        synchronized (CARDS) {
            for (Card c : CARDS) {
                if (c.leaving < 0 && c.text.equals(text)) { c.count++; c.born = now - IN; return; }
            }
            CARDS.add(new Card(text, kind, now));
            long live = CARDS.stream().filter(c -> c.leaving < 0).count();
            for (Card c : CARDS) { if (live <= MAX) break; if (c.leaving < 0) { c.leaving = now; live--; } }
        }
    }

    /** Lowest pixel row the cards use right now (0 = none), so the build panel can sit below them. */
    static float bottom() { return bottom; }

    static void clear() { synchronized (CARDS) { CARDS.clear(); } bottom = 0; }

    /** Number of cards on screen (for the game test). */
    static int shown() { synchronized (CARDS) { return CARDS.size(); } }

    /** Texts of the cards on screen (game test). */
    public static List<String> texts() { synchronized (CARDS) { return CARDS.stream().map(c -> c.text).toList(); } }

    /** Draws the cards from {@code top} downwards (below the build panel when it is shown). */
    static void extract(GuiGraphicsExtractor g, int top) {
        Minecraft mc = Minecraft.getInstance();
        Font font = mc.font;
        long now = System.currentTimeMillis();
        List<Card> cards;
        synchronized (CARDS) {
            CARDS.removeIf(c -> c.leaving >= 0 && now - c.leaving > OUT);
            for (Card c : CARDS) if (c.leaving < 0 && now - c.born > c.life) c.leaving = now;
            cards = new ArrayList<>(CARDS);
        }
        if (cards.isEmpty()) { bottom = 0; return; }
        int maxW = Math.max(120, Math.min(200, g.guiWidth() * 2 / 5));
        float y = Math.max(TOP, top), lowest = 0;
        for (Card c : cards) {
            List<String> lines = wrap(font, c.text + (c.count > 1 ? "  ×" + c.count : ""), maxW - 2 * PAD - 12);
            // At most three lines per card: the rest of a long message is in the log and on the command page.
            if (lines.size() > 3) { lines = new ArrayList<>(lines.subList(0, 3)); lines.set(2, HudCard.fit(font, lines.get(2) + "…", maxW - 2 * PAD - 12)); }
            int w = 0;
            for (String l : lines) w = Math.max(w, font.width(l));
            w += 2 * PAD + 12;
            int h = lines.size() * (font.lineHeight + 1) + 2 * PAD - 1;
            // Slide in from the right, slide out to the right; the stack moves up smoothly when a card leaves.
            float in = ease(Math.min(1f, (now - c.born) / (float) IN));
            float out = c.leaving < 0 ? 0f : ease(Math.min(1f, (now - c.leaving) / (float) OUT));
            float shown = in * (1f - out);
            if (Float.isNaN(c.y)) c.y = y;
            c.y += (y - c.y) * 0.25f;
            float shake = c.kind == Kind.ERROR && now - c.born < 420 ? (float) Math.sin((now - c.born) / 26.0) * 3f * (1f - (now - c.born) / 420f) : 0f;
            float x = g.guiWidth() - 6 - w + (1f - shown) * (w + 10) + shake;
            int alpha = Math.max(8, Math.round(shown * 255));
            g.pose().pushMatrix();
            g.pose().translate(x, c.y);
            g.fillGradient(0, 0, w, h, argb(alpha * 0xE6 / 255, 0x1A, 0x22, 0x20), argb(alpha * 0xE6 / 255, 0x11, 0x17, 0x15));
            g.fill(0, h - 3, w, h - 1, argb(alpha * 0x42 / 255, 0, 0, 0)); // UI-03 dark bottom edge, like a block
            g.fill(0, 0, 2, h, withAlpha(c.kind.color, alpha));
            g.fill(2, 0, w, 1, argb(alpha / 6, 0xFF, 0xFF, 0xFF));
            g.text(font, c.kind.icon, PAD + 1, PAD, withAlpha(c.kind.color, alpha), true);
            int ty = PAD;
            for (String l : lines) { g.text(font, l, PAD + 12, ty, withAlpha(HudCard.TEXT, alpha), true); ty += font.lineHeight + 1; }
            // Time left as a thin line along the bottom edge.
            float left = c.leaving >= 0 ? 0f : 1f - Math.min(1f, (now - c.born) / (float) c.life);
            g.fill(2, h - 1, 2 + Math.round((w - 2) * left), h, withAlpha(c.kind.color & 0x00FFFFFF | 0x90000000, alpha));
            g.pose().popMatrix();
            float step = (h + GAP) * (c.leaving >= 0 ? 1f - out : 1f);
            y += step;
            lowest = Math.max(lowest, c.y + h);
        }
        bottom = lowest;
    }

    private static float ease(float t) { float u = 1f - t; return 1f - u * u * u; }

    private static int argb(int a, int r, int g, int b) { return (Math.max(0, Math.min(255, a)) << 24) | (r << 16) | (g << 8) | b; }

    private static int withAlpha(int color, int alpha) { int a = ((color >>> 24) * alpha) / 255; return (a << 24) | (color & 0xFFFFFF); }

    static List<String> wrap(Font font, String s, int w) {
        List<String> out = new ArrayList<>();
        String rest = s;
        while (!rest.isEmpty() && out.size() < 5) {
            if (font.width(rest) <= w) { out.add(rest); break; }
            String part = font.plainSubstrByWidth(rest, w);
            int cut = part.lastIndexOf(' ');
            if (cut > part.length() / 3) part = part.substring(0, cut);
            if (part.isEmpty()) part = rest.substring(0, 1);
            if (out.size() == 4 && part.length() < rest.length()) part = font.plainSubstrByWidth(part, w - font.width("…")) + "…";
            out.add(part);
            rest = rest.substring(Math.min(rest.length(), part.endsWith("…") ? rest.length() : part.length())).stripLeading();
        }
        return out;
    }
}
