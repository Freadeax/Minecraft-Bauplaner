package io.github.freadeax.bauplaner.bridge.hologram;

import static io.github.freadeax.bauplaner.mod.Lang.t;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.Lang;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;

/**
 * Build panel at the top right while a plan is placed (GAME-12, 0.23.0 rework). Compact by default: plan name
 * with percent, an animated progress bar, one line with what is open, and only when it applies the active
 * filter (section, layer, group) and the next error. {@code /bauplaner anzeige ausfuehrlich} shows the
 * placement helper, x-ray and render budget too, {@code aus} hides it. It stays in the top right corner (below the
 * status effect icons while there are any); the message cards appear below it. Right side, because minimaps (Xaero)
 * take the top left corner.
 */
public final class HologramHud {
    public static final int CYAN = HudCard.INFO;
    public static final int BLUE = 0xFF5AA9FF, RED = HudCard.ERROR, YELLOW = HudCard.GOLD, GREEN = HudCard.ACCENT, GREY = HudCard.MUTED;
    private static final int WIDTH = 168, ORANGE = HudCard.WARN, VIOLET = 0xFFC8A0FF;

    private final Hologram hologram;
    private final PlacementAssist assist;
    /** Layer counts, recomputed only when verdicts or the layer change. */
    private int[] layerCounts;
    private String layerKey = "";
    /** Animated values: shown percent, panel top, slide-in (0..1). */
    private float shownPercent = -1, top = 56, slide;
    private long last;

    HologramHud(Hologram hologram, PlacementAssist assist) { this.hologram = hologram; this.assist = assist; }

    void extract(GuiGraphicsExtractor g, DeltaTracker delta) {
        Minecraft mc = Minecraft.getInstance();
        HudCard.frame(g);
        LiveCheck check = hologram.check();
        long now = System.currentTimeMillis();
        float dt = last == 0 ? 0.016f : Math.min(0.1f, (now - last) / 1000f);
        last = now;
        if (check == null || mc.player == null || ClientSettings.panel() == ClientSettings.Panel.HIDDEN) { slide = 0; shownPercent = -1; aimLine(g, mc); return; }
        Font font = mc.font;
        int line = HudCard.line(font);
        boolean detailed = ClientSettings.panel() == ClientSettings.Panel.DETAILED;
        int ok = check.count(Verdict.OK), missing = check.count(Verdict.MISSING), wrong = check.count(Verdict.WRONG),
                state = check.count(Verdict.STATE), unknown = check.count(Verdict.UNKNOWN);
        // Animation: slide in from the right once, the bar follows the percent, the panel follows the message cards.
        slide = Math.min(1f, slide + dt * 5f);
        float target = check.percent();
        shownPercent = shownPercent < 0 ? target : shownPercent + (target - shownPercent) * Math.min(1f, dt * 6f);
        // Top right corner; below the status effect icons while the player has effects. Message cards go below the panel.
        float wantTop = mc.player.getActiveEffects().isEmpty() ? 6 : 56;
        top += (wantTop - top) * Math.min(1f, dt * 10f);

        List<String[]> rows = new ArrayList<>();
        // Line 2: what is open, only the counts that are not zero.
        StringBuilder open = new StringBuilder();
        if (missing > 0) open.append(t("fehlt ", "missing ")).append(missing);
        if (wrong > 0) open.append(open.length() > 0 ? " · " : "").append(t("falsch ", "wrong ")).append(wrong);
        if (state > 0) open.append(open.length() > 0 ? " · " : "").append(t("Ausrichtung ", "facing ")).append(state);
        if (open.length() == 0) rows.add(new String[] { unknown > 0 ? t("bisher alles richtig", "all correct so far") : t("✔ fertig gebaut", "✔ build complete"), hex(GREEN) });
        else rows.add(new String[] { open.toString(), hex(missing > 0 ? BLUE : wrong > 0 ? RED : YELLOW) });
        if (unknown > 0 && detailed) rows.add(new String[] { t("nicht geladen ", "not loaded ") + unknown, hex(GREY) });
        // Filters in one line.
        List<String> filter = new ArrayList<>();
        String section = sectionRow(check);
        if (section != null) filter.add(section);
        String layer = layerLine(check);
        if (layer != null) filter.add(layer);
        String group = groupRow(check);
        if (group != null) filter.add(group);
        if (!filter.isEmpty()) {
            if (detailed) for (String f : filter) rows.add(new String[] { f, hex(f == section ? ORANGE : f == layer ? CYAN : VIOLET) });
            else rows.add(new String[] { String.join(" · ", filter), hex(ORANGE) });
        }
        String finder = finderLine(mc, check);
        if (finder != null) rows.add(new String[] { finder, "FFFFFFFF" });
        if (detailed) {
            rows.add(new String[] { t("Platzierhilfe: ", "Placement helper: ") + hologram.guard().text() + (hologram.xray() ? t(" · Röntgen", " · x-ray") : ""),
                    hex(hologram.guard() == io.github.freadeax.bauplaner.mod.PlacementAdvice.Guard.OFF ? GREY : CYAN) });
            if (hologram.capped()) rows.add(new String[] { t("Zeigt die nächsten ", "Showing the nearest ") + Lang.n(hologram.shown()) + t(" (Leistung ", " (performance ") + hologram.budget().text() + (hologram.budget() == Hologram.Budget.AUTO && hologram.fps() > 0 ? " · " + hologram.fps() + " fps" : "") + ")", hex(GREY) });
        }

        String name = hologram.plan().name() + (hologram.visible() ? "" : t(" (aus)", " (hidden)")) + (hologram.loading() ? " …" : "");
        String pct = check.percent() + " %";
        int w = WIDTH;
        if (detailed) for (String[] r : rows) w = Math.max(w, Math.min(g.guiWidth() / 2 - 20, font.width(r[0])));
        int h = line + 4 + rows.size() * line;
        int x = g.guiWidth() - w - 6 - HudCard.PAD;
        float sx = (1f - ease(slide)) * (w + 20);
        g.pose().pushMatrix();
        g.pose().translate(sx, top - Math.round(top));
        int y = Math.round(top);
        HudCard.back(g, x, y, w, h, GREEN);
        g.text(font, HudCard.fit(font, name, w - font.width(pct) - 6), x, y, HudCard.TEXT, true);
        g.text(font, pct, x + w - font.width(pct), y, GREEN, true);
        y += line;
        // Progress bar: grey track, green fill that grows smoothly, a lighter tip while it moves.
        int bar = Math.round(w * Math.max(0f, Math.min(100f, shownPercent)) / 100f);
        g.fill(x, y, x + w, y + 3, 0x50FFFFFF);
        g.fill(x, y, x + bar, y + 3, GREEN);
        if (Math.abs(target - shownPercent) > 0.3f && bar > 2) g.fill(x + bar - 2, y, x + bar, y + 3, 0xFFD8FFD8);
        y += 6;
        for (String[] r : rows) { g.text(font, HudCard.fit(font, r[0], w), x, y, (int) Long.parseLong(r[1], 16), true); y += line; }
        g.pose().popMatrix();
        HudCard.ceiling(Math.round(top) + h + HudCard.PAD);
        HudLayout.note("Bauanzeige", x - HudCard.PAD, Math.round(top) - HudCard.PAD, x + w + HudCard.PAD, Math.round(top) + h + HudCard.PAD - 2);
        aimLine(g, mc);
    }

    private static float ease(float t) { float u = 1f - t; return 1f - u * u * u; }

    private static String hex(int color) { return Integer.toHexString(color); }

    /** Below the crosshair: what belongs where the player aims and how to click it. */
    private void aimLine(GuiGraphicsExtractor g, Minecraft mc) {
        PlacementAssist.Aim aim = assist.aim();
        if (aim == null || mc.gui.screen() != null) return;
        var font = mc.font;
        String text = aim.advice();
        int max = g.guiWidth() - 20;
        if (font.width(text) > max) text = font.plainSubstrByWidth(text, max - 6) + "…";
        int w = font.width(text), cx = g.guiWidth() / 2, y = g.guiHeight() / 2 + 12;
        g.fill(cx - w / 2 - 3, y - 2, cx + w / 2 + 3, y + font.lineHeight + 1, 0x90000000);
        HudLayout.note("Zielhilfe", cx - w / 2 - 3, y - 2, cx + w / 2 + 3, y + font.lineHeight + 1);
        g.centeredText(font, text, cx, y, aim.color());
    }

    private String sectionKey = "", sectionText;

    /** "Abschnitt 2/5 „Erdgeschoss“: 73 %", null without sections or with all sections. */
    private String sectionRow(LiveCheck check) {
        if (hologram.sectionSetLabel() != null) {
            String key = check.revision() + "/" + hologram.sectionSet() + "/" + hologram.areasVersion() + "/" + System.identityHashCode(check) + Lang.en();
            if (!key.equals(sectionKey)) {
                int[] c = check.count(hologram.filter());
                int total = 0;
                for (int v : c) total += v;
                int ok = c[Verdict.OK.ordinal()], open = c[Verdict.MISSING.ordinal()] + c[Verdict.WRONG.ordinal()] + c[Verdict.STATE.ordinal()];
                sectionText = hologram.sectionSetLabel() + " (" + hologram.sectionSet().size() + "): " + (total == 0 ? 100 : (int) ((long) ok * 100 / total)) + " % · " + open + t(" offen", " open");
                sectionKey = key;
            }
            return sectionText;
        }
        if (hologram.section() == 0 || hologram.sectionName() == null) return null;
        String key = check.revision() + "/" + hologram.section() + "/" + System.identityHashCode(check) + Lang.en();
        if (!key.equals(sectionKey)) {
            sectionText = t("Abschnitt ", "Section ") + hologram.section() + "/" + hologram.sectionNames().size() + " „" + hologram.sectionName() + "“: " + hologram.sectionLine(hologram.section());
            sectionKey = key;
        }
        return sectionText;
    }

    private String groupKey = "", groupText;

    /** GAME-07-S11: "Gruppe „Markt“: 73 % · 12 offen · 40 gesperrt", or only the locked count; null when neither applies. */
    private String groupRow(LiveCheck check) {
        if (hologram.group() == null && !hologram.hasLocked()) return null;
        String key = check.revision() + "/" + hologram.areasVersion() + "/" + hologram.section() + "/" + hologram.sectionSet() + "/" + System.identityHashCode(check) + Lang.en();
        if (!key.equals(groupKey)) {
            int locked = hologram.lockedBlocks();
            String lockedText = locked > 0 ? locked + t(" gesperrt (grau)", " locked (grey)") : null;
            if (hologram.group() != null) {
                int[] c = check.count(hologram.filter());
                int total = 0;
                for (int v : c) total += v;
                int ok = c[Verdict.OK.ordinal()], open = c[Verdict.MISSING.ordinal()] + c[Verdict.WRONG.ordinal()] + c[Verdict.STATE.ordinal()];
                groupText = t("Gruppe „", "Group “") + hologram.group() + t("“: ", "”: ") + (total == 0 ? t("nichts vom Plan darin", "no plan blocks inside") : (int) ((long) ok * 100 / total) + " % · " + open + t(" offen", " open"))
                        + (lockedText != null ? " · " + lockedText : "");
            } else groupText = lockedText;
            groupKey = key;
        }
        return groupText;
    }

    /** "Ebene 70 (nur diese): 12 / 40 richtig, 28 offen". */
    private String layerLine(LiveCheck check) {
        if (hologram.layers() == Hologram.Layers.ALL) return null;
        String key = check.revision() + "/" + hologram.layers() + "/" + hologram.layerY() + "/" + hologram.section() + "/" + hologram.sectionSet() + "/" + hologram.areasVersion() + "/" + System.identityHashCode(check);
        if (!key.equals(layerKey)) { layerCounts = check.count(hologram.filter()); layerKey = key; }
        int total = 0;
        for (int c : layerCounts) total += c;
        int ok = layerCounts[Verdict.OK.ordinal()], unknown = layerCounts[Verdict.UNKNOWN.ordinal()];
        String mode = hologram.layers() == Hologram.Layers.ONE ? t("nur", "only") : t("bis", "up to");
        return t("Ebene ", "Layer ") + mode + " " + hologram.layerY() + ": " + ok + "/" + total + ", " + (total - ok - unknown) + t(" offen", " open");
    }

    /** "➜ 12 m Nordost, 2 höher – fehlt: Eichenholztreppe". */
    private String finderLine(Minecraft mc, LiveCheck check) {
        int t = hologram.target();
        if (t < 0) return null;
        double dx = check.worldX(t) + 0.5 - mc.player.getX(), dy = check.worldY(t) - Math.floor(mc.player.getY()), dz = check.worldZ(t) + 0.5 - mc.player.getZ();
        int dist = (int) Math.round(Math.sqrt(dx * dx + dz * dz));
        String dir = dist == 0 ? t("hier", "here") : compass(dx, dz);
        String height = dy == 0 ? "" : " " + (dy > 0 ? "↑" : "↓") + (int) Math.abs(dy);
        Verdict v = check.verdict(t);
        String what = switch (v) {
            case MISSING -> t("fehlt ", "missing ") + McCompat.blockName(check.expected(t));
            case WRONG -> McCompat.blockName(check.found(t)) + t(" statt ", " instead of ") + McCompat.blockName(check.expected(t));
            case STATE -> t("Ausrichtung: ", "facing: ") + check.expected(t).properties();
            default -> "";
        };
        return "➜ " + dist + " m " + dir + height + " – " + what;
    }

    public static String compass(double dx, double dz) {
        double deg = Math.toDegrees(Math.atan2(dx, -dz));
        String[] names = Lang.en() ? new String[] { "north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest" }
                : new String[] { "Nord", "Nordost", "Ost", "Südost", "Süd", "Südwest", "West", "Nordwest" };
        return names[(int) Math.floorMod(Math.round(deg / 45), 8)];
    }
}
