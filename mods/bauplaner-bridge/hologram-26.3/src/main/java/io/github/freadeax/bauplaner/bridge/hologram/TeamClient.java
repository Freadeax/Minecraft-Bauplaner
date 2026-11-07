package io.github.freadeax.bauplaner.bridge.hologram;

import static io.github.freadeax.bauplaner.mod.Lang.t;

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
        java.util.function.Consumer<String> say = text -> { Minecraft mc = Minecraft.getInstance(); mc.execute(() -> McCompat.chat(mc, Component.literal("[Build Studio] " + text))); };
        this.sync = new TeamSync(root.resolve("team"), version, System::currentTimeMillis, say);
        // LINK-07: team room without a server file – the room comes from the planner („Mein Spiel verbinden“).
        this.sync.room(new io.github.freadeax.bauplaner.mod.room.RoomClient(root.resolve("team").resolve("raum.json"), say));
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

    // ------------------------------------------------------------------ reports to the team room (LINK-07)

    /** Last section.seen per section: "placed/total/wrong" and when it was sent. */
    private final java.util.Map<String, String> seenSent = new java.util.HashMap<>();
    private final java.util.Map<String, Long> seenAt = new java.util.HashMap<>();
    private static final long SEEN_EVERY = 30_000;
    private long seenRun;

    /**
     * section.seen: what the hologram measures for each section of the placed plan – at most every 30 s per
     * section and only when it changed. Unverified (origin planer); the plugin's tally stays the proof.
     */
    private void reportSections(TeamState t, TeamPlan tp, io.github.freadeax.bauplaner.mod.room.RoomClient room) {
        LiveCheck check = hologram.check();
        if (tp == null || check == null || !hologram.active() || t.me() == null) return;
        long now = System.currentTimeMillis();
        if (now - seenRun < 10_000) return; // counting per section walks the plan: every 10 s is plenty
        seenRun = now;
        for (TeamState.Section s : t.sections()) {
            int k = tp.number(s.id());
            if (k == 0) continue;
            int[] p = TeamPlan.progress(check, k);
            int[] counts = check.count(new io.github.freadeax.bauplaner.mod.Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, k));
            if (counts[Verdict.UNKNOWN.ordinal()] > 0 && p[0] == 0) continue; // not loaded yet: nothing measured
            int wrong = counts[Verdict.WRONG.ordinal()];
            String sig = p[0] + "/" + p[1] + "/" + wrong;
            if (sig.equals(seenSent.get(s.id())) || now - seenAt.getOrDefault(s.id(), 0L) < SEEN_EVERY) continue;
            java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("section", s.id()); body.put("placed", p[0]); body.put("total", p[1]);
            if (wrong > 0) body.put("wrong", wrong);
            List<java.util.Map<String, Object>> missing = new ArrayList<>();
            for (var l : io.github.freadeax.bauplaner.mod.Materials.of(check, new io.github.freadeax.bauplaner.mod.Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, k))) {
                if (missing.size() >= 24 || l.open() <= 0) break;
                missing.add(java.util.Map.of("item", l.id(), "count", l.open()));
            }
            if (!missing.isEmpty()) body.put("missing", missing);
            if (room.report("section.seen", body)) { seenSent.put(s.id(), sig); seenAt.put(s.id(), now); }
        }
    }

    /** Store chest the open container belongs to (looked at when the screen opened), and its last content. */
    private String chestOpen;
    private java.util.Map<String, Integer> chestItems;
    private boolean screenWas;

    /** store.seen: content of a known team chest when it is opened and again when it is closed. */
    private void watchChest(Minecraft mc) {
        boolean open = mc.gui.screen() instanceof net.minecraft.client.gui.screens.inventory.AbstractContainerScreen<?>;
        if (open && !screenWas) {
            chestOpen = null;
            TeamState t = shown;
            var room = sync.room();
            if (t != null && room != null && room.config() != null && mc.hitResult instanceof net.minecraft.world.phys.BlockHitResult hit && hit.getType() == net.minecraft.world.phys.HitResult.Type.BLOCK) {
                var pos = hit.getBlockPos();
                String dim = McCompat.dimension(mc.level);
                for (TeamState.Store s : t.stores()) {
                    if (!s.dimension().equals(dim)) continue;
                    int[] a = s.pos(), b = s.pos2() == null ? s.pos() : s.pos2();
                    if (pos.getX() >= Math.min(a[0], b[0]) && pos.getX() <= Math.max(a[0], b[0]) && pos.getY() >= Math.min(a[1], b[1]) && pos.getY() <= Math.max(a[1], b[1])
                            && pos.getZ() >= Math.min(a[2], b[2]) && pos.getZ() <= Math.max(a[2], b[2])) { chestOpen = s.id(); break; }
                }
            }
            chestItems = null;
        }
        if (open && chestOpen != null) {
            var now = McCompat.openContainer(mc);
            // Content arrives a tick after the screen: report the first non-empty view (or empty after a second).
            if (now != null && chestItems == null && (!now.isEmpty() || ticks % 20 == 19)) { chestItems = now; reportChest(chestOpen, now); }
            else if (now != null) chestItems = now;
        }
        if (!open && screenWas && chestOpen != null && chestItems != null) reportChest(chestOpen, chestItems);
        if (!open) chestOpen = null;
        screenWas = open;
    }

    private void reportChest(String chest, java.util.Map<String, Integer> items) {
        var room = sync.room();
        if (room == null) return;
        List<java.util.Map<String, Object>> list = new ArrayList<>();
        for (var e : items.entrySet()) { if (list.size() >= 64) break; list.add(java.util.Map.of("item", e.getKey(), "count", e.getValue())); }
        java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("chest", chest); body.put("items", list);
        if (items.size() > 64) body.put("more", true);
        room.report("store.seen", body);
    }

    // ------------------------------------------------------------------ tick

    public void tick(Minecraft mc) {
        refresh();
        if (mc.player != null && mc.level != null) watchChest(mc);
        var room = sync.room();
        if (room != null && room.live() && mc.player != null && mc.level != null) {
            room.player(mc.player.getGameProfile().name());
            room.position(mc.player.getBlockX(), mc.player.getBlockY(), mc.player.getBlockZ(), McCompat.dimension(mc.level), mc.player.getYRot(), System.currentTimeMillis());
        }
        if (++ticks % 20 != 0 || mc.player == null) return;
        sync.tick();
        TeamState t = shown;
        // FALLBACK-01: measurements are also taken while the room is away (shown state from raum-stand.json); the
        // room client keeps the newest per section and sends it on reconnect.
        if (room != null && room.config() != null && t != null && t.source() == TeamState.Source.ROOM && mc.level != null) {
            if (room.live()) {
                TeamState.Section at = sectionAt(t, teamPlan(t), McCompat.dimension(mc.level), mc.player.getBlockX(), mc.player.getBlockY(), mc.player.getBlockZ());
                room.section(at == null ? null : at.id());
            }
            reportSections(t, teamPlan(t), room);
        }
        TeamPlan tp = teamPlan(t);
        // Keep the hologram focus in step with the team (someone takes over a free section, I get one assigned …).
        if (focus != null) {
            if (hologram.sectionSet() == null || tp == null) focus = null;
            else if (focus.equals("mein")) hologram.setSectionSet(tp.numbersOf(t.me()), t("Meine Abschnitte", "My sections"));
            else hologram.setSectionSet(tp.freeNumbers(), t("Freie Abschnitte", "Free sections"));
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
                McCompat.chat(mc, Component.literal("[Build Studio] " + t("Dein Abschnitt " + s.nr() + " „" + s.name() + "“ steht laut Hologramm komplett. Fertig melden: /bauplaner team fertig " + s.nr(), "Your section " + s.nr() + " “" + s.name() + "” is complete according to the hologram. Report done: /buildplanner team done " + s.nr()))
                        .withStyle(net.minecraft.ChatFormatting.GREEN));
        }
        // Plan in the hologram older/newer than the released one: say it once per combination.
        Integer rel = t.revision();
        if (rel != null && hologram.plan() != null) {
            int own = hologram.plan().identity().revisionNumber();
            String key = own + "/" + rel;
            if (own != rel && !key.equals(revisionWarned)) {
                revisionWarned = key;
                McCompat.chat(mc, Component.literal("[Build Studio] " + t("Achtung: Das Hologramm zeigt Planstand " + own + ", für das Team freigegeben ist Planstand " + rel
                        + ". Neuen Planstand im Planer exportieren oder über „Mit Spiel abgleichen“ schicken.", "Warning: the hologram shows plan revision " + own + ", the team released revision " + rel
                        + ". Export the new revision in the planner or send it with “Compare with game”.")).withStyle(net.minecraft.ChatFormatting.GOLD));
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
        crewFrames.clear();
        for (TeamState.Section s : t.sections()) {
            List<int[]> boxes = planHere ? boxesOf(t, tp, s) : (t.dimension().equals(dim) ? s.boxes() : List.of());
            boolean mine = s.builds(t.me());
            int color = TeamColors.ofSection(t, s);
            if (s.pending()) color = TeamColors.alpha(color, 0x90);
            int[] crew = TeamColors.ofCrew(t, s);
            for (int[] b : boxes) {
                if (far(b, cam, 192)) continue;
                list.add(new Frame(b, color, mine ? 4.0f : 2.0f));
                // TEAM-03: every Mitbauer as a thinner frame just inside the owner's, in their own colour.
                for (int i = 0; i < crew.length; i++) crewFrames.add(new CrewFrame(b, s.pending() ? TeamColors.alpha(crew[i], 0x90) : crew[i], i + 1));
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
        List<CrewFrame> crewList = List.copyOf(crewFrames);
        pose.pushPose();
        pose.translate(ox - cam.x, oy - cam.y, oz - cam.z);
        out.submitCustomGeometry(pose, RenderTypes.lines(), (p, vc) -> {
            for (Frame f : list) {
                int[] b = f.b;
                HologramRenderer.frame(p, vc, b[0] - ox - 0.08f, b[1] - oy - 0.08f, b[2] - oz - 0.08f, b[3] + 1.08f - ox, b[4] + 1.08f - oy, b[5] + 1.08f - oz, f.color, f.width);
            }
            for (CrewFrame f : crewList) {
                float[] q = TeamColors.crewInset(f.b(), f.slot());
                if (q != null) HologramRenderer.frame(p, vc, q[0] - ox, q[1] - oy, q[2] - oz, q[3] - ox, q[4] - oy, q[5] - oz, f.color(), 2.0f);
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

    /** A Mitbauer frame: box, colour, place inside the owner frame (1 = first Mitbauer). */
    private record CrewFrame(int[] b, int color, int slot) {}
    private final List<CrewFrame> crewFrames = new ArrayList<>();

    private static boolean far(int[] b, Vec3 cam, double r) {
        double dx = Math.max(0, Math.max(b[0] - cam.x, cam.x - b[3] - 1)), dy = Math.max(0, Math.max(b[1] - cam.y, cam.y - b[4] - 1)), dz = Math.max(0, Math.max(b[2] - cam.z, cam.z - b[5] - 1));
        return dx * dx + dy * dy + dz * dz > r * r;
    }

    static int storeColor(String status) {
        return switch (status) { case "geprueft" -> HudCard.ACCENT; case "abweichend" -> HudCard.GOLD; case "fehlt" -> HudCard.ERROR; default -> HudCard.MUTED; };
    }

    static int noteColor(String tag) {
        return switch (tag) { case "frage" -> 0xFF5AA9FF; case "problem" -> HudCard.ERROR; case "material" -> 0xFFFF9F1C; default -> HudCard.TEXT; };
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
        // GAME-12: compact panel shows the first three rows (team, here, my task); "ausführlich" shows all.
        List<String[]> rows = ClientSettings.panel() == ClientSettings.Panel.DETAILED || hudRows.size() <= 3 ? hudRows : hudRows.subList(0, 3);
        if (ClientSettings.panel() != ClientSettings.Panel.HIDDEN) HudCard.bottomRight(g, mc.font, rows, HudCard.ACCENT, "Team");
    }

    private List<String[]> rows(TeamState t, Minecraft mc, int px, int py, int pz) {
        List<String[]> out = new ArrayList<>();
        TeamPlan tp = teamPlan(t);
        int waiting = sync.outbox().pending(t.teamId()).size();
        boolean live = t.source() == TeamState.Source.SERVER || t.source() == TeamState.Source.ROOM && sync.room().live();
        String where = t.source() == TeamState.Source.SERVER ? "live" : t.source() == TeamState.Source.ROOM ? (sync.room().live() ? t("live über den Team-Raum", "live via the team room") : t("Team-Raum getrennt", "team room disconnected"))
                : sync.link() == TeamSync.Link.ASK ? t("Planer · Server-Plugin da", "planner · server plugin found") : t("aus dem Planer", "from the planner");
        out.add(row("Team „" + t.name() + "“ · " + where + (waiting > 0 ? " · " + waiting + t(" wartet", " waiting") : ""), live ? HudCard.ACCENT : HudCard.TEXT));
        TeamState.Section here = sectionAt(t, tp, McCompat.dimension(mc.level), px, py, pz);
        if (here != null) {
            String owner = t.buildersText(here, t("frei – /bauplaner team nehmen ", "free – /buildplanner team take ") + here.nr());
            out.add(row(t("Hier: ", "Here: ") + here.nr() + " „" + here.name() + "“ · " + owner + " · " + TeamState.statusText(here.pending() ? "wartet" : here.status()),
                    TeamColors.ofSection(t, here)));
            // TEAM-03: a section someone else has can take more builders.
            if (here.owner() != null && !here.builds(t.me()) && t.me() != null && !"bestaetigt".equals(here.status()) && here.builders().size() < TeamState.MAX_CREW)
                out.add(row(t("Mitbauen: /bauplaner team mitbauen ", "Join: /buildplanner team join ") + here.nr(), HudCard.MUTED));
        }
        List<TeamState.Section> mine = t.mine();
        if (mine.isEmpty()) {
            if (t.me() == null) out.add(row(t.source() != TeamState.Source.PLANER ? t("Du bist noch nicht im Team – /bauplaner team nehmen <nr>", "You are not in the team yet – /buildplanner team take <no.>") : t("Im Planer „Ich bin“ wählen", "Choose “I am” in the planner"), HudCard.MUTED));
            else if (t.count("frei") > 0) out.add(row(t("Kein Auftrag · ", "No task · ") + t.count("frei") + t(" frei – /bauplaner team frei", " free – /buildplanner team free"), HudCard.MUTED));
        } else {
            TeamState.Section s = mine.get(0);
            String progress = "";
            if (tp != null && tp.number(s.id()) > 0) {
                int[] p = TeamPlan.progress(hologram.check(), tp.number(s.id()));
                progress = " · " + TeamPlan.percent(p) + " % · " + p[2] + t(" offen", " open");
            } else if (hologram.active()) progress = t(" · nicht im Plan", " · not in the plan");
            out.add(row(t("Mein Auftrag: ", "My task: ") + s.nr() + " „" + s.name() + "“" + progress + (mine.size() > 1 ? " (+" + (mine.size() - 1) + ")" : ""), t.colorOf(t.me())));
            // TEAM-03: who builds with me there.
            List<String> others = s.builders().stream().filter(m -> !m.equals(t.me())).toList();
            if (!others.isEmpty()) out.add(row((t.me().equals(s.owner()) ? t("Mitbauer: ", "Co-builders: ") : t("Mitbauer bei ", "Co-builder with "))
                    + String.join(", ", others.stream().map(t::nameOf).toList()), t.colorOf(others.get(0))));
            if ("nacharbeit".equals(s.status())) out.add(row(t("Nacharbeit verlangt – /bauplaner team abschnitte", "Rework requested – /buildplanner team sections"), HudCard.ERROR));
        }
        if (tp != null && tp.mismatch() != null) out.add(row(tp.mismatch(), HudCard.ERROR));
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
            out.add(row(t("Notiz (", "Note (") + (int) Math.sqrt(best) + " m, " + t.nameOf(near.by()) + "): " + text, noteColor(near.tag())));
        }
        return out;
    }

    /**
     * Status for the command page (GAME-10): channel, team, own task, waiting messages, storage chests,
     * last rejection. Each row is {text, colour as hex}.
     */
    public List<String[]> statusRows() {
        Minecraft mc = Minecraft.getInstance();
        List<String[]> out = new ArrayList<>();
        TeamState t = shown;
        var room = sync.room();
        if (room != null && room.config() != null) {
            var c = room.config();
            out.add(row(t("Team-Raum: ", "Team room: ") + room.statusLine() + (c.teamName() != null ? " · " + c.teamName() : "") + (room.live() ? " · " + room.presence().size() + t(" da", " online") : ""),
                    room.live() ? HudCard.ACCENT : HudCard.WARN));
            if (!room.live() && room.lastError() != null) out.add(row("  " + room.lastError(), HudCard.MUTED));
        } else out.add(row(t("Team-Raum: keiner – im Planer unter „Team live“ „Mein Spiel verbinden“ (keine Server-Datei nötig)", "Team room: none – in the planner under “Team live” choose “Connect my game” (no server file needed)"), HudCard.MUTED));
        out.add(row(t("Server-Plugin (freiwillig): ", "Server plugin (optional): ") + sync.link().text() + (sync.allowed() ? t(" · erlaubt", " · allowed") : ""), sync.link() == TeamSync.Link.LIVE ? HudCard.ACCENT : HudCard.MUTED));
        if (t == null || mc.player == null || mc.level == null) {
            out.add(row(t("Kein Teamstand – im Planer unter „Team live“ „Mein Spiel verbinden“", "No team state – in the planner under “Team live” choose “Connect my game”"), HudCard.MUTED));
        } else {
            out.addAll(rows(t, mc, mc.player.getBlockX(), mc.player.getBlockY(), mc.player.getBlockZ()));
            String role = t.me() == null ? null : t.roleOf(t.me());
            if (role != null) out.add(row(t("Du: ", "You: ") + t.nameOf(t.me()) + " · " + TeamState.roleText(role) + t(" · Abschnitte: ", " · sections: ") + t.count("frei") + t(" frei, ", " free, ")
                    + t.count("vergeben") + t(" vergeben, ", " taken, ") + t.count("gemeldet") + t(" gemeldet", " reported"), HudCard.TEXT));
            if (!t.stores().isEmpty()) {
                java.util.Map<String, Integer> by = new java.util.TreeMap<>();
                for (TeamState.Store st : t.stores()) by.merge(st.status() == null ? "ungeprueft" : st.status(), 1, Integer::sum);
                StringBuilder b = new StringBuilder(t("Lagerkisten: ", "Storage chests: ") + t.stores().size());
                by.forEach((k, v) -> b.append(" · ").append(v).append(' ').append(storeStatus(k)));
                out.add(row(b.toString(), by.containsKey("abweichend") || by.containsKey("fehlt") ? HudCard.WARN : HudCard.TEXT));
            }
        }
        List<String> rej = sync.rejections();
        if (!rej.isEmpty()) out.add(row(t("Abgelehnt: ", "Rejected: ") + rej.get(rej.size() - 1), HudCard.ERROR));
        if (sync.lastError() != null) out.add(row(t("Fehler: ", "Error: ") + sync.lastError(), HudCard.ERROR));
        return out;
    }

    /** Own role in the shown team (leitung, meister, helfer, gast) or null. */
    public String role() { TeamState t = shown; return t == null || t.me() == null ? null : t.roleOf(t.me()); }

    private static String[] row(String text, int color) { return new String[] { text, Integer.toHexString(color) }; }

    // ------------------------------------------------------------------ commands

    private static <S> LiteralArgumentBuilder<S> literal(String name) { return LiteralArgumentBuilder.literal(name); }
    private static <S, T> RequiredArgumentBuilder<S, T> argument(String name, com.mojang.brigadier.arguments.ArgumentType<T> type) { return RequiredArgumentBuilder.argument(name, type); }

    private static void say(String text) { McCompat.chat(Minecraft.getInstance(), Component.literal("[Build Studio] " + text)); }
    private static int said(String text) { say(text); return 1; }
    private static String storeStatus(String k) {
        return switch (k) {
            case "geprueft" -> t("geprüft", "checked");
            case "ungeprueft" -> t("ungeprüft", "unchecked");
            case "abweichend" -> t("abweichend", "differs");
            case "fehlt" -> t("fehlt", "missing");
            default -> k;
        };
    }
    /** A line of a list the player asked for: stays in the chat (GAME-12). */
    private static void list(String text) { McCompat.chatLine(Minecraft.getInstance(), Component.literal("[Build Studio] " + text)); }

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
                .then(TeamClient.<S>literal("mitbauen").then(TeamClient.<S, String>argument("abschnitt", StringArgumentType.word()).suggests(numbers)
                        .executes(c -> sectionAct(StringArgumentType.getString(c, "abschnitt"), "section.join", null))))
                .then(TeamClient.<S>literal("aussteigen").executes(c -> sectionAct(null, "section.leave", null))
                        .then(TeamClient.<S, String>argument("abschnitt", StringArgumentType.word()).suggests(numbers).executes(c -> sectionAct(StringArgumentType.getString(c, "abschnitt"), "section.leave", null))))
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
                .then(TeamClient.<S>literal("alle").executes(c -> { focus = null; hologram.setSectionSet(null, null); return said(t("Hologramm zeigt wieder alle Abschnitte.", "Hologram shows all sections again.")); }))
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
                .then(TeamClient.<S>literal("aufnahme").executes(c -> recordToRoom()))
                .then(TeamClient.<S>literal("erlauben").executes(c -> said(sync.allow(true))))
                .then(TeamClient.<S>literal("verbieten").executes(c -> said(sync.allow(false))))
                .then(TeamClient.<S>literal("status").executes(c -> status()))
                .then(TeamClient.<S>literal("korb").executes(c -> outbox(false)).then(TeamClient.<S>literal("leeren").executes(c -> outbox(true))))
                .then(TeamClient.<S>literal("rahmen").executes(c -> { frames = !frames; return said(frames ? t("Abschnittsrahmen an.", "Section frames on.") : t("Abschnittsrahmen aus.", "Section frames off.")); }))
                .then(TeamClient.<S>literal("anzeige").executes(c -> { panel = !panel; return said(panel ? t("Teamanzeige an.", "Team panel on.") : t("Teamanzeige aus.", "Team panel off.")); }));
    }

    /** Records the placed plan and puts it into the team room (set by LiveLink, LINK-07). */
    private java.util.function.Function<String, String> recorder;

    void recorder(java.util.function.Function<String, String> r) { recorder = r; }

    private int recordToRoom() {
        var room = sync.room();
        if (room == null || !room.live()) return said(t("Kein Team-Raum verbunden. Im Planer (Reiter „Team“ → Team-Raum) „Mein Spiel verbinden“ wählen.", "No team room connected. In the planner (tab “Team” → team room) choose “Connect my game”."));
        if (!hologram.active() || recorder == null) return said(t("Erst einen Plan im Spiel platzieren, dann aufnehmen.", "Place a plan in the game first, then scan."));
        say(t("Nehme den Baustand auf …", "Scanning the build …"));
        java.util.concurrent.CompletableFuture.runAsync(() -> recorder.apply(null));
        return 1;
    }

    private TeamState need() {
        TeamState t = shown;
        if (t == null) say(t("Kein Teamstand. Im Planer (Reiter „Team“) „Mit Spiel abgleichen“ wählen, oder auf einem Server mit Build-Studio-Plugin spielen (",
                "No team state. Choose “Compare with game” in the planner (tab “Team”) or play on a server with the Build Studio plugin (") + sync.link().text() + ").");
        return t;
    }

    private int overview() {
        TeamState t = need();
        if (t == null) return 0;
        say(t.summary() + ".");
        list(t("Verbindung: ", "Connection: ") + sync.link().text() + (t.me() != null ? t(" · du bist ", " · you are ") + t.nameOf(t.me()) + " (" + TeamState.roleText(t.roleOf(t.me())) + ")" : ""));
        List<TeamState.Section> mine = t.mine();
        if (!mine.isEmpty()) list(t("Deine Abschnitte: ", "Your sections: ") + String.join(", ", mine.stream().map(s -> s.nr() + " „" + s.name() + "“ (" + TeamState.statusText(s.status())
                + (s.builders().size() > 1 ? " · " + t.buildersText(s, "") : "") + ")").toList()));
        List<TeamState.Section> free = t.sections().stream().filter(TeamState.Section::free).limit(5).toList();
        if (!free.isEmpty()) list(t("Frei: ", "Free: ") + String.join(", ", free.stream().map(s -> s.nr() + " „" + s.name() + "“").toList()) + t(" – /bauplaner team nehmen <nr>", " – /buildplanner team take <no.>"));
        int waiting = sync.outbox().pending(t.teamId()).size();
        if (waiting > 0) list(waiting + t(" eigene Meldung(en) warten auf Abgleich: /bauplaner team korb", " own message(s) waiting for sync: /buildplanner team outbox"));
        list(t("Befehle: abschnitte, nehmen, mitbauen, aussteigen, abgeben, fertig, mein, frei, material, notiz, geliefert, lager, status, erlauben", "Commands: sections, take, join, leave, release, done, mine, free, material, note, delivered, storage, status, allow"));
        return 1;
    }

    private int sections() {
        TeamState t = need();
        if (t == null) return 0;
        TeamPlan tp = teamPlan(t);
        list(t("Abschnitte (", "Sections (") + t.sections().size() + "):");
        for (TeamState.Section s : t.sections()) {
            String owner = t.buildersText(s, t("frei", "free"));
            String progress = "";
            if (tp != null && tp.number(s.id()) > 0) progress = " · " + TeamPlan.percent(TeamPlan.progress(hologram.check(), tp.number(s.id()))) + " %";
            McCompat.chatLine(Minecraft.getInstance(), Component.literal("  " + s.nr() + ". " + s.name() + " – " + owner + " · " + TeamState.statusText(s.pending() ? "wartet" : s.status()) + progress)
                    .withColor(TeamColors.ofSection(t, s) & 0xFFFFFF));
        }
        return t.sections().size();
    }

    private Optional<TeamState.Section> section(TeamState t, String ref, boolean ownFirst) {
        if (ref != null) {
            Optional<TeamState.Section> s = t.findSection(ref);
            if (s.isEmpty()) say(t("Abschnitt „" + ref + "“ gibt es nicht. /bauplaner team abschnitte listet alle.", "There is no section “" + ref + "”. /buildplanner team sections lists all."));
            return s;
        }
        // Without a number: the section underfoot, else the only own one.
        Minecraft mc = Minecraft.getInstance();
        TeamState.Section here = mc.player == null ? null : sectionAt(t, teamPlan(t), McCompat.dimension(mc.level), mc.player.getBlockX(), mc.player.getBlockY(), mc.player.getBlockZ());
        if (here != null && (!ownFirst || here.builds(t.me()))) return Optional.of(here);
        List<TeamState.Section> mine = t.mine();
        if (ownFirst && mine.size() == 1) return Optional.of(mine.get(0));
        say(t("Welcher Abschnitt? Nummer angeben (/bauplaner team abschnitte).", "Which section? Give its number (/buildplanner team sections)."));
        return Optional.empty();
    }

    private int sectionAct(String ref, String kind, String note) {
        TeamState t = need();
        if (t == null) return 0;
        Optional<TeamState.Section> s = section(t, ref, !kind.equals("section.claim") && !kind.equals("section.join"));
        if (s.isEmpty()) return 0;
        TeamState.Section sec = s.get();
        String me = t.me();
        switch (kind) {
            case "section.claim" -> {
                if (me != null && me.equals(sec.owner())) return said(t("Abschnitt " + sec.nr() + " gehört schon dir.", "Section " + sec.nr() + " is already yours."));
                if (!sec.free()) say(t("Hinweis: Abschnitt " + sec.nr() + " hat schon " + t.nameOf(sec.owner()) + " – Server oder Planer entscheiden, wer ihn bekommt.", "Note: " + t.nameOf(sec.owner()) + " already has section " + sec.nr() + " – server or planner decide who gets it."));
            }
            case "section.release" -> { if (me != null && !sec.builds(me)) return said(t("Abschnitt " + sec.nr() + " gehört nicht dir.", "Section " + sec.nr() + " is not yours.")); }
            case "section.join" -> {
                if (sec.builds(me)) return said(t("Du baust schon an Abschnitt " + sec.nr() + ".", "You already build at section " + sec.nr() + "."));
                if ("bestaetigt".equals(sec.status())) return said(t("Abschnitt " + sec.nr() + " ist schon bestätigt.", "Section " + sec.nr() + " is already confirmed."));
                if (sec.builders().size() >= TeamState.MAX_CREW) return said(t("An Abschnitt " + sec.nr() + " bauen schon " + TeamState.MAX_CREW + " Spieler.", TeamState.MAX_CREW + " players already build at section " + sec.nr() + "."));
            }
            case "section.leave" -> { if (me != null && !sec.builds(me)) return said(t("Du baust nicht an Abschnitt " + sec.nr() + ".", "You do not build at section " + sec.nr() + ".")); }
            default -> { }
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("section", sec.id());
        if (note != null && !note.isBlank()) body.put("note", note.length() > 300 ? note.substring(0, 300) : note);
        String what = switch (kind) {
            case "section.claim" -> t("Abschnitt " + sec.nr() + " „" + sec.name() + "“ übernommen", "Took section " + sec.nr() + " “" + sec.name() + "”");
            case "section.release" -> t("Abschnitt " + sec.nr() + " „" + sec.name() + "“ zurückgegeben", "Released section " + sec.nr() + " “" + sec.name() + "”");
            case "section.join" -> sec.owner() == null ? t("Abschnitt " + sec.nr() + " „" + sec.name() + "“ übernommen", "Took section " + sec.nr() + " “" + sec.name() + "”")
                    : t("Du baust jetzt mit " + t.nameOf(sec.owner()) + " an Abschnitt " + sec.nr() + " „" + sec.name() + "“", "You now build with " + t.nameOf(sec.owner()) + " at section " + sec.nr() + " “" + sec.name() + "”");
            case "section.leave" -> me != null && me.equals(sec.owner()) && !sec.crew().isEmpty()
                    ? t("Aus Abschnitt " + sec.nr() + " ausgestiegen, " + t.nameOf(sec.crew().get(0)) + " übernimmt", "Left section " + sec.nr() + ", " + t.nameOf(sec.crew().get(0)) + " takes over")
                    : t("Aus Abschnitt " + sec.nr() + " „" + sec.name() + "“ ausgestiegen", "Left section " + sec.nr() + " “" + sec.name() + "”");
            default -> t("Abschnitt " + sec.nr() + " „" + sec.name() + "“ fertig gemeldet", "Reported section " + sec.nr() + " “" + sec.name() + "” as done");
        };
        String r = sync.act(kind, body, what);
        refresh();
        return said(r);
    }

    private boolean atLeastMeister(TeamState t) {
        String role = t.roleOf(t.me());
        if (role.equals("meister") || role.equals("leitung")) return true;
        say(t("Das dürfen nur Baumeister und Bauleitung.", "Only master builders and the team lead may do this."));
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
        return said(sync.act("section.verify", body, t("Abschnitt " + s.get().nr() + (ok ? " bestätigt" : " zur Nacharbeit"), "Section " + s.get().nr() + (ok ? " confirmed" : " sent to rework"))));
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
        if (m.isEmpty()) return said(t("„" + player + "“ ist nicht im Team.", "“" + player + "” is not in the team."));
        return said(sync.act("section.assign", Map.of("section", s.get().id(), "member", m.get().id()), t("Abschnitt " + s.get().nr() + " an " + m.get().name() + " zugewiesen", "Assigned section " + s.get().nr() + " to " + m.get().name())));
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
            return said(t("Abschnitt " + s.get().nr() + " „" + s.get().name() + "“ liegt bei ", "Section " + s.get().nr() + " “" + s.get().name() + "” is at ") + b[0] + " " + b[1] + " " + b[2] + t(" bis ", " to ") + b[3] + " " + b[4] + " " + b[5] + t(" (Rahmen in der Welt).", " (frame in the world)."));
        }
        return said(t("Abschnitt " + s.get().nr() + " ist im eingeblendeten Plan nicht enthalten. Plan des Teams einblenden (J).", "Section " + s.get().nr() + " is not in the shown plan. Show the team plan (J)."));
    }

    private int focus(String what) {
        TeamState t = need();
        if (t == null) return 0;
        TeamPlan tp = teamPlan(t);
        if (tp == null) return said(t("Erst den Plan des Teams einblenden (J), dann zeigt das Hologramm nur die gewählten Abschnitte.", "Show the team plan first (J), then the hologram shows only the chosen sections."));
        Set<Integer> set = what.equals("mein") ? tp.numbersOf(t.me()) : tp.freeNumbers();
        if (set.isEmpty()) return said(what.equals("mein") ? t("Du hast keinen offenen Abschnitt. Freie zeigen: /bauplaner team frei", "You have no open section. Show free ones: /buildplanner team free") : t("Kein Abschnitt ist frei.", "No section is free."));
        focus = what;
        hologram.setSectionSet(set, what.equals("mein") ? t("Meine Abschnitte", "My sections") : t("Freie Abschnitte", "Free sections"));
        return said(t("Hologramm zeigt nur " + (what.equals("mein") ? "deine" : "freie") + " Abschnitte (" + set.size() + "); Materialliste, Fehlersuche und Fortschritt ebenso. Zurück: /bauplaner team alle", "Hologram shows only " + (what.equals("mein") ? "your" : "free") + " sections (" + set.size() + "); material list, error finder and progress too. Back: /buildplanner team all"));
    }

    private int material(String player) {
        TeamState t = need();
        if (t == null) return 0;
        TeamPlan tp = teamPlan(t);
        if (tp == null) return said(t("Erst den Plan des Teams einblenden (J).", "Show the team plan first (J)."));
        Minecraft mc = Minecraft.getInstance();
        String member = player == null ? t.me() : member(t, player).map(TeamState.Member::id).orElse(null);
        if (member == null) return said(player == null ? t("Du bist (noch) nicht im Team.", "You are not in the team (yet).") : t("„" + player + "“ ist nicht im Team.", "“" + player + "” is not in the team."));
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
        if (needs.isEmpty()) return said(t.nameOf(member) + t(": nichts mehr offen in den eigenen Abschnitten.", ": nothing open in their own sections."));
        int open = needs.stream().mapToInt(TeamPlan.Need::open).sum(), fetch = needs.stream().mapToInt(TeamPlan.Need::fetch).sum();
        list(t("Material für ", "Material for ") + t.nameOf(member) + " (" + tp.numbersOf(member).size() + t(" Abschnitte): ", " sections): ") + open + t(" Blöcke offen", " blocks open") + (self ? ", " + fetch + t(" noch holen", " still to fetch") : "") + ":");
        int n = 0;
        for (TeamPlan.Need l : needs) {
            if (n++ >= 12) { list("  … " + (needs.size() - 12) + t(" weitere – Menü (J) → Materialliste mit /bauplaner team mein", " more – menu (J) → material list with /buildplanner team mine")); break; }
            String name = McCompat.blockName(io.github.freadeax.bauplaner.mod.BlockState.parse(l.id()));
            list("  " + name + ": " + l.open() + (self ? t(" (dabei ", " (carried ") + l.carried() + t(", holen ", ", fetch ") + l.fetch() + ")" : "") + (l.ready() > 0 ? t(" · im Lager ", " · in storage ") + l.ready() : ""));
        }
        return 1;
    }

    private int note(String tag, String text) {
        if (!List.of("frage", "problem", "material", "info").contains(tag)) return said(t("Art: frage, problem, material oder info.", "Kind: frage (question), problem, material or info."));
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
        return said(sync.act("note.add", body, t("Notiz gesetzt", "Note added")));
    }

    private int notes() {
        TeamState t = need();
        Minecraft mc = Minecraft.getInstance();
        if (t == null || mc.player == null) return 0;
        List<TeamState.Note> list = new ArrayList<>(t.notes());
        if (list.isEmpty()) return said(t("Keine offenen Notizen.", "No open notes."));
        double x = mc.player.getX(), y = mc.player.getY(), z = mc.player.getZ();
        list.sort(java.util.Comparator.comparingDouble(n -> n.pos() == null ? Double.MAX_VALUE : Math.pow(n.pos()[0] - x, 2) + Math.pow(n.pos()[1] - y, 2) + Math.pow(n.pos()[2] - z, 2)));
        list(t("Offene Notizen (" + list.size() + "), nächste zuerst. Erledigen: /bauplaner team erledigt <id>", "Open notes (" + list.size() + "), nearest first. Resolve: /buildplanner team resolve <id>"));
        for (TeamState.Note n : list.subList(0, Math.min(10, list.size()))) {
            String where = n.pos() == null ? "" : " @ " + n.pos()[0] + " " + n.pos()[1] + " " + n.pos()[2] + " (" + (int) Math.sqrt(Math.pow(n.pos()[0] - x, 2) + Math.pow(n.pos()[2] - z, 2)) + " m " + HologramHud.compass(n.pos()[0] + 0.5 - x, n.pos()[2] + 0.5 - z) + ")";
            McCompat.chatLine(mc, Component.literal("  [" + n.tag() + "] " + n.text() + " – " + t.nameOf(n.by()) + where + " · " + n.id()).withColor(noteColor(n.tag()) & 0xFFFFFF));
        }
        return list.size();
    }

    private int resolve(String id) {
        TeamState t = need();
        if (t == null) return 0;
        if (t.notes().stream().noneMatch(n -> n.id().equals(id))) return said(t("Keine offene Notiz mit der ID ", "No open note with the ID ") + id + ".");
        return said(sync.act("note.resolve", Map.of("noteId", id), t("Notiz erledigt", "Note resolved")));
    }

    private int deliveredHand() {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null) return 0;
        var stack = mc.player.getMainHandItem();
        if (stack.isEmpty()) return said(t("Nichts in der Hand.", "Nothing in your hand."));
        return delivered(BuiltInRegistries.ITEM.getKey(stack.getItem()).toString(), stack.getCount());
    }

    private int delivered(String item, int count) {
        String id = item.contains(":") ? item.toLowerCase(Locale.ROOT) : "minecraft:" + item.toLowerCase(Locale.ROOT);
        if (!id.matches("[a-z0-9_.-]+:[a-z0-9_./-]+")) return said(t("Item-ID ungültig: ", "Invalid item ID: ") + item);
        TeamState t = need();
        if (t == null) return 0;
        Map<String, Object> line = Map.of("item", id, "count", count);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", List.of(line));
        t.mine().stream().findFirst().ifPresent(s -> body.put("section", s.id()));
        return said(sync.act("contribution", body, count + "× " + id + t(" als geliefert gemeldet", " reported as delivered")));
    }

    private int gather(String item, int count) {
        String id = item.contains(":") ? item.toLowerCase(Locale.ROOT) : "minecraft:" + item.toLowerCase(Locale.ROOT);
        if (!id.matches("[a-z0-9_.-]+:[a-z0-9_./-]+")) return said(t("Item-ID ungültig: ", "Invalid item ID: ") + item);
        if (need() == null) return 0;
        return said(sync.act("gather.claim", Map.of("item", id, "count", count), t("Sammelauftrag ", "Collect order ") + count + "× " + id + t(" übernommen", " taken")));
    }

    private int stores() {
        TeamState t = need();
        Minecraft mc = Minecraft.getInstance();
        if (t == null || mc.player == null) return 0;
        if (t.stores().isEmpty()) return said(t.source() == TeamState.Source.SERVER ? t("Keine markierten Lagerkisten auf dem Server.", "No marked storage chests on the server.") : t("Noch keine markierten Lagerkisten im Team-Raum. Kisten markiert die Bauleitung mit dem Server-Plugin (/bp lager markieren).", "No marked storage chests in the team room yet. The team lead marks chests with the server plugin (/bp lager markieren)."));
        list(t("Lagerkisten (", "Storage chests (") + t.stores().size() + "):");
        for (TeamState.Store s : t.stores()) {
            int total = s.items().stream().mapToInt(TeamState.Item::count).sum();
            String top = String.join(", ", s.items().stream().sorted(java.util.Comparator.comparingInt(TeamState.Item::count).reversed()).limit(3)
                    .map(i -> i.count() + " " + McCompat.blockName(io.github.freadeax.bauplaner.mod.BlockState.parse(i.item()))).toList());
            McCompat.chatLine(mc, Component.literal("  " + s.name() + " (" + s.purpose() + ") @ " + s.pos()[0] + " " + s.pos()[1] + " " + s.pos()[2] + " · " + s.status() + " · " + total + " Items" + (top.isEmpty() ? "" : ": " + top) + (s.more() ? " …" : "")
                    + " · " + io.github.freadeax.bauplaner.mod.team.StoreStock.source(s, java.time.Instant.now()))
                    .withColor(storeColor(s.status()) & 0xFFFFFF));
        }
        return t.stores().size();
    }

    private int status() {
        TeamState p = sync.planerState(), s = sync.serverState();
        list(t("Teamkanal: ", "Team channel: ") + sync.link().text() + (sync.allowed() ? t(" (erlaubt)", " (allowed)") : ""));
        list(t("Vom Planer: ", "From the planner: ") + (p == null ? t("nichts", "nothing") : p.summary() + t(" · vor ", " · ") + (System.currentTimeMillis() - sync.planerAt()) / 1000 + t(" s", " s ago")));
        list(t("Vom Server: ", "From the server: ") + (s == null ? t("nichts", "nothing") : s.summary() + t(" · vor ", " · ") + (System.currentTimeMillis() - sync.serverAt()) / 1000 + t(" s", " s ago")));
        list(t("Ausgangskorb: ", "Outbox: ") + sync.outbox().pending().size() + (sync.lastError() == null ? "" : t(" · letzter Fehler: ", " · last error: ") + sync.lastError()));
        List<String> rej = sync.rejections();
        if (!rej.isEmpty()) list(t("Zuletzt abgelehnt: ", "Last rejected: ") + rej.get(rej.size() - 1));
        return 1;
    }

    private int outbox(boolean clear) {
        var list = sync.outbox().pending();
        if (clear) { sync.outbox().clear(); refresh(); return said(list.size() + t(" wartende Meldung(en) verworfen.", " waiting message(s) discarded.")); }
        if (list.isEmpty()) return said(t("Der Ausgangskorb ist leer – alles abgeglichen.", "The outbox is empty – everything is synced."));
        list(list.size() + t(" Meldung(en) warten (gehen an den Server, sobald der Teamkanal steht, oder an den Planer beim nächsten Abgleich):", " message(s) waiting (go to the server once the team channel is up, or to the planner at the next sync):"));
        for (var a : list) list("  " + a.at().substring(0, Math.min(16, a.at().length())).replace('T', ' ') + " " + a.kind() + (a.str("section") != null ? " " + a.str("section") : ""));
        return list.size();
    }
}
