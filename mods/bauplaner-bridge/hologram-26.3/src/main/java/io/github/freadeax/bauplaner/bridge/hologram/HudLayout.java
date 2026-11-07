package io.github.freadeax.bauplaner.bridge.hologram;

import java.util.ArrayList;
import java.util.List;

/**
 * Where the mod's panels sat on the game screen in the last finished frame (block 3 acceptance, 0.25.0): every card
 * the HUD draws (build panel, message cards, Weltplan, team, build guides, aim line) is noted with its name and
 * rectangle in GUI pixels. The game test reads it to check that no panel covers another one and nothing leaves the
 * window, in every window size. Costs one small list per frame; nothing is drawn or saved.
 */
public final class HudLayout {
    /** One panel: name and its rectangle (x0/y0 inclusive, x1/y1 exclusive), GUI pixels. */
    public record Box(String name, int x0, int y0, int x1, int y1) {
        public boolean overlaps(Box o) { return x0 < o.x1 && o.x0 < x1 && y0 < o.y1 && o.y0 < y1; }
        public boolean inside(int w, int h) { return x0 >= 0 && y0 >= 0 && x1 <= w && y1 <= h; }
        @Override public String toString() { return name + " " + x0 + "," + y0 + "–" + x1 + "," + y1; }
    }

    private static List<Box> drawing = new ArrayList<>();
    private static volatile List<Box> drawn = List.of();
    private static volatile int width, height;

    private HudLayout() {}

    /** Start of a HUD frame: the panels of the frame before become the result. */
    static void frame(int guiWidth, int guiHeight) {
        drawn = List.copyOf(drawing);
        drawing = new ArrayList<>();
        width = guiWidth;
        height = guiHeight;
    }

    static void note(String name, int x0, int y0, int x1, int y1) { drawing.add(new Box(name, x0, y0, x1, y1)); }

    /**
     * Leftmost column used by the panels drawn so far in this frame between rows {@code y0} and {@code y1}, or
     * {@code fallback} when none reaches into that band: a panel drawn later keeps left of it.
     */
    static int freeRight(int y0, int y1, int fallback) {
        int x = fallback;
        for (Box b : drawing) if (b.y0() < y1 && y0 < b.y1()) x = Math.min(x, b.x0());
        return x;
    }

    /** Panels of the last finished frame (game test). */
    public static List<Box> last() { return drawn; }

    /** GUI size of the last frame. */
    public static int[] size() { return new int[] { width, height }; }
}
