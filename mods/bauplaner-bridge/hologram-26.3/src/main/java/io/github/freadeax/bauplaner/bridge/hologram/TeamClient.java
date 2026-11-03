package io.github.freadeax.bauplaner.bridge.hologram;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import com.mojang.brigadier.builder.RequiredArgumentBuilder;
import com.mojang.brigadier.context.CommandContext;
import com.mojang.brigadier.suggestion.SuggestionProvider;
import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import io.github.freadeax.bauplaner.mod.PlanModel;
import io.github.freadeax.bauplaner.mod.team.TeamColors;
import io.github.freadeax.bauplaner.mod.team.TeamPlan;
import io.github.freadeax.bauplaner.mod.team.TeamState;
import io.github.freadeax.bauplaner.mod.team.TeamSync;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.phys.Vec3;

/**
 * Teambau in the game (COOP-03): who builds which section, shown where it is built. Frames around the
 * sections in the colour of their owner (free green, reported cyan, confirmed grey, rework red, the own
 * ones thicker), a HUD panel with the section underfoot and the own task with its progress, the
 * hologram reduced to "meine Abschnitte" or "freie Abschnitte", the own material list, a hint when the own
 * section is complete, team chests and notes at their place, and {@code /bauplaner team …} to take
 * over, give back, report, note and deliver without typing plugin commands.
 * <p>
 * The state comes from the planner (website link) or live from the server plugin ({@link TeamSync});
 * the mod never sends anything to the server unless the player allowed the team channel there.
 */
public final class TeamClient {
    private final Hologram hologram;
    private final TeamSync sync;
    /** State shown this tick (computed once per tick, read by render and HUD). */
    private volatile TeamState shown;
    private TeamPlan teamPlan;
    private TeamState planFor;
    private PlanModel planOf;
    private int[][] planBoxes;
    private LiveCheck boxesFor;
    private long boxesRevision = -1;
    /** Hologram focus kept up to date while the team moves: "mein", "frei" or null. */
    private String focus;
    private boolean frames = true, panel = true;
    private final Set<String> announcedDone = new HashSet<>();
    private int ticks;
    private String revisionWarned;

    public TeamClient(Path root, Hologram hologram, String version) {
        this.hologram = hologram;
        this.sync = new TeamSync(root.resolve("team"), version, System::currentTimeMillis,
                text -> { Minecraft mc = Minecraft.getInstance(); mc.execute(() -> McCompat.chat(mc, Component.literal("[Bauplaner] " + text))); });
    }

    public TeamSync sync() { return sync; }

    /** Current state with own waiting actions (null without a team). */
    public TeamState state() { return shown; }

    /** Joined a world or server; {@code transport} is null in singleplayer. */
    public void join(Minecraft mc, TeamSync.Transport transport) {
        sync.join(transport == null ? null : McCompat.worldKey(mc), transport);
        announcedDone.clear();
        refresh();
    }

    public void leave() { sync.leave(); refresh(); }

    /** A frame from the server on the team channel (any thread). */
    public void receive(byte[] frame) {
        sync.receive(frame);
        Minecraft.getInstance().execute(this::refresh);
    }

    private void refresh() { shown = sync.state(); }

    // ------------------------------------------------------------------ tick

    public void tick(Minecraft mc) {
        refresh();
        if (++ticks % 20 != 0 || mc.player == null) return;
        sync.tick();
        TeamState t = shown;
        TeamPlan tp = teamPlan(t);
        // Keep the hologram focus in step with the team (someone takes over a free section, I get one assigned …).
        if (focus != null) {
            if (hologram.sectionSet() == null || tp == null) focus = null;
            else if (focus.equals("mein")) hologram.setSectionSet(tp.numbersOf(t.me()), "Meine Abschnitte");
            else hologram.setSectionSet(tp.freeNumbers(), "Freie Abschnitte");
        }
        if (tp == null || t.me() == null || !hologram.active()) return;
        // Own section complete in the live check: suggest the report once.
        LiveCheck check = hologram.check();
        for (TeamState.Section s : t.mine()) {
            int k = tp.number(s.id());
            if (k == 0 || !(s.status().equals("vergeben") || s.status().equals("nacharbeit"))) continue;
            int[] p = TeamPlan.progress(check, k);
            int unknown = check.count(new io.github.freadeax.bauplaner.mod.Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, k))[Verdict.UNKNOWN.ordinal()];
            String key = s.id() + "/" + s.status();
            if (p[1] > 0 && p[0] == p[1] && unknown == 0 && announcedDone.add(key))
                McCompat.chat(mc, Component.literal("[Bauplaner] Dein Abschnitt " + s.nr() + " „" + s.name() + "“ steht laut Hologramm komplett. Fertig melden: /bauplaner team fertig " + s.nr())
                        .withStyle(net.minecraft.ChatFormatting.GREEN));
        }
        // Plan in the hologram older/newer than the released one: say it once per combination.
        Integer rel = t.revision();
        if (rel != null && hologram.plan() != null) {
            int own = hologram.plan().identity().revisionNumber();
            String key = own + "/" + rel;
            if (own != rel && !key.equals(revisionWarned)) {
                revisionWarned = key;
                McCompat.chat(mc, Component.literal("[Bauplaner] Achtung: Das Hologramm zeigt Planstand " + own + ", für das Team freigegeben ist Planstand " + rel
                        + ". Neuen Planstand im Planer exportieren oder über „Mit Spiel abgleichen“ schicken.").withStyle(net.minecraft.ChatFormatting.GOLD));
            }
        }
    }

    /** Team state meets the placed plan; null without team or plan. */
    private TeamPlan teamPlan(TeamState t) {
        if (t == null || !hologram.active()) { teamPlan = null; return null; }
        PlanModel plan = hologram.plan();
        if (teamPlan == null || planFor != t || planOf != plan) { teamPlan = new TeamPlan(t, plan); planFor = t; planOf = plan; }
        return teamPlan;
    }

    /** World boxes of the plan sections, rebuilt when the placement or the plan changes. */
    private int[][] planBoxes(LiveCheck check) {
        if (check != boxesFor) { planBoxes = TeamPlan.boxes(check); boxesFor = check; boxesRevision = check.revision(); }
        return planBoxes;
    }

    /** Box of a team section in the world: from the placed plan, else from the server file; null when unknown here. */
    private List<int[]> boxesOf(TeamState t, TeamPlan tp, TeamState.Section s) {
        if (tp != null) {
            int k = tp.number(s.id());
            int[][] b = planBoxes(hologram.check());
            if (k > 0 && k < b.length && b[k] != null) return List.of(b[k]);
        }
        return s.boxes();
    }

    /** Section where the player stands (plan box first, else server box). */
    private TeamState.Section sectionAt(TeamState t, TeamPlan tp, String dim, int x, int y, int z) {
        if (tp != null && hologram.check() != null && hologram.check().placement().dimension().equals(dim)) {
            for (TeamState.Section s : t.sections()) for (int[] b : boxesOf(t, tp, s)) if (x >= b[0] && x <= b[3] && y >= b[1] - 2 && y <= b[4] + 3 && z >= b[2] && z <= b[5]) return s;
        }
        return t.sectionAt(dim, x, y, z).orElse(null);
    }

    // ------------------------------------------------------------------ render

    public void render(PoseStack pose, SubmitNodeCollector out, Vec3 cam) {
        TeamState t = shown;
        Minecraft mc = Minecraft.getInstance();
        if (t == null || !frames || mc.level == null) return;
        String dim = McCompat.dimension(mc.level);
        TeamPlan tp = teamPlan(t);
        boolean planHere = tp != null && hologram.check().placement().dimension().equals(dim);
        if (!planHere && !t.dimension().equals(dim)) return;
        int ox = (int) Math.floor(cam.x), oy = (int) Math.floor(cam.y), oz = (int) Math.floor(cam.z);
        record Frame(int[] b, int color, float width) {}
        List<Frame> list = new ArrayList<>();
        for (TeamState.Section s : t.sections()) {
            List<int[]> boxes = planHere ? boxesOf(t, tp, s) : (t.dimension().equals(dim) ? s.boxes() : List.of());
            boolean mine = t.me() != null && t.me().equals(s.owner());
            int color = TeamColors.ofSection(t, s);
            if (s.pending()) color = TeamColors.alpha(color, 0x90);
            for (int[] b : boxes) {
                if (far(b, cam, 192)) continue;
                list.add(new Frame(b, color, mine ? 4.0f : 2.0f));
            }
        }
        // Team chests (COOP-04) in the colour of their check; notes as a post with a frame.
        List<Frame> marks = new ArrayList<>();
        for (TeamState.Store s : t.stores()) {
            if (!s.dimension().equals(dim)) continue;
            int[] a = s.pos(), b = s.pos2() == null ? s.pos() : s.pos2();
            int[] box = { Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]) };
            if (far(box, cam, 96)) continue;
            marks.add(new Frame(box, storeColor(s.status()), 3.0f));
        }
        for (TeamState.Note n : t.notes()) {
            if (n.pos() == null || !t.dimension().equals(dim)) continue;
            int[] box = { n.pos()[0], n.pos()[1], n.pos()[2], n.pos()[0], n.pos()[1], n.pos()[2] };
            if (far(box, cam, 64)) continue;
            marks.add(new Frame(box, noteColor(n.tag()), -1f));
        }
        if (list.isEmpty() && marks.isEmpty()) return;
        pose.pushPose();
        pose.translate(ox - cam.x, oy - cam.y, oz - cam.z);
        out.submitCustomGeometry(pose, RenderTypes.lines(), (p, vc) -> {
            for (Frame f : list) {
                int[] b = f.b;
                HologramRenderer.frame(p, vc, b[0] - ox - 0.08f, b[1] - oy - 0.08f, b[2] - oz - 0.08f, b[3] + 1.08f - ox, b[4] + 1.08f - oy, b[5] + 1.08f - oz, f.color, f.width);
            }
            for (Frame f : marks) {
                int[] b = f.b;
                if (f.width < 0) {
                    float x = b[0] - ox + 0.5f, y = b[1] - oy, z = b[2] - oz + 0.5f;
                    HologramRenderer.line(p, vc, x, y, z, x, y + 2.5f, z, f.color, 3.0f);
                    HologramRenderer.frame(p, vc, x - 0.2f, y + 2.5f, z - 0.2f, x + 0.2f, y + 2.9f, z + 0.2f, f.color, 3.0f);
                } else HologramRenderer.frame(p, vc, b[0] - ox - 0.02f, b[1] - oy - 0.02f, b[2] - oz - 0.02f, b[3] + 1.02f - ox, b[4] + 1.02f - oy, b[5] + 1.02f - oz, f.color, f.width);
            }
        });
        pose.popPose();
    }

    private static boolean far(int[] b, Vec3 cam, double r) {
        double dx = Math.max(0, Math.max(b[0] - cam.x, cam.x - b[3] - 1)), dy = Math.max(0, Math.max(b[1] - cam.y, cam.y - b[4] - 1)), dz = Math.max(0, Math.max(b[2] - cam.z, cam.z - b[5] - 1));
        return dx * dx + dy * dy + dz * dz > r * r;
    }

    static int storeColor(String status) {
        return switch (status) { case "geprueft" -> 0xFF6BE07B; case "abweichend" -> 0xFFFFD54A; case "fehlt" -> 0xFFFF5A5A; default -> 0xFFB0B0B0; };
    }

    static int noteColor(String tag) {
        return switch (tag) { case "frage" -> 0xFF5AA9FF; case "problem" -> 0xFFFF5A5A; case "material" -> 0xFFFF9F1C; default -> 0xFFFFFFFF; };
    }

    // ------------------------------------------------------------------ HUD

    private String hudKey = "";
    private List<String[]> hudRows = List.of();

    /** Team panel on the right, below the hologram panel area (bottom right, above the hotbar). */
    public void hud(GuiGraphicsExtractor g) {
        TeamState t = shown;
        Minecraft mc = Minecraft.getInstance();
        if (t == null || !panel || mc.player == null || mc.level == null || mc.gui.screen() != null) return;
        int px = mc.player.getBlockX(), py = mc.player.getBlockY(), pz = mc.player.getBlockZ();
        LiveCheck check = hologram.check();
        String key = System.identityHashCode(t) + "/" + px + "/" + py + "/" + pz + "/" + (check == null ? 0 : check.revision() + "/" + System.identityHashCode(check)) + "/" + sync.link();
        if (!key.equals(hudKey)) { hudRows = rows(t, mc, px, py, pz); hudKey = key; }
        var font = mc.font;
        int line = font.lineHeight + 2, width = 0;
        for (String[] r : hudRows) width = Math.max(width, font.width(r[0]));
        int x = g.guiWidth() - width - 6, y = g.guiHeight() - 40 - hudRows.size() * line;
        g.fill(x - 3, y - 3, x + width + 3, y + hudRows.size() * line - 1, 0x90000000);
        for (String[] r : hudRows) { g.text(font, r[0], x, y, (int) Long.parseLong(r[1], 16), true); y += line; }
    }

    private List<String[]> rows(TeamState t, Minecraft mc, int px, int py, int pz) {
        List<String[]> out = new ArrayList<>();
        TeamPlan tp = teamPlan(t);
        int waiting = sync.outbox().pending(t.teamId()).size();
        String where = t.source() == TeamState.Source.SERVER ? "live" : sync.link() == TeamSync.Link.ASK ? "Planer · Server-Plugin da" : "aus dem Planer";
        out.add(row("Team „" + t.name() + "“ · " + where + (waiting > 0 ? " · " + waiting + " wartet" : ""), t.source() == TeamState.Source.SERVER ? 0xFF6BE07B : 0xFFFFFFFF));
        TeamState.Section here = sectionAt(t, tp, McCompat.dimension(mc.level), px, py, pz);
        if (here != null) {
            String owner = here.owner() == null ? "frei – /bauplaner team nehmen " + here.nr() : t.nameOf(here.owner());
            out.add(row("Hier: " + here.nr() + " „" + here.name() + "“ · " + owner + " · " + TeamState.STATUS_LABEL.getOrDefault(here.pending() ? "wartet" : here.status(), here.status()),
                    TeamColors.ofSection(t, here)));
        }
        List<TeamState.Section> mine = t.mine();
        if (mine.isEmpty()) {
            if (t.me() == null) out.add(row(t.source() == TeamState.Source.SERVER ? "Du bist noch nicht im Team – /bauplaner team nehmen <nr>" : "Im Planer „Ich bin“ wählen", 0xFFB0B0B0));
            else if (t.count("frei") > 0) out.add(row("Kein Auftrag · " + t.count("frei") + " frei – /bauplaner team frei", 0xFFB0B0B0));
        } else {
            TeamState.Section s = mine.get(0);
            String progress = "";
            if (tp != null && tp.number(s.id()) > 0) {
                int[] p = TeamPlan.progress(hologram.check(), tp.number(s.id()));
                progress = " · " + TeamPlan.percent(p) + " % · " + p[2] + " offen";
            } else if (hologram.active()) progress = " · nicht im Plan";
            out.add(row("Mein Auftrag: " + s.nr() + " „" + s.name() + "“" + progress + (mine.size() > 1 ? " (+" + (mine.size() - 1) + ")" : ""), t.colorOf(t.me())));
            if ("nacharbeit".equals(s.status())) out.add(row("Nacharbeit verlangt – /bauplaner team abschnitte", 0xFFFF5A5A));
        }
        if (tp != null && tp.mismatch() != null) out.add(row(tp.mismatch(), 0xFFFF5A5A));
        // Nearest open note within 12 blocks.
        TeamState.Note near = null;
        double best = 144;
        for (TeamState.Note n : t.notes()) {
            if (n.pos() == null) continue;
            double dx = n.pos()[0] - px, dy = n.pos()[1] - py, dz = n.pos()[2] - pz, d = dx * dx + dy * dy + dz * dz;
            if (d < best) { best = d; near = n; }
        }
        if (near != null) {
            String text = near.text().length() > 48 ? near.text().substring(0, 47) + "…" : near.text();
            out.add(row("Notiz (" + (int) Math.sqrt(best) + " m, " + t.nameOf(near.by()) + "): " + text, noteColor(near.tag())));
        }
        return out;
    }

    private static String[] row(String text, int color) { return new String[] { text, Integer.toHexString(color) }; }

    // ------------------------------------------------------------------ commands

    private static <S> LiteralArgumentBuilder<S> literal(String name) { return LiteralArgumentBuilder.literal(name); }
    private static <S, T> RequiredArgumentBuilder<S, T> argument(String name, com.mojang.brigadier.arguments.ArgumentType<T> type) { return RequiredArgumentBuilder.argument(name, type); }

    private static void say(String text) { McCompat.chat(Minecraft.getInstance(), Component.literal("[Bauplaner] " + text)); }
    private static int said(String text) { say(text); return 1; }

    /** {@code /bauplaner team …} */
    public <S> LiteralArgumentBuilder<S> command() {
        SuggestionProvider<S> numbers = (c, b) -> { TeamState t = shown; if (t != null) t.sections().forEach(s -> b.suggest(String.valueOf(s.nr()))); return b.buildFuture(); };
        SuggestionProvider<S> players = (c, b) -> { TeamState t = shown; if (t != null) t.members().forEach(m -> b.suggest(m.player() != null ? m.player() : m.name().replace(' ', '_'))); return b.buildFuture(); };
        return TeamClient.<S>literal("team").executes(c -> overview())
                .then(TeamClient.<S>literal("abschnitte").executes(c -> sections()))
                .then(TeamClient.<S>literal("nehmen").then(TeamClient.<S, String>argument("abschnitt", StringArgumentType.word()).suggests(numbers)
                        .executes(c -> sectionAct(StringArgumentType.getString(c, "abschnitt"), "section.claim", null))))
                .then(TeamClient.<S>literal("abgeben").executes(c -> sectionAct(null, "section.release", null))
                        .then(TeamClient.<S, String>argument("abschnitt", StringArgumentType.word()).suggests(numbers).executes(c -> sectionAct(StringArgumentType.getString(c, "abschnitt"), "section.release", null))))
                .then(TeamClient.<S>literal("fertig").executes(c -> sectionAct(null, "section.done", null))
                        .then(TeamClient.<S, String>argument("abschnitt", StringArgumentType.word()).suggests(numbers).executes(c -> sectionAct(StringArgumentType.getString(c, "abschnitt"), "section.done", null))
                                .then(TeamClient.<S, String>argument("notiz", StringArgumentType.greedyString()).executes(c -> sectionAct(StringArgumentType.getString(c, "abschnitt"), "section.done", StringArgumentType.getString(c, "notiz"))))))
                .then(TeamClient.<S>literal("pruefen").then(TeamClient.<S, String>argument("abschnitt", StringArgumentType.word()).suggests(numbers)
                        .then(TeamClient.<S>literal("ok").executes(c -> verify(StringArgumentType.getString(c, "abschnitt"), true, null)))
                        .then(TeamClient.<S>literal("nacharbeit").executes(c -> verify(StringArgumentType.getString(c, "abschnitt"), false, null))
                                .then(TeamClient.<S, String>argument("notiz", StringArgumentType.greedyString()).executes(c -> verify(StringArgumentType.getString(c, "abschnitt"), false, StringArgumentType.getString(c, "notiz")))))))
                .then(TeamClient.<S>literal("zuweisen").then(TeamClient.<S, String>argument("abschnitt", StringArgumentType.word()).suggests(numbers)
                        .then(TeamClient.<S, String>argument("spieler", StringArgumentType.word()).suggests(players).executes(c -> assign(StringArgumentType.getString(c, "abschnitt"), StringArgumentType.getString(c, "spieler"))))))
                .then(TeamClient.<S>literal("zeigen").then(TeamClient.<S, String>argument("abschnitt", StringArgumentType.word()).suggests(numbers).executes(c -> show(StringArgumentType.getString(c, "abschnitt")))))
                .then(TeamClient.<S>literal("mein").executes(c -> focus("mein")))
                .then(TeamClient.<S>literal("frei").executes(c -> focus("frei")))
                .then(TeamClient.<S>literal("alle").executes(c -> { focus = null; hologram.setSectionSet(null, null); return said("Hologramm zeigt wieder alle Abschnitte."); }))
                .then(TeamClient.<S>literal("material").executes(c -> material(null))
                        .then(TeamClient.<S, String>argument("spieler", StringArgumentType.word()).suggests(players).executes(c -> material(StringArgumentType.getString(c, "spieler")))))
                .then(TeamClient.<S>literal("notiz").then(TeamClient.<S, String>argument("art", StringArgumentType.word()).suggests((c, b) -> { List.of("frage", "problem", "material", "info").forEach(b::suggest); return b.buildFuture(); })
                        .then(TeamClient.<S, String>argument("text", StringArgumentType.greedyString()).executes(c -> note(StringArgumentType.getString(c, "art"), StringArgumentType.getString(c, "text"))))))
                .then(TeamClient.<S>literal("notizen").executes(c -> notes()))
                .then(TeamClient.<S>literal("erledigt").then(TeamClient.<S, String>argument("notiz", StringArgumentType.word()).executes(c -> resolve(StringArgumentType.getString(c, "notiz")))))
                .then(TeamClient.<S>literal("geliefert").then(TeamClient.<S>literal("hand").executes(c -> deliveredHand()))
                        .then(TeamClient.<S, String>argument("item", StringArgumentType.word()).then(TeamClient.<S, Integer>argument("menge", IntegerArgumentType.integer(1, 1_000_000))
                                .executes(c -> delivered(StringArgumentType.getString(c, "item"), IntegerArgumentType.getInteger(c, "menge"))))))
                .then(TeamClient.<S>literal("sammle").then(TeamClient.<S, String>argument("item", StringArgumentType.word()).then(TeamClient.<S, Integer>argument("menge", IntegerArgumentType.integer(1, 1_000_000))
                        .executes(c -> gather(StringArgumentType.getString(c, "item"), IntegerArgumentType.getInteger(c, "menge"))))))
                .then(TeamClient.<S>literal("lager").executes(c -> stores()))
                .then(TeamClient.<S>literal("erlauben").executes(c -> said(sync.allow(true))))
                .then(TeamClient.<S>literal("verbieten").executes(c -> said(sync.allow(false))))
                .then(TeamClient.<S>literal("status").executes(c -> status()))
                .then(TeamClient.<S>literal("korb").executes(c -> outbox(false)).then(TeamClient.<S>literal("leeren").executes(c -> outbox(true))))
                .then(TeamClient.<S>literal("rahmen").executes(c -> { frames = !frames; return said(frames ? "Abschnittsrahmen an." : "Abschnittsrahmen aus."); }))
                .then(TeamClient.<S>literal("anzeige").executes(c -> { panel = !panel; return said(panel ? "Teamanzeige an." : "Teamanzeige aus."); }));
    }

    private TeamState need() {
        TeamState t = shown;
        if (t == null) say("Kein Teamstand. Im Planer (Reiter „Team“) „Mit Spiel abgleichen“ wählen, oder auf einem Server mit Bauplaner-Plugin spielen ("
                + sync.link().label + ").");
        return t;
    }

    private int overview() {
        TeamState t = need();
        if (t == null) return 0;
        say(t.summary() + ".");
        say("Verbindung: " + sync.link().label + (t.me() != null ? " · du bist " + t.nameOf(t.me()) + " (" + TeamState.ROLE_LABEL.getOrDefault(t.roleOf(t.me()), "Helfer") + ")" : ""));
        List<TeamState.Section> mine = t.mine();
        if (!mine.isEmpty()) say("Deine Abschnitte: " + String.join(", ", mine.stream().map(s -> s.nr() + " „" + s.name() + "“ (" + TeamState.STATUS_LABEL.get(s.status()) + ")").toList()));
        List<TeamState.Section> free = t.sections().stream().filter(TeamState.Section::free).limit(5).toList();
        if (!free.isEmpty()) say("Frei: " + String.join(", ", free.stream().map(s -> s.nr() + " „" + s.name() + "“").toList()) + " – /bauplaner team nehmen <nr>");
        int waiting = sync.outbox().pending(t.teamId()).size();
        if (waiting > 0) say(waiting + " eigene Meldung(en) warten auf Abgleich: /bauplaner team korb");
        say("Befehle: abschnitte, nehmen, abgeben, fertig, mein, frei, material, notiz, geliefert, lager, status, erlauben");
        return 1;
    }

    private int sections() {
        TeamState t = need();
        if (t == null) return 0;
        TeamPlan tp = teamPlan(t);
        say("Abschnitte (" + t.sections().size() + "):");
        for (TeamState.Section s : t.sections()) {
            String owner = s.owner() == null ? "frei" : t.nameOf(s.owner());
            String progress = "";
            if (tp != null && tp.number(s.id()) > 0) progress = " · " + TeamPlan.percent(TeamPlan.progress(hologram.check(), tp.number(s.id()))) + " %";
            McCompat.chat(Minecraft.getInstance(), Component.literal("  " + s.nr() + ". " + s.name() + " – " + owner + " · " + TeamState.STATUS_LABEL.getOrDefault(s.pending() ? "wartet" : s.status(), s.status()) + progress)
                    .withColor(TeamColors.ofSection(t, s) & 0xFFFFFF));
        }
        return t.sections().size();
    }

    private Optional<TeamState.Section> section(TeamState t, String ref, boolean ownFirst) {
        if (ref != null) {
            Optional<TeamState.Section> s = t.findSection(ref);
            if (s.isEmpty()) say("Abschnitt „" + ref + "“ gibt es nicht. /bauplaner team abschnitte listet alle.");
            return s;
        }
        // Without a number: the section underfoot, else the only own one.
        Minecraft mc = Minecraft.getInstance();
        TeamState.Section here = mc.player == null ? null : sectionAt(t, teamPlan(t), McCompat.dimension(mc.level), mc.player.getBlockX(), mc.player.getBlockY(), mc.player.getBlockZ());
        if (here != null && (!ownFirst || t.me() != null && t.me().equals(here.owner()))) return Optional.of(here);
        List<TeamState.Section> mine = t.mine();
        if (ownFirst && mine.size() == 1) return Optional.of(mine.get(0));
        say("Welcher Abschnitt? Nummer angeben (/bauplaner team abschnitte).");
        return Optional.empty();
    }

    private int sectionAct(String ref, String kind, String note) {
        TeamState t = need();
        if (t == null) return 0;
        Optional<TeamState.Section> s = section(t, ref, !kind.equals("section.claim"));
        if (s.isEmpty()) return 0;
        TeamState.Section sec = s.get();
        String me = t.me();
        switch (kind) {
            case "section.claim" -> {
                if (me != null && me.equals(sec.owner())) return said("Abschnitt " + sec.nr() + " gehört schon dir.");
                if (!sec.free()) say("Hinweis: Abschnitt " + sec.nr() + " hat schon " + t.nameOf(sec.owner()) + " – Server oder Planer entscheiden, wer ihn bekommt.");
            }
            case "section.release" -> { if (me != null && !me.equals(sec.owner())) return said("Abschnitt " + sec.nr() + " gehört nicht dir."); }
            default -> { }
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("section", sec.id());
        if (note != null && !note.isBlank()) body.put("note", note.length() > 300 ? note.substring(0, 300) : note);
        String what = switch (kind) {
            case "section.claim" -> "Abschnitt " + sec.nr() + " „" + sec.name() + "“ übernommen";
            case "section.release" -> "Abschnitt " + sec.nr() + " „" + sec.name() + "“ zurückgegeben";
            default -> "Abschnitt " + sec.nr() + " „" + sec.name() + "“ fertig gemeldet";
        };
        String r = sync.act(kind, body, what);
        refresh();
        return said(r);
    }

    private boolean atLeastMeister(TeamState t) {
        String role = t.roleOf(t.me());
        if (role.equals("meister") || role.equals("leitung")) return true;
        say("Das dürfen nur Baumeister und Bauleitung.");
        return false;
    }

    private int verify(String ref, boolean ok, String note) {
        TeamState t = need();
        if (t == null || !atLeastMeister(t)) return 0;
        Optional<TeamState.Section> s = section(t, ref, false);
        if (s.isEmpty()) return 0;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("section", s.get().id());
        body.put("ok", ok);
        if (note != null && !note.isBlank()) body.put("note", note);
        return said(sync.act("section.verify", body, "Abschnitt " + s.get().nr() + (ok ? " bestätigt" : " zur Nacharbeit")));
    }

    private Optional<TeamState.Member> member(TeamState t, String name) {
        return t.memberOfPlayer(name).or(() -> t.members().stream().filter(m -> m.name().equalsIgnoreCase(name) || m.name().replace(' ', '_').equalsIgnoreCase(name)).findFirst());
    }

    private int assign(String ref, String player) {
        TeamState t = need();
        if (t == null || !atLeastMeister(t)) return 0;
        Optional<TeamState.Section> s = section(t, ref, false);
        Optional<TeamState.Member> m = member(t, player);
        if (s.isEmpty()) return 0;
        if (m.isEmpty()) return said("„" + player + "“ ist nicht im Team.");
        return said(sync.act("section.assign", Map.of("section", s.get().id(), "member", m.get().id()), "Abschnitt " + s.get().nr() + " an " + m.get().name() + " zugewiesen"));
    }

    private int show(String ref) {
        TeamState t = need();
        if (t == null) return 0;
        Optional<TeamState.Section> s = section(t, ref, false);
        if (s.isEmpty()) return 0;
        TeamPlan tp = teamPlan(t);
        int k = tp == null ? 0 : tp.number(s.get().id());
        if (k > 0) { focus = null; return said(hologram.setSection(k)); }
        if (!s.get().boxes().isEmpty()) {
            int[] b = s.get().boxes().get(0);
            return said("Abschnitt " + s.get().nr() + " „" + s.get().name() + "“ liegt bei " + b[0] + " " + b[1] + " " + b[2] + " bis " + b[3] + " " + b[4] + " " + b[5] + " (Rahmen in der Welt).");
        }
        return said("Abschnitt " + s.get().nr() + " ist im eingeblendeten Plan nicht enthalten. Plan des Teams einblenden (J).");
    }

    private int focus(String what) {
        TeamState t = need();
        if (t == null) return 0;
        TeamPlan tp = teamPlan(t);
        if (tp == null) return said("Erst den Plan des Teams einblenden (J), dann zeigt das Hologramm nur die gewählten Abschnitte.");
        Set<Integer> set = what.equals("mein") ? tp.numbersOf(t.me()) : tp.freeNumbers();
        if (set.isEmpty()) return said(what.equals("mein") ? "Du hast keinen offenen Abschnitt. Freie zeigen: /bauplaner team frei" : "Kein Abschnitt ist frei.");
        focus = what;
        hologram.setSectionSet(set, what.equals("mein") ? "Meine Abschnitte" : "Freie Abschnitte");
        return said("Hologramm zeigt nur " + (what.equals("mein") ? "deine" : "freie") + " Abschnitte (" + set.size() + "); Materialliste, Fehlersuche und Fortschritt ebenso. Zurück: /bauplaner team alle");
    }

    private int material(String player) {
        TeamState t = need();
        if (t == null) return 0;
        TeamPlan tp = teamPlan(t);
        if (tp == null) return said("Erst den Plan des Teams einblenden (J).");
        Minecraft mc = Minecraft.getInstance();
        String member = player == null ? t.me() : member(t, player).map(TeamState.Member::id).orElse(null);
        if (member == null) return said(player == null ? "Du bist (noch) nicht im Team." : "„" + player + "“ ist nicht im Team.");
        boolean self = member.equals(t.me());
        Map<String, Integer> carried = new HashMap<>();
        if (self && mc.player != null) {
            var inv = McCompat.carried(mc.player);
            for (var l : io.github.freadeax.bauplaner.mod.Materials.of(hologram.check())) {
                var item = MaterialScreen.item(l.id());
                if (item != net.minecraft.world.item.Items.AIR) carried.put(l.id(), inv.getOrDefault(item, 0));
            }
        }
        var needs = tp.needs(hologram.check(), member, carried, TeamPlan.ready(t));
        if (needs.isEmpty()) return said(t.nameOf(member) + ": nichts mehr offen in den eigenen Abschnitten.");
        int open = needs.stream().mapToInt(TeamPlan.Need::open).sum(), fetch = needs.stream().mapToInt(TeamPlan.Need::fetch).sum();
        say("Material für " + t.nameOf(member) + " (" + tp.numbersOf(member).size() + " Abschnitte): " + open + " Blöcke offen" + (self ? ", " + fetch + " noch holen" : "") + ":");
        int n = 0;
        for (TeamPlan.Need l : needs) {
            if (n++ >= 12) { say("  … " + (needs.size() - 12) + " weitere – Menü (J) → Materialliste mit /bauplaner team mein"); break; }
            String name = McCompat.blockName(io.github.freadeax.bauplaner.mod.BlockState.parse(l.id()));
            say("  " + name + ": " + l.open() + (self ? " (dabei " + l.carried() + ", holen " + l.fetch() + ")" : "") + (l.ready() > 0 ? " · im Lager " + l.ready() : ""));
        }
        return 1;
    }

    private int note(String tag, String text) {
        if (!List.of("frage", "problem", "material", "info").contains(tag)) return said("Art: frage, problem, material oder info.");
        TeamState t = need();
        Minecraft mc = Minecraft.getInstance();
        if (t == null || mc.player == null) return 0;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("noteId", "note_m" + io.github.freadeax.bauplaner.mod.team.TeamOutbox.newId().substring(5));
        body.put("text", text.length() > 500 ? text.substring(0, 500) : text);
        body.put("tag", tag);
        body.put("pos", List.of(mc.player.getBlockX(), mc.player.getBlockY(), mc.player.getBlockZ()));
        TeamState.Section here = sectionAt(t, teamPlan(t), McCompat.dimension(mc.level), mc.player.getBlockX(), mc.player.getBlockY(), mc.player.getBlockZ());
        if (here != null) body.put("section", here.id());
        return said(sync.act("note.add", body, "Notiz gesetzt"));
    }

    private int notes() {
        TeamState t = need();
        Minecraft mc = Minecraft.getInstance();
        if (t == null || mc.player == null) return 0;
        List<TeamState.Note> list = new ArrayList<>(t.notes());
        if (list.isEmpty()) return said("Keine offenen Notizen.");
        double x = mc.player.getX(), y = mc.player.getY(), z = mc.player.getZ();
        list.sort(java.util.Comparator.comparingDouble(n -> n.pos() == null ? Double.MAX_VALUE : Math.pow(n.pos()[0] - x, 2) + Math.pow(n.pos()[1] - y, 2) + Math.pow(n.pos()[2] - z, 2)));
        say("Offene Notizen (" + list.size() + "), nächste zuerst. Erledigen: /bauplaner team erledigt <id>");
        for (TeamState.Note n : list.subList(0, Math.min(10, list.size()))) {
            String where = n.pos() == null ? "" : " @ " + n.pos()[0] + " " + n.pos()[1] + " " + n.pos()[2] + " (" + (int) Math.sqrt(Math.pow(n.pos()[0] - x, 2) + Math.pow(n.pos()[2] - z, 2)) + " m " + HologramHud.compass(n.pos()[0] + 0.5 - x, n.pos()[2] + 0.5 - z) + ")";
            McCompat.chat(mc, Component.literal("  [" + n.tag() + "] " + n.text() + " – " + t.nameOf(n.by()) + where + " · " + n.id()).withColor(noteColor(n.tag()) & 0xFFFFFF));
        }
        return list.size();
    }

    private int resolve(String id) {
        TeamState t = need();
        if (t == null) return 0;
        if (t.notes().stream().noneMatch(n -> n.id().equals(id))) return said("Keine offene Notiz mit der ID " + id + ".");
        return said(sync.act("note.resolve", Map.of("noteId", id), "Notiz erledigt"));
    }

    private int deliveredHand() {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null) return 0;
        var stack = mc.player.getMainHandItem();
        if (stack.isEmpty()) return said("Nichts in der Hand.");
        return delivered(BuiltInRegistries.ITEM.getKey(stack.getItem()).toString(), stack.getCount());
    }

    private int delivered(String item, int count) {
        String id = item.contains(":") ? item.toLowerCase(Locale.ROOT) : "minecraft:" + item.toLowerCase(Locale.ROOT);
        if (!id.matches("[a-z0-9_.-]+:[a-z0-9_./-]+")) return said("Item-ID ungültig: " + item);
        TeamState t = need();
        if (t == null) return 0;
        Map<String, Object> line = Map.of("item", id, "count", count);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", List.of(line));
        t.mine().stream().findFirst().ifPresent(s -> body.put("section", s.id()));
        return said(sync.act("contribution", body, count + "× " + id + " als geliefert gemeldet"));
    }

    private int gather(String item, int count) {
        String id = item.contains(":") ? item.toLowerCase(Locale.ROOT) : "minecraft:" + item.toLowerCase(Locale.ROOT);
        if (!id.matches("[a-z0-9_.-]+:[a-z0-9_./-]+")) return said("Item-ID ungültig: " + item);
        if (need() == null) return 0;
        return said(sync.act("gather.claim", Map.of("item", id, "count", count), "Sammelauftrag " + count + "× " + id + " übernommen"));
    }

    private int stores() {
        TeamState t = need();
        Minecraft mc = Minecraft.getInstance();
        if (t == null || mc.player == null) return 0;
        if (t.stores().isEmpty()) return said(t.source() == TeamState.Source.SERVER ? "Keine markierten Lagerkisten auf dem Server." : "Lagerkisten kommen vom Server-Plugin (Teamkanal).");
        say("Lagerkisten (" + t.stores().size() + "):");
        for (TeamState.Store s : t.stores()) {
            int total = s.items().stream().mapToInt(TeamState.Item::count).sum();
            String top = String.join(", ", s.items().stream().sorted(java.util.Comparator.comparingInt(TeamState.Item::count).reversed()).limit(3)
                    .map(i -> i.count() + " " + McCompat.blockName(io.github.freadeax.bauplaner.mod.BlockState.parse(i.item()))).toList());
            McCompat.chat(mc, Component.literal("  " + s.name() + " (" + s.purpose() + ") @ " + s.pos()[0] + " " + s.pos()[1] + " " + s.pos()[2] + " · " + s.status() + " · " + total + " Items" + (top.isEmpty() ? "" : ": " + top) + (s.more() ? " …" : ""))
                    .withColor(storeColor(s.status()) & 0xFFFFFF));
        }
        return t.stores().size();
    }

    private int status() {
        TeamState p = sync.planerState(), s = sync.serverState();
        say("Teamkanal: " + sync.link().label + (sync.allowed() ? " (erlaubt)" : ""));
        say("Vom Planer: " + (p == null ? "nichts" : p.summary() + " · vor " + (System.currentTimeMillis() - sync.planerAt()) / 1000 + " s"));
        say("Vom Server: " + (s == null ? "nichts" : s.summary() + " · vor " + (System.currentTimeMillis() - sync.serverAt()) / 1000 + " s"));
        say("Ausgangskorb: " + sync.outbox().pending().size() + (sync.lastError() == null ? "" : " · letzter Fehler: " + sync.lastError()));
        List<String> rej = sync.rejections();
        if (!rej.isEmpty()) say("Zuletzt abgelehnt: " + rej.get(rej.size() - 1));
        return 1;
    }

    private int outbox(boolean clear) {
        var list = sync.outbox().pending();
        if (clear) { sync.outbox().clear(); refresh(); return said(list.size() + " wartende Meldung(en) verworfen."); }
        if (list.isEmpty()) return said("Der Ausgangskorb ist leer – alles abgeglichen.");
        say(list.size() + " Meldung(en) warten (gehen an den Server, sobald der Teamkanal steht, oder an den Planer beim nächsten Abgleich):");
        for (var a : list) say("  " + a.at().substring(0, Math.min(16, a.at().length())).replace('T', ' ') + " " + a.kind() + (a.str("section") != null ? " " + a.str("section") : ""));
        return list.size();
    }
}
