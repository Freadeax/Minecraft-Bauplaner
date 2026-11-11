package io.github.freadeax.bauplaner.bridge.hologram;

import static io.github.freadeax.bauplaner.mod.Lang.t;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.Lang;
import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;

/**
 * The plan menu (key J), rebuilt in 0.23.0 (GAME-12): a side panel at the right edge that slides in, so the world
 * and the hologram stay visible while you move the plan. Four tabs instead of one crowded page:
 * <ul>
 * <li><b>Plan</b> – plan files (a click places the plan on the looked-at block), here / show / remove,</li>
 * <li><b>Position</b> – move ±1/±10, turn, mirror,</li>
 * <li><b>Ansicht</b> – textures, x-ray, layers, build section, Weltplan group, placement helper, material list,</li>
 * <li><b>Einstellungen</b> – language, where messages appear, build panel, render budget, keys.</li>
 * </ul>
 * Row height shrinks on small windows (854×480 at GUI scale 2 = 240 px high still fits every tab). An open question
 * (planner wants to connect, server offers the plugin) comes first in the panel.
 */
public final class PlanScreen extends Screen {
    enum Tab {
        PLAN("Plan", "Plan"), MOVE("Position", "Move"), VIEW("Ansicht", "View"), SETTINGS("Optionen", "Options");
        final String de, en;
        Tab(String de, String en) { this.de = de; this.en = en; }
        String label() { return t(de, en); }
    }

    private static Tab tab = Tab.PLAN;
    private static final long SLIDE = 200;

    private final Hologram hologram;
    private final BlockPos lookedAt;
    private int page;
    private String message = "";
    private long messageAt;
    private LinkPrompt.Question prompt;
    /** „Später“ was clicked: show the normal menu even though a question is open (the banner stays). */
    private boolean later;
    private long openedAt = -1;
    /** Widgets with their resting x, moved while the panel slides in. */
    private final Map<AbstractWidget, Integer> restX = new IdentityHashMap<>();
    private float underline = -1;
    private int[] tabX = new int[0];
    private int[] tabWs = new int[4];
    private int step = 20, h = 18;
    private int contentTop;
    private final List<String[]> notes = new ArrayList<>();

    PlanScreen(Hologram hologram, BlockPos lookedAt) {
        super(Component.literal("Build Studio"));
        this.hologram = hologram;
        this.lookedAt = lookedAt;
    }

    // ------------------------------------------------------------------ geometry

    private int panelW() { return Math.max(Math.min(212, width - 110), Math.min(264, width * 9 / 20)); }
    private int panelX() { return width - panelW() - 4; }
    private int inner() { return panelW() - 12; }
    private int left() { return panelX() + 6; }
    private int footerY() { return height - 26; }

    @Override
    protected void init() {
        if (openedAt < 0) openedAt = System.currentTimeMillis();
        restX.clear();
        notes.clear();
        int x = left(), w = inner();
        // Tabs.
        // Tab widths follow the labels, the rest of the row is shared evenly.
        tabX = new int[4];
        int labels = 0;
        for (Tab tb : Tab.values()) labels += font.width(tb.label());
        int extra = (w - 6 - labels) / 4;
        int ty = 30, tx = x;
        for (Tab tb : Tab.values()) {
            int i = tb.ordinal();
            tabWs[i] = extra >= 8 ? font.width(tb.label()) + extra : (w - 6) / 4;
            if (i == 3) tabWs[i] = x + w - tx;
            tabX[i] = tx;
            tx += tabWs[i] + 2;
            int tabW = tabWs[i];
            boolean needsPlan = tb == Tab.MOVE || tb == Tab.VIEW;
            Button b = add(Button.builder(Component.literal(HudCard.fit(font, tb.label(), tabW - 6)), btn -> { tab = tb; page = 0; rebuildWidgets(); })
                    .bounds(tabX[i], ty, tabW, 16).build());
            if (needsPlan && !hologram.active()) { b.active = false; b.setTooltip(Tooltip.create(Component.literal(t("Erst einen Plan platzieren (Reiter „Plan“).", "Place a plan first (tab “Plan”).")))); }
        }
        if (tab != Tab.SETTINGS && tab != Tab.PLAN && !hologram.active()) tab = Tab.PLAN;
        if (underline < 0) underline = tabX[tab.ordinal()];
        contentTop = ty + 22;
        int room = footerY() - 6 - contentTop;
        prompt = later ? null : LinkPrompt.current(HologramClient.current());
        if (prompt != null) {
            promptWidgets(x, w);
        } else {
            int rows = switch (tab) { case PLAN -> 8; case MOVE -> 6; case VIEW -> 7; case SETTINGS -> 5; };
            step = Math.max(15, Math.min(21, room / rows));
            h = step - 2;
            switch (tab) {
                case PLAN -> planTab(x, w, room);
                case MOVE -> moveTab(x, w);
                case VIEW -> viewTab(x, w);
                case SETTINGS -> settingsTab(x, w);
            }
        }
        // Footer.
        int fw = (w - 4) / 2;
        if (HologramClient.current() != null)
            add(Button.builder(Component.literal(HudCard.fit(font, font.width(t("Befehle & Status", "Commands & status")) <= fw - 12 ? t("Befehle & Status", "Commands & status") : t("Befehle", "Commands"), fw - 12)), b -> HologramClient.current().openCommands(minecraft)).bounds(x, footerY(), fw, 20).build());
        add(Button.builder(Component.literal(HudCard.fit(font, t("Fertig", "Done"), fw - 12)), b -> onClose()).bounds(x + w - fw, footerY(), fw, 20).build());
    }

    private <T extends AbstractWidget> T add(T widget) {
        addRenderableWidget(widget);
        restX.put(widget, widget.getX());
        return widget;
    }

    private Button button(String label, int x, int y, int w, Runnable click) {
        return add(Button.builder(Component.literal(HudCard.fit(font, label, w - 6)), b -> click.run()).bounds(x, y, w, h).build());
    }

    private void promptWidgets(int x, int w) {
        LinkPrompt.Question q = prompt;
        int y = contentTop + 10 + Toasts.wrap(font, q.text(), w).size() * (font.lineHeight + 1) + 24;
        add(Button.builder(Component.literal(HudCard.fit(font, q.yes(), w - 12)), b -> say(LinkPrompt.answer(HologramClient.current(), q.kind(), true))).bounds(x, y, w, 20).build());
        add(Button.builder(Component.literal(HudCard.fit(font, q.no(), (w - 4) / 2 - 12)), b -> say(LinkPrompt.answer(HologramClient.current(), q.kind(), false))).bounds(x, y + 24, (w - 4) / 2, 20).build());
        add(Button.builder(Component.literal(HudCard.fit(font, t("Später", "Later"), (w - 4) / 2 - 12)), b -> { later = true; rebuildWidgets(); }).bounds(x + w - (w - 4) / 2, y + 24, (w - 4) / 2, 20).build());
    }

    private void planTab(int x, int w, int room) {
        List<String> files = hologram.planFiles();
        int y = contentTop + 12;
        if (files.isEmpty()) {
            note(t("Noch keine Pläne. Im Planer „Ins Spiel senden“", "No plans yet. Click “Send to game” in the"), y, HologramHud.GREY);
            note(t("klicken oder die .schem-Datei hier ablegen:", "planner or put the .schem file here:"), y + 11, HologramHud.GREY);
            note(shorten(hologram.plansDir().toString(), 48), y + 22, HudCard.DIM);
            y += 38;
        } else {
            int actions = hologram.active() ? 1 : 0;
            int perPage = Math.max(2, (room - 12 - (actions + 1) * step - 14) / step);
            int pages = Math.max(1, (files.size() + perPage - 1) / perPage);
            page = Math.min(page, pages - 1);
            for (int i = 0; i < perPage; i++) {
                int k = page * perPage + i;
                if (k >= files.size()) break;
                String file = files.get(k);
                boolean current = file.equals(hologram.planFile()) && hologram.active();
                button((current ? "▶ " : "") + file.replaceFirst("\\.schem$", ""), x, y, w, () -> place(file));
                y += step;
            }
            if (pages > 1) {
                int pp = pages;
                button("◀", x, y, 30, () -> { page = (page + pp - 1) % pp; rebuildWidgets(); });
                button("▶", x + w - 30, y, 30, () -> { page = (page + 1) % pp; rebuildWidgets(); });
                note((page + 1) + " / " + pages, y + (h - 8) / 2, HologramHud.GREY, x + w / 2 - font.width((page + 1) + " / " + pages) / 2);
                y += step;
            }
            note(t("Klick = am angeschauten Block platzieren", "Click = place at the block you look at"), y + 2, HudCard.DIM);
            y += 14;
        }
        if (hologram.active()) {
            int third = (w - 8) / 3;
            button(t("Hierher", "Here"), x, y, third, () -> act(() -> hologram.moveTo(lookedAt), t("Verschoben.", "Moved.")));
            button(hologram.visible() ? t("Ausblenden", "Hide") : t("Einblenden", "Show"), x + third + 4, y, third, () -> act(hologram::toggleVisible, ""));
            button(t("Entfernen", "Remove"), x + 2 * (third + 4), y, w - 2 * (third + 4), () -> act(hologram::remove, t("Plan entfernt.", "Plan removed.")));
        }
    }

    private void moveTab(int x, int w) {
        int y = contentTop + 12;
        button(t("Hierher (angeschauter Block)", "Here (block you look at)"), x, y, w, () -> act(() -> hologram.moveTo(lookedAt), t("Verschoben.", "Moved.")));
        y += step;
        y = axis(x, y, w, "X", 1, 0, 0);
        y = axis(x, y, w, "Y", 0, 1, 0);
        y = axis(x, y, w, "Z", 0, 0, 1);
        int third = (w - 8) / 3;
        button(t("⟲ Links", "⟲ Left"), x, y, third, () -> act(() -> hologram.turn(-1), t("Gedreht.", "Turned.")));
        button(t("Rechts ⟳", "Right ⟳"), x + third + 4, y, third, () -> act(() -> hologram.turn(1), t("Gedreht.", "Turned.")));
        button(t("Spiegeln", "Mirror"), x + 2 * (third + 4), y, w - 2 * (third + 4), () -> act(hologram::mirror, t("Gespiegelt.", "Mirrored.")));
        y += step + 4;
        note(t("Tasten: Pfeile/Bild↑↓ schieben · Ende drehen · Einfg spiegeln", "Keys: arrows/PgUp/PgDn move · End turn · Insert mirror"), y, HudCard.DIM);
    }

    /** One axis: label, then −10, −1, +1, +10. */
    private int axis(int x, int y, int w, String axis, int ax, int ay, int az) {
        note(axis, y + (h - 8) / 2, HologramHud.CYAN, x + 2);
        int[] steps = { -10, -1, 1, 10 };
        int bw = (w - 14 - 3 * 3) / 4;
        for (int i = 0; i < steps.length; i++) {
            int s = steps[i];
            button((s > 0 ? "+" : "") + s, x + 14 + i * (bw + 3), y, bw, () -> act(() -> hologram.move(ax * s, ay * s, az * s), ""));
        }
        return y + step;
    }

    private void viewTab(int x, int w) {
        int y = contentTop + 12, half = (w - 4) / 2;
        button(t("Texturen: ", "Textures: ") + onOff(hologram.textured()), x, y, half, () -> act(hologram::toggleTextured, ""));
        button(t("Röntgen: ", "X-ray: ") + onOff(hologram.xray()), x + half + 4, y, w - half - 4, () -> act(hologram::toggleXray, ""));
        y += step;
        String mode = switch (hologram.layers()) {
            case ALL -> t("Ebenen: alle", "Layers: all");
            case ONE -> t("Nur Ebene ", "Only layer ") + hologram.layerY();
            case BELOW -> t("Bis Ebene ", "Up to layer ") + hologram.layerY();
        };
        button(mode, x, y, w - 56, () -> act(hologram::cycleLayers, ""));
        button("▼", x + w - 52, y, 24, () -> act(() -> hologram.stepLayer(-1), ""));
        button("▲", x + w - 24, y, 24, () -> act(() -> hologram.stepLayer(1), ""));
        y += step;
        if (!hologram.sectionNames().isEmpty()) {
            String name = hologram.sectionName();
            button(name == null ? t("Abschnitt: alle", "Section: all") : hologram.section() + ". " + name, x, y, w - 56, () -> act(() -> hologram.stepSection(1), ""));
            button("◀", x + w - 52, y, 24, () -> act(() -> hologram.stepSection(-1), ""));
            button("▶", x + w - 24, y, 24, () -> act(() -> hologram.stepSection(1), ""));
            y += step;
        }
        // GAME-07-S11: Weltplan groups from the website marks.
        LiveLink link = HologramClient.current() == null ? null : HologramClient.current().link();
        if (link != null && !link.marks().groups().isEmpty()) {
            String g = link.group();
            button(g == null ? t("Gruppe: alle", "Group: all") : t("Gruppe: ", "Group: ") + g, x, y, w - 56, () -> say(link.stepGroup()));
            button(t("Alle", "All"), x + w - 52, y, 52, () -> { link.showAllGroups(); say(link.setGroup(null)); });
            y += step;
        }
        button(t("Platzierhilfe: ", "Placement helper: ") + hologram.guard().text(), x, y, w, () -> act(() -> hologram.setGuard(hologram.guard().next()), switch (hologram.guard().next()) {
            case ON -> t("Falscher Block oder falsche Ausrichtung wird nicht gesetzt.", "Wrong blocks or wrong facing are not placed.");
            case WARN -> t("Nur Hinweise, gesetzt wird trotzdem.", "Hints only, blocks are placed anyway.");
            case OFF -> t("Platzierhilfe aus.", "Placement helper off.");
        }));
        y += step;
        button(t("Materialliste", "Material list"), x, y, w, () -> MaterialScreen.open(minecraft, hologram));
    }

    private void settingsTab(int x, int w) {
        int y = contentTop + 12;
        button(t("Sprache: ", "Language: ") + Lang.choice().label(), x, y, w, () -> say(ClientSettings.setLanguage(Lang.choice().next())));
        y += step;
        button(t("Meldungen: ", "Messages: ") + ClientSettings.notices().label(), x, y, w, () -> say(ClientSettings.setNotices(ClientSettings.notices().next())));
        y += step;
        button(t("Bauanzeige: ", "Build panel: ") + ClientSettings.panel().label(), x, y, w, () -> say(ClientSettings.setPanel(ClientSettings.panel().next())));
        y += step;
        button(t("Leistung: ", "Performance: ") + hologram.budget().text(), x, y, w, () -> act(() -> hologram.setBudget(Hologram.Budget.values()[(hologram.budget().ordinal() + 1) % Hologram.Budget.values().length]), ""));
        y += step + 4;
        note(t("Tasten (Optionen → Steuerung):", "Keys (Options → Controls):"), y, HologramHud.GREY);
        note(t("J Menü · Komma ein/aus", "J menu · comma show/hide"), y + 11, HudCard.DIM);
        note(t("Punkt nächster Fehler · Num 7 Material", "period next error · Num 7 material"), y + 22, HudCard.DIM);
    }

    private static String onOff(boolean on) { return on ? t("an", "on") : t("aus", "off"); }

    private void note(String text, int y, int color) { note(text, y, color, left()); }
    private void note(String text, int y, int color, int x) { notes.add(new String[] { text, Integer.toString(x), Integer.toString(y), Integer.toHexString(color) }); }

    // ------------------------------------------------------------------ actions

    private void act(Runnable r, String text) {
        r.run();
        say(text);
    }

    private void say(String text) {
        message = text == null ? "" : text;
        messageAt = System.currentTimeMillis();
        rebuildWidgets();
    }

    private void place(String file) {
        try {
            say(hologram.place(minecraft, file, lookedAt));
        } catch (Exception e) {
            say(t("Plan nicht lesbar: ", "Plan not readable: ") + io.github.freadeax.bauplaner.bridge.BridgeException.text(e, io.github.freadeax.bauplaner.mod.Lang.en()));
        }
    }

    // ------------------------------------------------------------------ drawing

    @Override
    public void extractBackground(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta) {
        // No blur: the world and the hologram stay visible next to the panel.
        float slide = slide();
        int off = Math.round((1f - slide) * (panelW() + 12));
        int px = panelX() + off, pw = panelW();
        g.fillGradient(px, 0, px + pw + 4, height, 0xF61A2220, 0xF6111715);
        g.fill(px, 0, px + 1, height, 0x60FFFFFF);
        g.fill(px + 1, 0, px + 2, height, 0x307FD494);
    }

    private float slide() {
        float t = Math.min(1f, (System.currentTimeMillis() - openedAt) / (float) SLIDE);
        float u = 1f - t;
        return 1f - u * u * u;
    }

    @Override
    public void extractRenderState(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta) {
        float slide = slide();
        int off = Math.round((1f - slide) * (panelW() + 12));
        // Widgets move with the panel (hit boxes too) while it slides in.
        for (var e : restX.entrySet()) {
            var wd = e.getKey();
            wd.setX(e.getValue() + off);
            wd.setAlpha(Math.max(0.05f, slide));
            // A widget outside the window would get an empty clip area for its text (26.3 refuses that): hide it until it is in.
            wd.visible = wd.getX() + wd.getWidth() <= width;
        }
        super.extractRenderState(g, mouseX, mouseY, delta);
        int x = left() + off, w = inner();
        // Header: title and the plan's state with a small bar.
        g.fill(x, 8, x + 5, 13, HudCard.ACCENT); // UI-03 overline square
        g.text(font, "Build Studio", x + 8, 7, HudCard.TEXT, true);
        var check = hologram.check();
        String state = check == null ? t("kein Plan platziert", "no plan placed") : HudCard.fit(font, hologram.plan().name(), w - font.width("Build Studio") - font.width(" · 100 %") - 20) + " · " + check.percent() + " %";
        g.text(font, state, x + w - font.width(state), 7, check == null ? HologramHud.GREY : HologramHud.GREEN, true);
        if (check != null) {
            g.fill(x, 19, x + w, 21, 0x40FFFFFF);
            g.fill(x, 19, x + w * check.percent() / 100, 21, HologramHud.GREEN);
            int open = check.count(Verdict.MISSING) + check.count(Verdict.WRONG) + check.count(Verdict.STATE);
            if (open > 0 && w > 220) g.text(font, open + t(" offen", " open"), x + w - font.width(open + t(" offen", " open")), 22, HudCard.DIM, false);
        }
        // Tab underline glides to the selected tab.
        if (tabX.length == 4) {
            float target = tabX[tab.ordinal()];
            underline += (target - underline) * Math.min(1f, delta * 0.5f + 0.15f);
            int ux = Math.round(underline) + off;
            g.fill(ux + 2, 47, ux + tabWs[tab.ordinal()] - 2, 49, HologramHud.GREEN);
        }
        if (prompt != null) {
            int y = contentTop + 4;
            g.fill(x - 3, y - 3, x + w + 3, y + 1, HudCard.GOLD);
            g.text(font, t("Frage", "Question"), x, y + 4, HudCard.GOLD, true);
            y += 16;
            for (String l : Toasts.wrap(font, prompt.text(), w)) { g.text(font, l, x, y, HudCard.TEXT, true); y += font.lineHeight + 1; }
            String hint = prompt.kind() == LinkPrompt.Kind.PLANER ? t("Nur zulassen, wenn du das gerade selbst im Browser angestoßen hast.", "Only allow it if you just started this in your browser yourself.")
                    : t("Danach kann der Planer den Server koppeln und einstellen – ohne Befehle.", "Then the planner can link and set up the server – no commands.");
            for (String l : Toasts.wrap(font, hint, w)) { g.text(font, l, x, y, HudCard.MUTED, true); y += font.lineHeight + 1; }
        } else {
            g.text(font, tab.label(), x, contentTop, HudCard.MUTED, true);
            if (tab != Tab.PLAN && tab != Tab.SETTINGS && check != null) {
                var p = check.placement();
                String origin = p.x() + " " + p.y() + " " + p.z() + " · " + p.turns() * 90 + "°" + (p.mirror() ? t(" · gespiegelt", " · mirrored") : "");
                g.text(font, origin, x + w - font.width(origin), contentTop, HudCard.DIM, true);
            }
        }
        for (String[] n : notes) g.text(font, HudCard.fit(font, n[0], w), Integer.parseInt(n[1]) + off, Integer.parseInt(n[2]), (int) Long.parseLong(n[3], 16), true);
        // Message above the footer, fading out after a few seconds.
        if (!message.isEmpty()) {
            long age = System.currentTimeMillis() - messageAt;
            int alpha = age < 5000 ? 255 : Math.max(0, 255 - (int) ((age - 5000) / 4));
            if (alpha > 8) {
                List<String> lines = Toasts.wrap(font, message, w);
                int y = footerY() - 4 - lines.size() * (font.lineHeight + 1);
                for (String l : lines) { g.text(font, l, x, y, (alpha << 24) | 0x7FD494, true); y += font.lineHeight + 1; }
            }
        }
    }

    @Override
    public boolean isPauseScreen() { return false; }

    private static String shorten(String s, int max) { return s.length() <= max ? s : "…" + s.substring(s.length() - max + 1); }

    static void open(Minecraft mc, Hologram hologram) {
        mc.gui.setScreen(new PlanScreen(hologram, McCompat.targetBlock(mc)));
    }
}
