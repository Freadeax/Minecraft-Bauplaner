package io.github.freadeax.bauplaner.bridge.fabric;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;

/**
 * Progress panel on the right edge while a plan is placed, plus the error finder line. Right, below the
 * status effect icons, because minimaps (Xaero) take the top left corner.
 */
final class HologramHud {
    static final int BLUE = 0xFF5AA9FF, RED = 0xFFFF5A5A, YELLOW = 0xFFFFD54A, GREEN = 0xFF6BE07B, GREY = 0xFFB0B0B0;

    private final Hologram hologram;

    HologramHud(Hologram hologram) { this.hologram = hologram; }

    void extract(GuiGraphicsExtractor g, DeltaTracker delta) {
        Minecraft mc = Minecraft.getInstance();
        LiveCheck check = hologram.check();
        if (check == null || mc.player == null) return;
        var font = mc.font;
        int line = font.lineHeight + 2;
        String title = "Bauplaner: " + hologram.plan().name() + (hologram.visible() ? "" : " (ausgeblendet)");
        int ok = check.count(Verdict.OK), missing = check.count(Verdict.MISSING), wrong = check.count(Verdict.WRONG),
                state = check.count(Verdict.STATE), unknown = check.count(Verdict.UNKNOWN);
        String[] rows = {
                title,
                check.percent() + " % fertig · " + ok + " / " + check.size() + " richtig",
                "fehlt " + missing, "falsch " + wrong, "Zustand " + state,
                unknown > 0 ? "nicht geladen " + unknown : null,
        };
        int width = 0;
        for (String r : rows) if (r != null) width = Math.max(width, font.width(r));
        String finder = finderLine(mc, check);
        if (finder != null) width = Math.max(width, font.width(finder));
        int lines = 0;
        for (String r : rows) if (r != null) lines++;
        if (finder != null) lines++;
        int x = g.guiWidth() - width - 6, y = 56;
        g.fill(x - 3, y - 3, x + width + 3, y + lines * line - 1, 0x90000000);
        int bar = Math.max(1, width * check.percent() / 100);
        g.text(font, rows[0], x, y, 0xFFFFFFFF, true); y += line;
        g.fill(x, y + font.lineHeight, x + width, y + font.lineHeight + 1, 0x60FFFFFF);
        g.fill(x, y + font.lineHeight, x + bar, y + font.lineHeight + 1, GREEN);
        g.text(font, rows[1], x, y, GREEN, true); y += line;
        g.text(font, rows[2], x, y, BLUE, true); y += line;
        g.text(font, rows[3], x, y, RED, true); y += line;
        g.text(font, rows[4], x, y, YELLOW, true); y += line;
        if (rows[5] != null) { g.text(font, rows[5], x, y, GREY, true); y += line; }
        if (finder != null) g.text(font, finder, x, y, 0xFFFFFFFF, true);
    }

    /** "Nächster Fehler: 12 m Nordost, 2 höher – fehlt: Eichenholztreppe". */
    private String finderLine(Minecraft mc, LiveCheck check) {
        int t = hologram.target();
        if (t < 0) return null;
        double dx = check.worldX(t) + 0.5 - mc.player.getX(), dy = check.worldY(t) - Math.floor(mc.player.getY()), dz = check.worldZ(t) + 0.5 - mc.player.getZ();
        int dist = (int) Math.round(Math.sqrt(dx * dx + dz * dz));
        String dir = dist == 0 ? "hier" : compass(dx, dz);
        String height = dy == 0 ? "" : ", " + (int) Math.abs(dy) + (dy > 0 ? " höher" : " tiefer");
        Verdict v = check.verdict(t);
        String what = switch (v) {
            case MISSING -> "fehlt " + McCompat.blockName(check.expected(t));
            case WRONG -> McCompat.blockName(check.found(t)) + " statt " + McCompat.blockName(check.expected(t));
            case STATE -> "Ausrichtung/Zustand: " + check.expected(t).properties();
            default -> "";
        };
        return "Nächster Fehler: " + dist + " m " + dir + height + " – " + what;
    }

    static String compass(double dx, double dz) {
        double deg = Math.toDegrees(Math.atan2(dx, -dz));
        String[] names = { "Nord", "Nordost", "Ost", "Südost", "Süd", "Südwest", "West", "Nordwest" };
        return names[(int) Math.floorMod(Math.round(deg / 45), 8)];
    }
}
