package io.github.freadeax.bauplaner.bridge.hologram;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import io.github.freadeax.bauplaner.mod.commands.CommandCatalog;
import io.github.freadeax.bauplaner.mod.commands.CommandCatalog.Arg;
import io.github.freadeax.bauplaner.mod.commands.CommandCatalog.Entry;
import io.github.freadeax.bauplaner.mod.commands.CommandCatalog.Kind;
import io.github.freadeax.bauplaner.mod.commands.CommandCatalog.Side;
import io.github.freadeax.bauplaner.mod.commands.CommandContext;
import io.github.freadeax.bauplaner.mod.commands.ReplyLog;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;

/**
 * Commands and status by click (GAME-10), opened from the J menu or with {@code /bauplaner befehle}.
 * Tabs: Status, Hologramm, Team, Server-Team, Lager, Nachweis, Verbindung, Aufnahme. A click runs exactly the
 * command the player could type ({@link CommandCatalog}): client commands under {@code /bauplaner}, server
 * commands under {@code /bp} – the same chat command packet as typing it, nothing in the background. Buttons
 * that make no sense right now are greyed out with the reason as tooltip. Answers (own lines and the
 * server's answer to a command sent from here) are shown at the bottom.
 */
public final class CommandScreen extends Screen {
    /** Answers for the page; filled by {@link McCompat#chat} and by the loaders' system chat event. */
    public static final ReplyLog REPLIES = new ReplyLog();

    private static final int H = 18, STEP = 20;
    private static String tab = CommandCatalog.STATUS;
    private static final Map<String, List<String>> VALUES = new HashMap<>();

    private final HologramClient client;
    private Entry selected;
    private final List<EditBox> boxes = new ArrayList<>();
    private final List<String> choiceValues = new ArrayList<>();
    private int page;
    private String message = "";
    private boolean messageBad;
    private String contextKey = "";
    private List<String[]> statusCache = List.of();
    private int ticks;

    CommandScreen(HologramClient client) {
        super(Component.literal("Bauplaner · Befehle & Status"));
        this.client = client;
    }

    public static void open(Minecraft mc, HologramClient client) { mc.gui.setScreen(new CommandScreen(client)); }

    // ------------------------------------------------------------------ layout

    private boolean wide() { return width >= 520; }
    private int left() { return 8; }
    private int statusWidth() { return wide() ? Math.min(260, width * 2 / 5) : width - 16; }
    private int listLeft() { return wide() ? left() + statusWidth() + 10 : left(); }
    private int listWidth() { return wide() ? width - listLeft() - 8 : width - 16; }
    private int tabsBottom;

    @Override
    protected void init() {
        boxes.clear();
        CommandContext ctx = context();
        contextKey = key(ctx);
        // Tabs, wrapped into rows.
        int x = left(), y = 20;
        for (String g : CommandCatalog.groups()) {
            int w = font.width(g) + 12;
            if (x + w > width - 8) { x = left(); y += STEP; }
            String group = g;
            Button b = Button.builder(Component.literal(g.equals(tab) ? "▸ " + g : g), btn -> { tab = group; selected = null; page = 0; message = ""; rebuildWidgets(); })
                    .bounds(x, y, w + (g.equals(tab) ? font.width("▸ ") : 0), H).build();
            addRenderableWidget(b);
            x += b.getWidth() + 3;
        }
        tabsBottom = y + STEP + 4;
        int top = tabsBottom + (wide() ? 0 : statusHeight());
        int lx = listLeft(), lw = listWidth();
        int footer = height - 26;
        int argsHeight = selected != null && selected.hasArgs() ? argRows() * STEP + 28 : 0;
        int repliesTop = footer - 4 - replyLines() * (font.lineHeight + 1);
        int listBottom = repliesTop - 6 - argsHeight;
        List<Entry> entries = tab.equals(CommandCatalog.STATUS) ? quick() : CommandCatalog.group(tab);
        int cols = lw >= 300 ? 2 : 1, colW = (lw - (cols - 1) * 4) / cols;
        int rows = Math.max(1, (listBottom - top) / STEP);
        int perPage = rows * cols, pages = Math.max(1, (entries.size() + perPage - 1) / perPage);
        page = Math.min(page, pages - 1);
        for (int i = 0; i < perPage; i++) {
            int k = page * perPage + i;
            if (k >= entries.size()) break;
            Entry e = entries.get(k);
            String blocked = ctx.blocked(e);
            String label = (e.hasArgs() ? e.label() + " …" : e.label());
            if (e == selected) label = "▸ " + label;
            label = fit(label, colW - 8);
            Button b = Button.builder(Component.literal(label), btn -> click(e)).bounds(lx + (i % cols) * (colW + 4), top + (i / cols) * STEP, colW, H)
                    .tooltip(Tooltip.create(Component.literal("/" + e.base() + (e.hasArgs() ? " " + hints(e) : "") + "\n" + e.help() + (blocked == null ? "" : "\n" + blocked))))
                    .build();
            b.active = blocked == null;
            addRenderableWidget(b);
        }
        if (pages > 1) {
            // Page buttons sit left in the footer row, so they never take a row from the list (small windows).
            int pp = pages;
            addRenderableWidget(Button.builder(Component.literal("◀"), btn -> { page = (page + pp - 1) % pp; rebuildWidgets(); }).bounds(left(), footer, 20, 20).build());
            addRenderableWidget(Button.builder(Component.literal("▶"), btn -> { page = (page + 1) % pp; rebuildWidgets(); }).bounds(left() + 22, footer, 20, 20).build());
            pageLabel = (page + 1) + "/" + pages;
            pageLabelAt = new int[] { left() + 46, footer + 6 };
        } else pageLabel = null;
        if (selected != null && selected.hasArgs()) argsWidgets(lx, listBottom + 6, lw, ctx);
        addRenderableWidget(Button.builder(Component.literal("◀ Plan-Menü"), btn -> PlanScreen.open(minecraft, client.hologram())).bounds(width / 2 - 104, footer, 100, 20).build());
        addRenderableWidget(Button.builder(Component.literal("Fertig"), btn -> onClose()).bounds(width / 2 + 4, footer, 100, 20).build());
    }

    private String pageLabel;
    private int[] pageLabelAt;

    private int argRows() { return wide() || selected.args().size() <= 2 ? 1 : selected.args().size(); }

    private void argsWidgets(int x, int y, int w, CommandContext ctx) {
        argsAt = new int[] { x, y };
        y += 12;
        List<String> saved = VALUES.getOrDefault(selected.id(), List.of());
        int n = selected.args().size(), run = 80;
        boolean oneRow = argRows() == 1;
        int fieldW = oneRow ? Math.max(40, (w - run - 4 - (n - 1) * 4) / n) : w - run - 4;
        choiceValues.clear();
        for (int i = 0; i < n; i++) {
            Arg a = selected.args().get(i);
            int fx = oneRow ? x + i * (fieldW + 4) : x, fy = oneRow ? y : y + i * STEP;
            String value = i < saved.size() ? saved.get(i) : "";
            if (a.kind() == Kind.CHOICE) {
                List<String> options = new ArrayList<>(a.choices());
                if (a.optional()) options.add(0, "");
                if (!options.contains(value)) value = options.get(0);
                choiceValues.add(value);
                int idx = i;
                Button b = Button.builder(Component.literal(fit(a.name() + ": " + (value.isEmpty() ? "–" : value), fieldW - 8)), btn -> {
                    String cur = choiceValues.get(idx);
                    String next = options.get((options.indexOf(cur) + 1) % options.size());
                    choiceValues.set(idx, next);
                    remember();
                    btn.setMessage(Component.literal(fit(a.name() + ": " + (next.isEmpty() ? "–" : next), fieldW - 8)));
                }).bounds(fx, fy, fieldW, H).build();
                addRenderableWidget(b);
                boxes.add(null);
            } else {
                choiceValues.add(null);
                EditBox box = new EditBox(font, fx, fy, fieldW, H, Component.literal(a.name()));
                box.setMaxLength(a.kind() == Kind.TEXT ? 250 : 64);
                box.setHint(Component.literal(a.hint()));
                box.setValue(value.isEmpty() ? suggestion(a) : value);
                addRenderableWidget(box);
                boxes.add(box);
            }
        }
        int ry = oneRow ? y : y + (n - 1) * STEP;
        String blocked = ctx.blocked(selected);
        Button run_ = Button.builder(Component.literal("Ausführen"), btn -> run(selected, values())).bounds(x + w - run, ry, run, H).build();
        run_.active = blocked == null;
        addRenderableWidget(run_);
        EditBox first = boxes.stream().filter(b -> b != null).findFirst().orElse(null);
        if (first != null) setInitialFocus(first);
    }

    private int[] argsAt;

    /** Sensible default: the section the player stands in or owns for section arguments. */
    private String suggestion(Arg a) {
        if (a.kind() != Kind.SECTION) return "";
        var t = client.team().state();
        if (t == null) return "";
        var mine = t.mine();
        return mine.isEmpty() ? "" : String.valueOf(mine.get(0).nr());
    }

    private List<String> values() {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < boxes.size(); i++) out.add(boxes.get(i) != null ? boxes.get(i).getValue() : choiceValues.get(i));
        return out;
    }

    private void remember() { if (selected != null) VALUES.put(selected.id(), values()); }

    /** Status tab: the most used buttons. */
    private static List<Entry> quick() {
        List<Entry> out = new ArrayList<>();
        for (String id : List.of("verbinden.zulassen", "team.erlauben", "fortschritt", "fehler", "material", "packliste", "geruest", "team", "team.material", "team.mein", "team.alle", "team.korb", "team.status",
                "bp.team", "bp.lager.liste", "bp.lager.bedarf", "bp.beitrag", "verbinden.status", "diagnose"))
            out.add(CommandCatalog.byId(id));
        return out;
    }

    // ------------------------------------------------------------------ actions

    private void click(Entry e) {
        if (e.hasArgs()) {
            remember();
            selected = selected == e ? null : e;
            message = "";
            rebuildWidgets();
            return;
        }
        run(e, List.of());
    }

    private void run(Entry e, List<String> values) {
        String cmd;
        try {
            cmd = CommandCatalog.command(e, values);
        } catch (IllegalArgumentException ex) {
            message = ex.getMessage();
            messageBad = true;
            return;
        }
        if (selected == e) remember();
        if (minecraft.player == null) return;
        REPLIES.sent(cmd, e.side() == Side.SERVER, System.currentTimeMillis());
        // Exactly what typing the command does: the loader runs client commands, everything else goes to the server.
        minecraft.player.connection.sendCommand(cmd);
        message = "Ausgeführt: /" + cmd;
        messageBad = false;
        statusCache = List.of();
        rebuildWidgets();
    }

    // ------------------------------------------------------------------ context and status

    CommandContext context() {
        Minecraft mc = Minecraft.getInstance();
        var con = mc.getConnection();
        boolean plugin = con != null && con.getCommands().getRoot().getChild("bp") != null;
        boolean container = false;
        if (mc.hitResult != null && mc.hitResult.getType() == HitResult.Type.BLOCK && mc.level != null && mc.player != null) {
            var pos = ((BlockHitResult) mc.hitResult).getBlockPos();
            container = mc.level.getBlockEntity(pos) instanceof net.minecraft.world.Container
                    && mc.player.distanceToSqr(pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5) <= 36.0;
        }
        return new CommandContext(client.hologram().active(), client.team().state() != null, client.team().role(), plugin, container);
    }

    private static String key(CommandContext c) { return c.plan() + "/" + c.team() + "/" + c.role() + "/" + c.plugin() + "/" + c.container(); }

    @Override
    public void tick() {
        super.tick();
        if (++ticks % 10 != 0) return;
        statusCache = List.of();
        String k = key(context());
        if (!k.equals(contextKey)) { remember(); rebuildWidgets(); }
    }

    private List<String[]> status() {
        if (!statusCache.isEmpty()) return statusCache;
        List<String[]> out = new ArrayList<>();
        Minecraft mc = Minecraft.getInstance();
        Hologram h = client.hologram();
        LiveCheck check = h.check();
        if (check == null) out.add(row("Kein Plan platziert – Plan-Menü (J)", 0xFFB0B0B0));
        else {
            int ok = check.count(Verdict.OK);
            out.add(row("Plan „" + h.plan().name() + "“: " + check.percent() + " % · " + ok + "/" + check.size() + (h.visible() ? "" : " · ausgeblendet"), 0xFF6BE07B));
            out.add(row("fehlt " + check.count(Verdict.MISSING) + " · falsch " + check.count(Verdict.WRONG) + " · Zustand " + check.count(Verdict.STATE)
                    + (check.count(Verdict.UNKNOWN) > 0 ? " · nicht geladen " + check.count(Verdict.UNKNOWN) : ""), 0xFFFFFFFF));
            String filter = (h.layers() == Hologram.Layers.ALL ? "alle Ebenen" : (h.layers() == Hologram.Layers.ONE ? "nur Ebene " : "bis Ebene ") + h.layerY())
                    + " · " + (h.sectionSetLabel() != null ? h.sectionSetLabel() : h.section() == 0 || h.sectionName() == null ? "alle Abschnitte" : "Abschnitt " + h.section() + " „" + h.sectionName() + "“");
            out.add(row(filter + " · Platzierhilfe " + h.guard().label + (h.xray() ? " · Röntgen" : ""), 0xFF40E0FF));
        }
        out.addAll(client.team().statusRows());
        LinkPrompt.Question q = LinkPrompt.current(client);
        if (q != null) out.add(row(q.text() + " → Knopf „" + q.yes() + "“", 0xFFFFD54A));
        boolean single = mc.isLocalServer();
        var con = mc.getConnection();
        String server = single ? "Einzelspieler" : con != null && con.getServerData() != null ? con.getServerData().ip : "Server";
        boolean plugin = con != null && con.getCommands().getRoot().getChild("bp") != null;
        out.add(row(server + " · Bauplaner-Plugin: " + (plugin ? "ja (/bp)" : "nein"), plugin ? 0xFF6BE07B : 0xFFB0B0B0));
        out.add(row(client.link().statusText(), 0xFFB0B0B0));
        statusCache = out;
        return out;
    }

    private static String[] row(String text, int color) { return new String[] { text, Integer.toHexString(color) }; }

    private int statusHeight() {
        if (wide()) return 0;
        // Narrow window: the status block only on the Status tab (other tabs need the room for their buttons),
        // and only as many lines as leave room for three button rows.
        if (!tab.equals(CommandCatalog.STATUS)) return 0;
        int line = font.lineHeight + 1;
        int room = height - 26 - 4 - replyLines() * line - 6 - tabsBottom - 3 * STEP - 6;
        int n = Math.min(Math.max(2, room / line), wrapped(statusWidth()).size());
        return n * line + 6;
    }

    private List<String[]> wrapped(int w) {
        List<String[]> out = new ArrayList<>();
        for (String[] r : status()) for (String l : wrap(r[0], w)) out.add(new String[] { l, r[1] });
        return out;
    }

    private int replyLines() { return height >= 300 ? 5 : 3; }

    // ------------------------------------------------------------------ drawing

    @Override
    public void extractRenderState(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta) {
        super.extractRenderState(g, mouseX, mouseY, delta);
        g.centeredText(font, title, width / 2, 6, 0xFFFFFFFF);
        int line = font.lineHeight + 1;
        // Status column (wide) or block (narrow).
        int sx = left(), sy = tabsBottom, sw = statusWidth();
        List<String[]> lines = wrapped(sw);
        int max = wide() ? (height - 30 - sy) / line - replyLines() - 1 : (statusHeight() - 6) / line;
        if (lines.size() > max) lines = lines.subList(0, Math.max(0, max));
        if (!lines.isEmpty()) g.fill(sx - 3, sy - 2, sx + sw + 3, sy + lines.size() * line + 1, 0x90000000);
        for (String[] r : lines) { g.text(font, r[0], sx, sy, (int) Long.parseLong(r[1], 16), true); sy += line; }
        if (pageLabel != null) g.text(font, pageLabel, pageLabelAt[0], pageLabelAt[1], 0xFFB0B0B0, true);
        if (selected != null && argsAt != null)
            g.text(font, fit("/" + selected.base() + " " + hints(selected) + " – " + selected.help(), listWidth()), argsAt[0], argsAt[1], 0xFFB0B0B0, true);
        // Answers.
        int footer = height - 26, n = replyLines();
        int ry = footer - 4 - n * line;
        int rw = width - 16;
        List<String[]> answer = new ArrayList<>();
        if (!message.isEmpty()) answer.add(new String[] { message, messageBad ? "FFFF5A5A" : "FF6BE07B" });
        for (ReplyLog.Line l : REPLIES.last(n)) for (String w : wrap(l.text(), rw)) answer.add(new String[] { w, l.sent() ? "FF40E0FF" : "FFFFFFFF" });
        if (answer.size() > n) answer = answer.subList(answer.size() - n, answer.size());
        g.fill(left() - 3, ry - 2, left() + rw + 3, ry + n * line + 1, 0x70000000);
        if (answer.isEmpty()) g.text(font, "Antworten erscheinen hier. Tipp: über einem Knopf steht der Befehl zum Eintippen.", left(), ry, 0xFF808080, true);
        for (String[] a : answer) { g.text(font, a[0], left(), ry, (int) Long.parseLong(a[1], 16), true); ry += line; }
    }

    private static String hints(Entry e) {
        StringBuilder b = new StringBuilder();
        for (Arg a : e.args()) b.append(b.length() == 0 ? "" : " ").append(a.optional() ? "[" : "<").append(a.kind() == Kind.CHOICE ? String.join("|", a.choices()) : a.name()).append(a.optional() ? "]" : ">");
        return b.toString();
    }

    private String fit(String s, int w) { return font.width(s) <= w ? s : font.plainSubstrByWidth(s, Math.max(0, w - font.width("…"))) + "…"; }

    private List<String> wrap(String s, int w) {
        List<String> out = new ArrayList<>();
        String rest = s;
        while (!rest.isEmpty() && out.size() < 6) {
            if (font.width(rest) <= w) { out.add(rest); break; }
            String part = font.plainSubstrByWidth(rest, w);
            int cut = part.lastIndexOf(' ');
            if (cut > part.length() / 3) part = part.substring(0, cut);
            if (part.isEmpty()) part = rest.substring(0, 1);
            out.add(part);
            rest = rest.substring(part.length()).stripLeading();
        }
        return out;
    }

    @Override
    public void removed() { remember(); super.removed(); }

    @Override
    public boolean isPauseScreen() { return false; }
}
