package io.github.freadeax.bauplaner.bridge.hologram;

import static io.github.freadeax.bauplaner.mod.Lang.t;

import io.github.freadeax.bauplaner.mod.PlacementAdvice;

import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import java.nio.file.Path;
import com.mojang.brigadier.arguments.ArgumentType;
import com.mojang.brigadier.builder.RequiredArgumentBuilder;
import net.minecraft.ChatFormatting;
import net.minecraft.client.Minecraft;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;

/**
 * {@code /bauplaner zeigen|hierher|verschieben|drehen|spiegeln|umschalten|fehler|packliste|geruest|entfernen|fortschritt|ebene|material|texturen|platzierhilfe|abschnitt|roentgen|leistung|verbinden|ebenen|gruppe|diagnose}: the same actions as menu and keys, as client commands (no server needed;
 * also used by the game test). Generic over the command source, so every loader registers the same tree
 * with its own client command source; answers go straight to the local chat.
 */
public final class HologramCommands {
    private HologramCommands() {}

    private static <S> LiteralArgumentBuilder<S> literal(String name) { return LiteralArgumentBuilder.literal(name); }
    private static <S, T> RequiredArgumentBuilder<S, T> argument(String name, ArgumentType<T> type) { return RequiredArgumentBuilder.argument(name, type); }

    public static <S> java.util.List<LiteralArgumentBuilder<S>> build(Hologram h, LiveLink link) {
        RequiredArgumentBuilder<S, String> file = HologramCommands.<S, String>argument("datei", StringArgumentType.greedyString())
                .suggests((c, b) -> { h.planFiles().forEach(b::suggest); return b.buildFuture(); })
                .executes(c -> place(c.getSource(), h, StringArgumentType.getString(c, "datei")));
        RequiredArgumentBuilder<S, Integer> xyz = HologramCommands.<S, Integer>argument("x", IntegerArgumentType.integer()).then(HologramCommands.<S, Integer>argument("y", IntegerArgumentType.integer()).then(HologramCommands.<S, Integer>argument("z", IntegerArgumentType.integer())
                .executes(c -> need(c.getSource(), h, () -> h.move(IntegerArgumentType.getInteger(c, "x"), IntegerArgumentType.getInteger(c, "y"), IntegerArgumentType.getInteger(c, "z"))))));
        RequiredArgumentBuilder<S, Integer> at = HologramCommands.<S, Integer>argument("x", IntegerArgumentType.integer()).then(HologramCommands.<S, Integer>argument("y", IntegerArgumentType.integer()).then(HologramCommands.<S, Integer>argument("z", IntegerArgumentType.integer())
                .executes(c -> need(c.getSource(), h, () -> h.moveTo(new BlockPos(IntegerArgumentType.getInteger(c, "x"), IntegerArgumentType.getInteger(c, "y"), IntegerArgumentType.getInteger(c, "z")))))));
        return java.util.List.<LiteralArgumentBuilder<S>>of(
                HologramCommands.<S>literal("zeigen").executes(c -> progress(c.getSource(), h)).then(file),
                HologramCommands.<S>literal("fortschritt").executes(c -> progress(c.getSource(), h)),
                HologramCommands.<S>literal("hierher").executes(c -> need(c.getSource(), h, () -> h.moveTo(McCompat.targetBlock(Minecraft.getInstance())))).then(at),
                HologramCommands.<S>literal("verschieben").then(xyz),
                HologramCommands.<S>literal("drehen").executes(c -> need(c.getSource(), h, () -> h.turn(1)))
                        .then(HologramCommands.<S, Integer>argument("viertel", IntegerArgumentType.integer(-3, 3)).executes(c -> need(c.getSource(), h, () -> h.turn(IntegerArgumentType.getInteger(c, "viertel"))))),
                HologramCommands.<S>literal("spiegeln").executes(c -> need(c.getSource(), h, h::mirror)),
                HologramCommands.<S>literal("umschalten").executes(c -> need(c.getSource(), h, h::toggleVisible)),
                HologramCommands.<S>literal("fehler").executes(c -> finder(c.getSource(), h)),
                HologramCommands.<S>literal("packliste").executes(c -> packList(c.getSource(), h)),
                HologramCommands.<S>literal("geruest").executes(c -> scaffold(c.getSource(), h)),
                HologramCommands.<S>literal("entfernen").executes(c -> need(c.getSource(), h, h::remove)),
                HologramCommands.<S>literal("ebene").executes(c -> layer(c.getSource(), h))
                        .then(HologramCommands.<S>literal("alle").executes(c -> need(c.getSource(), h, () -> h.setLayers(Hologram.Layers.ALL, h.layerY()))))
                        .then(HologramCommands.<S>literal("bis").then(HologramCommands.<S, Integer>argument("y", IntegerArgumentType.integer()).executes(c -> need(c.getSource(), h, () -> h.setLayers(Hologram.Layers.BELOW, IntegerArgumentType.getInteger(c, "y"))))))
                        .then(HologramCommands.<S, Integer>argument("y", IntegerArgumentType.integer()).executes(c -> need(c.getSource(), h, () -> h.setLayers(Hologram.Layers.ONE, IntegerArgumentType.getInteger(c, "y"))))),
                HologramCommands.<S>literal("material").executes(c -> materials(c.getSource(), h)),
                HologramCommands.<S>literal("texturen").executes(c -> need(c.getSource(), h, h::toggleTextured)),
                HologramCommands.<S>literal("platzierhilfe").executes(c -> guard(c.getSource(), h, null))
                        .then(HologramCommands.<S>literal("an").executes(c -> guard(c.getSource(), h, PlacementAdvice.Guard.ON)))
                        .then(HologramCommands.<S>literal("warnen").executes(c -> guard(c.getSource(), h, PlacementAdvice.Guard.WARN)))
                        .then(HologramCommands.<S>literal("aus").executes(c -> guard(c.getSource(), h, PlacementAdvice.Guard.OFF))),
                // Build sections from the website (0.7.0): list, choose, all, next open one.
                HologramCommands.<S>literal("abschnitt").executes(c -> sections(h))
                        .then(HologramCommands.<S>literal("alle").executes(c -> said(h.setSection(0))))
                        .then(HologramCommands.<S>literal("weiter").executes(c -> {
                            if (!h.active()) return said(t("Kein Plan eingeblendet.", "No plan shown."));
                            int next = h.firstOpenSection();
                            return said(next == 0 && !h.sectionNames().isEmpty() ? t("Alle Bauabschnitte sind fertig.", "All build sections are done.") : h.setSection(next));
                        }))
                        .then(HologramCommands.<S, Integer>argument("nummer", IntegerArgumentType.integer(0, 255)).executes(c -> said(h.setSection(IntegerArgumentType.getInteger(c, "nummer"))))),
                HologramCommands.<S>literal("roentgen").executes(c -> { h.toggleXray(); return said(h.xray() ? t("Röntgensicht an: offene Blöcke auch durch Wände.", "X-ray on: open blocks also through walls.") : t("Röntgensicht aus.", "X-ray off.")); }),
                // Render budget for big builds (SIZE-01, 0.9.0): how many open blocks are drawn around you.
                HologramCommands.<S>literal("leistung").executes(c -> said(budgetText(h)))
                        .then(HologramCommands.<S>literal("auto").executes(c -> { h.setBudget(Hologram.Budget.AUTO); return said(budgetText(h)); }))
                        .then(HologramCommands.<S>literal("niedrig").executes(c -> { h.setBudget(Hologram.Budget.NIEDRIG); return said(budgetText(h)); }))
                        .then(HologramCommands.<S>literal("normal").executes(c -> { h.setBudget(Hologram.Budget.NORMAL); return said(budgetText(h)); }))
                        .then(HologramCommands.<S>literal("hoch").executes(c -> { h.setBudget(Hologram.Budget.HOCH); return said(budgetText(h)); })),
                // Website link (MAP-03): off until typed; a port starts it on that port.
                HologramCommands.<S>literal("verbinden").executes(c -> kept(link.connect()))
                        .then(HologramCommands.<S>literal("aus").executes(c -> said(link.disconnect())))
                        // LINK-03: the buttons "Planer zulassen/ablehnen" in the J menu run these.
                        .then(HologramCommands.<S>literal("zulassen").executes(c -> said(link.approve())))
                        .then(HologramCommands.<S>literal("ablehnen").executes(c -> said(link.deny())))
                        .then(HologramCommands.<S>literal("status").executes(c -> said(link.statusWithBrowsers())))
                        // RELEASE-01: remove one paired browser by the id from "verbinden status".
                        .then(HologramCommands.<S>literal("trennen").then(HologramCommands.<S, String>argument("kennung", StringArgumentType.word())
                                .suggests((c, b) -> { link.browserIds().forEach(b::suggest); return b.buildFuture(); })
                                .executes(c -> said(link.revokeBrowser(StringArgumentType.getString(c, "kennung"))))))
                        .then(HologramCommands.<S>literal("port").then(HologramCommands.<S, Integer>argument("port", IntegerArgumentType.integer(1024, 65535))
                                .executes(c -> kept(link.setPort(IntegerArgumentType.getInteger(c, "port")))))),
                // Weltplan layers (GAME-08): list, hide/show one, show all.
                HologramCommands.<S>literal("markieren")
                        .then(HologramCommands.<S, String>argument("art", StringArgumentType.word())
                                .suggests((c, b) -> { io.github.freadeax.bauplaner.mod.live.GameMarks.TYPES.stream().sorted().forEach(b::suggest); return b.buildFuture(); })
                                .executes(c -> mark(link, StringArgumentType.getString(c, "art"), null))
                                .then(HologramCommands.<S, String>argument("name", StringArgumentType.greedyString())
                                        .executes(c -> mark(link, StringArgumentType.getString(c, "art"), StringArgumentType.getString(c, "name"))))),
                HologramCommands.<S>literal("markierungen").executes(c -> marksList(link))
                        .then(HologramCommands.<S>literal("loeschen").then(HologramCommands.<S, String>argument("nr", StringArgumentType.word())
                                .executes(c -> markRemove(link, StringArgumentType.getString(c, "nr"))))),
                HologramCommands.<S>literal("ebenen").executes(c -> layers(link))
                        .then(HologramCommands.<S>literal("alle").executes(c -> { link.showAllLayers(); return said(t("Alle Weltplan-Ebenen sichtbar.", "All world plan layers visible.")); }))
                        .then(HologramCommands.<S, String>argument("ebene", StringArgumentType.greedyString())
                                .suggests((c, b) -> { link.marks().layers().keySet().forEach(b::suggest); return b.buildFuture(); })
                                .executes(c -> {
                                    String name = StringArgumentType.getString(c, "ebene").trim();
                                    if (!link.marks().layers().containsKey(name)) return fail(null, t("Keine Weltplan-Ebene „" + name + "“. Liste: /bauplaner ebenen", "No world plan layer “" + name + "”. List: /buildplanner layers"));
                                    return said(link.toggleLayer(name) ? t("Ebene „" + name + "“ sichtbar.", "Layer “" + name + "” visible.") : t("Ebene „" + name + "“ ausgeblendet.", "Layer “" + name + "” hidden."));
                                })),
                // Weltplan groups and locks (GAME-07-S11, 0.19.0): list, limit the hologram to one group, hide/show one.
                HologramCommands.<S>literal("gruppe").executes(c -> groups(h, link))
                        .then(HologramCommands.<S>literal("alle").executes(c -> { link.showAllGroups(); return said(link.setGroup(null)); }))
                        .then(HologramCommands.<S>literal("aus").then(HologramCommands.<S, String>argument("name", StringArgumentType.greedyString())
                                .suggests((c, b) -> { link.marks().groups().keySet().forEach(b::suggest); return b.buildFuture(); })
                                .executes(c -> groupShow(link, StringArgumentType.getString(c, "name"), false))))
                        .then(HologramCommands.<S>literal("an").then(HologramCommands.<S, String>argument("name", StringArgumentType.greedyString())
                                .suggests((c, b) -> { link.marks().groups().keySet().forEach(b::suggest); return b.buildFuture(); })
                                .executes(c -> groupShow(link, StringArgumentType.getString(c, "name"), true))))
                        .then(HologramCommands.<S, String>argument("name", StringArgumentType.greedyString())
                                .suggests((c, b) -> { link.marks().groups().keySet().forEach(b::suggest); return b.buildFuture(); })
                                .executes(c -> said(link.setGroup(StringArgumentType.getString(c, "name").trim())))),
                // Testphase (QA-04): diagnosis report into bauplaner/diagnose/ and the clipboard.
                HologramCommands.<S>literal("diagnose").executes(c -> HologramDiagnose.run(h, link)));
    }

    /** "Leistung: normal – bis 30 000 offene Blöcke …" */
    static String budgetText(Hologram h) {
        Hologram.Budget b = h.budget();
        String n = io.github.freadeax.bauplaner.mod.Lang.n((int) (HologramRenderer.MAX_BLOCKS * h.budgetScale()));
        String auto = b != Hologram.Budget.AUTO ? "" : t(" Automatisch: bei unter 40 Bildern pro Sekunde werden es weniger, danach wieder mehr (gerade " + h.fps() + " fps).",
                " Automatic: below 40 frames per second it draws fewer, then more again (now " + h.fps() + " fps).");
        return t("Leistung: " + b.text() + " – zeigt bis " + n + " offene Blöcke im Umkreis von " + HologramRenderer.RADIUS + " Blöcken, die nächsten zuerst.",
                "Performance: " + b.text() + " – shows up to " + n + " open blocks within " + HologramRenderer.RADIUS + " blocks, nearest first.") + auto
                + (h.capped() ? t(" Gerade sind es mehr; weiter entfernte erscheinen, wenn du näher kommst.", " There are more right now; farther ones appear as you come closer.") : "")
                + t(" Ändern: /bauplaner leistung auto|niedrig|normal|hoch", " Change: /buildplanner performance auto|low|normal|high");
    }

    private static int said(String text) { say(null, text); return 1; }

    /** Something the player has to read and type elsewhere (pairing code): card and chat line, so it stays readable. */
    private static int kept(String text) { Toasts.post(Toasts.Kind.INFO, text); list(text); return 1; }

    /** Weltplan layers of the marks from the website with their entry counts and state. */
    private static int layers(LiveLink link) {
        var layers = link.marks().layers();
        if (link.marks().size() == 0) return said(t("Keine Markierungen von der Website.", "No marks from the website."));
        if (layers.isEmpty()) return said(link.marks().size() + t(" Markierungen ohne Ebenen.", " marks without layers."));
        list(t("Weltplan-Ebenen (" + layers.size() + "). Umschalten: /bauplaner ebenen <name>, alle: /bauplaner ebenen alle",
                "World plan layers (" + layers.size() + "). Toggle: /buildplanner layers <name>, all: /buildplanner layers all"));
        layers.forEach((name, n) -> list((link.layerShown(name) ? "  ● " : "  ○ ") + name + ": " + n + (link.layerShown(name) ? "" : t(" (ausgeblendet)", " (hidden)"))));
        return 1;
    }

    /** Weltplan groups with their entry counts, which one the hologram shows and how many blocks are locked. */
    private static int groups(Hologram h, LiveLink link) {
        var groups = link.marks().groups();
        int locked = link.marks().lockedCount();
        if (link.marks().size() == 0) return said(t("Keine Markierungen von der Website – Gruppen und Sperren kommen mit dem Weltplan (Weltkarte → „Ins Spiel senden“).",
                "No marks from the website – groups and locks come with the world plan (world map → “Send to game”)."));
        if (groups.isEmpty()) return said(t("Im Weltplan gibt es keine Gruppen", "The world plan has no groups") + (locked > 0 ? t(", aber " + locked + " gesperrte Einträge (grau im Hologramm).", ", but " + locked + " locked entries (grey in the hologram).") : "."));
        list(t("Weltplan-Gruppen (" + groups.size() + "), Hologramm: ", "World plan groups (" + groups.size() + "), hologram: ") + (link.group() == null ? t("alle", "all") : "„" + link.group() + "“")
                + (h.lockedBlocks() > 0 ? ", " + h.lockedBlocks() + t(" Planblöcke gesperrt", " plan blocks locked") : "")
                + t(". Wählen: /bauplaner gruppe <name>|alle, ausblenden: /bauplaner gruppe aus <name>", ". Choose: /buildplanner group <name>|all, hide: /buildplanner group off <name>"));
        groups.forEach((name, n) -> list((name.equals(link.group()) ? "▶ " : link.groupShown(name) ? "  ● " : "  ○ ") + name + ": " + n + (link.groupShown(name) ? "" : t(" (ausgeblendet)", " (hidden)"))));
        return groups.size();
    }

    private static int groupShow(LiveLink link, String raw, boolean show) {
        String name = raw.trim();
        if (!link.marks().groups().containsKey(name)) return fail(null, t("Keine Weltplan-Gruppe „" + name + "“. Liste: /bauplaner gruppe", "No world plan group “" + name + "”. List: /buildplanner group"));
        if (link.groupShown(name) != show) link.toggleGroup(name);
        if (!show && name.equals(link.group())) link.setGroup(null);
        return said(show ? t("Gruppe „" + name + "“ sichtbar.", "Group “" + name + "” visible.") : t("Gruppe „" + name + "“ ausgeblendet (Markierungen und Hologramm darin).", "Group “" + name + "” hidden (marks and hologram inside)."));
    }

    /** All sections with their progress; the active one marked. */
    private static int sections(Hologram h) {
        if (!h.active()) return said(t("Kein Plan eingeblendet.", "No plan shown."));
        var names = h.sectionNames();
        if (names.isEmpty()) return said(t("Dieser Plan hat keine Bauabschnitte. Auf der Website im Tab „Baustelle“ Abschnitte anlegen und neu exportieren.",
                "This plan has no build sections. Add sections in the website tab “Site” and export again."));
        list(t("Bauabschnitte (" + names.size() + "), aktiv: " + (h.section() == 0 ? "alle" : h.section()) + ". Wählen: /bauplaner abschnitt <nummer>|alle|weiter oder Num /.",
                "Build sections (" + names.size() + "), active: " + (h.section() == 0 ? "all" : h.section()) + ". Choose: /buildplanner section <number>|all|next or Num /."));
        for (int k = 1; k <= names.size(); k++) list((k == h.section() ? "▶ " : "  ") + k + ". " + names.get(k - 1) + ": " + h.sectionLine(k));
        return names.size();
    }

    private static int guard(Object s, Hologram h, PlacementAdvice.Guard g) {
        if (g != null) h.setGuard(g);
        say(s, t("Platzierhilfe: ", "Placement helper: ") + h.guard().text() + switch (h.guard()) {
            case ON -> t(" – falsche Blöcke und falsche Ausrichtung werden nicht gesetzt, richtige Planblöcke nicht abgebaut.", " – wrong blocks and wrong facing are not placed, correct plan blocks are not broken.");
            case WARN -> t(" – nur Hinweise, gesetzt wird trotzdem.", " – hints only, blocks are placed anyway.");
            case OFF -> ".";
        });
        return 1;
    }

    private static int layer(Object s, Hologram h) {
        if (!h.active()) return fail(s, noPlan());
        say(s, switch (h.layers()) { case ALL -> t("Alle Ebenen sichtbar.", "All layers visible."); case ONE -> t("Nur Ebene ", "Only layer ") + h.layerY() + "."; case BELOW -> t("Bis Ebene ", "Up to layer ") + h.layerY() + "."; });
        return 1;
    }

    /** Open blocks per type (same list as the material screen), in the chat; also used by the game test. */
    private static int materials(Object s, Hologram h) {
        if (!h.active()) return fail(s, noPlan());
        var lines = io.github.freadeax.bauplaner.mod.Materials.of(h.check(), h.filter());
        int open = lines.stream().mapToInt(io.github.freadeax.bauplaner.mod.Materials.Line::open).sum();
        long kinds = lines.stream().filter(l -> l.open() > 0).count();
        list(t("Material offen: " + open + " Blöcke in " + kinds + " Sorten.", "Material open: " + open + " blocks of " + kinds + " kinds."));
        lines.stream().filter(l -> l.open() > 0).limit(10).forEach(l -> list("  " + l.open() + " × " + l.id() + t(" (von ", " (of ") + l.total() + ")"));
        return open;
    }

    private static int place(Object s, Hologram h, String name) {
        Path file = h.plansDir().resolve(name).normalize();
        if (!file.startsWith(h.plansDir())) return fail(s, t("Ungültiger Dateiname.", "Invalid file name."));
        try {
            say(s, h.place(Minecraft.getInstance(), name, McCompat.targetBlock(Minecraft.getInstance())));
            return 1;
        } catch (Exception e) {
            return fail(s, t("Plan nicht lesbar: ", "Plan not readable: ") + io.github.freadeax.bauplaner.bridge.BridgeException.text(e, io.github.freadeax.bauplaner.mod.Lang.en()));
        }
    }

    private static int need(Object s, Hologram h, Runnable r) {
        if (!h.active()) return fail(s, noPlanHint());
        r.run();
        if (h.active()) {
            var p = h.check().placement();
            say(s, t("Ursprung ", "Origin ") + p.x() + " " + p.y() + " " + p.z() + " · " + p.turns() * 90 + "°" + (p.mirror() ? t(" · gespiegelt", " · mirrored") : "") + (h.visible() ? "" : t(" · ausgeblendet", " · hidden"))
                    + (h.layers() == Hologram.Layers.ALL ? "" : h.layers() == Hologram.Layers.ONE ? t(" · Ebene ", " · layer ") + h.layerY() : t(" · bis Ebene ", " · up to layer ") + h.layerY())
                    + (h.textured() ? "" : t(" · ohne Texturen", " · no textures")));
        } else {
            say(s, t("Plan entfernt.", "Plan removed."));
        }
        return 1;
    }

    private static int progress(Object s, Hologram h) {
        if (!h.active()) return fail(s, noPlanHint());
        var c = h.check();
        say(s, h.plan().name() + ": " + c.percent() + t(" % · richtig ", " % · correct ") + c.count(Verdict.OK) + t(" · fehlt ", " · missing ") + c.count(Verdict.MISSING) + t(" · falsch ", " · wrong ")
                + c.count(Verdict.WRONG) + t(" · Zustand ", " · facing ") + c.count(Verdict.STATE) + t(" · nicht geladen ", " · not loaded ") + c.count(Verdict.UNKNOWN));
        return c.percent();
    }

    private static int finder(Object s, Hologram h) {
        if (!h.active()) return fail(s, noPlan());
        var p = Minecraft.getInstance().player;
        int i = h.findNext(p.getX(), p.getY(), p.getZ());
        if (i < 0) { say(s, t("Keine Fehler in geladenen Chunks.", "No errors in loaded chunks.")); return 0; }
        var c = h.check();
        say(s, t("Nächster Fehler bei ", "Next error at ") + c.worldX(i) + " " + c.worldY(i) + " " + c.worldZ(i) + t(": erwartet ", ": expected ") + c.expected(i) + t(", gefunden ", ", found ") + c.found(i) + ".");
        return 1;
    }

    /**
     * GAME-07 stage 6: what to pack for the shown part of the plan (layer, section, „meine Abschnitte“):
     * open minus carried, in stacks and shulker boxes, and which team storage chest holds it.
     */
    private static int packList(Object s, Hologram h) {
        if (!h.active()) return fail(s, noPlan());
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null) return 0;
        var open = io.github.freadeax.bauplaner.mod.Materials.of(h.check(), h.filter());
        var inv = McCompat.carried(mc.player);
        java.util.Map<String, Integer> carried = new java.util.HashMap<>();
        for (var l : open) {
            var item = MaterialScreen.item(l.id());
            if (item != net.minecraft.world.item.Items.AIR) carried.put(l.id(), inv.getOrDefault(item, 0));
        }
        int free = 0;
        var main = mc.player.getInventory();
        for (int i = 0; i < 36 && i < main.getContainerSize(); i++) if (main.getItem(i).isEmpty()) free++;
        var team = HologramClient.current() == null ? null : HologramClient.current().team().state();
        var stores = team == null ? java.util.List.<io.github.freadeax.bauplaner.mod.team.TeamState.Store>of() : team.stores();
        var r = io.github.freadeax.bauplaner.mod.PackList.of(open, carried, id -> {
            var item = MaterialScreen.item(id);
            return item == net.minecraft.world.item.Items.AIR ? 64 : item.getDefaultMaxStackSize();
        }, stores, new double[] { mc.player.getX(), mc.player.getY(), mc.player.getZ() }, free);
        boolean whole = h.filter().allSections() && h.filter().area() == null;
        if (r.lines().isEmpty()) { say(s, t("Packliste: nichts offen", "Packing list: nothing open") + (whole ? "." : t(" im gezeigten Teil.", " in the shown part."))); return 0; }
        int fetch = r.lines().stream().mapToInt(io.github.freadeax.bauplaner.mod.PackList.Line::fetch).sum();
        list(t("Packliste", "Packing list") + (whole ? "" : t(" (gezeigter Teil)", " (shown part)")) + ": " + fetch + t(" Blöcke holen = ", " blocks to fetch = ") + r.stacks() + t(" Stapel", " stacks")
                + (r.boxes() > 1 ? " ≈ " + r.boxes() + t(" Shulkerkisten", " shulker boxes") : "") + t(" · frei im Inventar ", " · free in inventory ") + r.freeSlots() + t(" Plätze", " slots") + (r.fits() ? "" : t(" – passt nicht auf einmal", " – does not fit at once"))
                + (r.missing() > 0 && !stores.isEmpty() ? " · " + r.missing() + t(" in keinem Lager", " in no storage") : ""));
        int n = 0;
        for (var l : r.lines()) {
            if (l.fetch() == 0) continue;
            if (n++ >= 12) { list(t("  … weitere: Plan-Menü (J) → Materialliste", "  … more: plan menu (J) → material list")); break; }
            String name = McCompat.blockName(io.github.freadeax.bauplaner.mod.BlockState.parse(l.id()));
            StringBuilder b = new StringBuilder("  " + name + ": " + l.fetch() + " (" + l.stacks() + t(" Stapel", " stacks") + (l.carried() > 0 ? t(", dabei ", ", carried ") + l.carried() : "") + ")");
            for (var from : l.from()) b.append(" · ").append(from.count()).append(t(" aus „", " from “")).append(from.store()).append(t("“ ", "” ")).append(from.pos()[0]).append(' ').append(from.pos()[1]).append(' ').append(from.pos()[2]).append(" (").append(from.distance()).append(" m)");
            if (l.missing() > 0 && !stores.isEmpty()) b.append(t(" · fehlt ", " · missing ")).append(l.missing());
            list(b.toString());
        }
        return r.stacks();
    }

    /** GAME-07 stage 6: open blocks that need a scaffold (nothing to place against) or would fall (sand over air). */
    private static int scaffold(Object s, Hologram h) {
        if (!h.active()) return fail(s, noPlan());
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.level == null) return 0;
        var c = h.check();
        var r = io.github.freadeax.bauplaner.mod.Scaffold.of(c, h.filter(), McCompat.liveReader(mc.level), mc.player.getX(), mc.player.getY(), mc.player.getZ());
        if (r.total() == 0) { h.setTarget(-1); say(s, t("Gerüst: kein offener Block hängt frei oder fällt – alles lässt sich direkt setzen.", "Scaffold: no open block hangs free or falls – everything can be placed directly.")); return 0; }
        list(t("Gerüst nötig: " + r.hanging() + " Blöcke ohne Nachbarn zum Ansetzen, " + r.falling() + " fallende Blöcke ohne Halt darunter.",
                "Scaffold needed: " + r.hanging() + " blocks with nothing to place against, " + r.falling() + " falling blocks without support below."));
        if (r.nearestHanging() >= 0) {
            int i = r.nearestHanging();
            list(t("  Nächster hängender bei ", "  Nearest hanging at ") + c.worldX(i) + " " + c.worldY(i) + " " + c.worldZ(i) + " (" + McCompat.blockName(c.expected(i)) + t("): Hilfsblock oder Gerüst daneben setzen, danach wieder entfernen.", "): place a helper block or scaffold next to it, remove it afterwards."));
        }
        if (r.nearestFalling() >= 0) {
            int i = r.nearestFalling();
            list(t("  Nächster fallender bei ", "  Nearest falling at ") + c.worldX(i) + " " + c.worldY(i) + " " + c.worldZ(i) + " (" + McCompat.blockName(c.expected(i)) + t("): erst darunter stützen.", "): support it from below first."));
        }
        h.setTarget(r.nearestHanging() >= 0 ? r.nearestHanging() : r.nearestFalling());
        return r.total();
    }

    /** Live protocol 3: a point where the player stands, for the Weltkarte; waits in the game until the planner takes it. */
    private static int mark(LiveLink link, String type, String name) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.level == null) return 0;
        var pos = mc.player.blockPosition();
        try {
            var m = link.outbox().add(type.toLowerCase(java.util.Locale.ROOT), name, McCompat.dimension(mc.level), pos.getX(), pos.getY(), pos.getZ(),
                    mc.player.getName().getString(), java.time.Instant.now());
            say(null, t("Markiert: ", "Marked: ") + io.github.freadeax.bauplaner.mod.live.WorldMarks.typeLabel(m.type()) + " „" + m.name() + t("“ bei ", "” at ") + m.x() + " " + m.y() + " " + m.z()
                    + t(". Die Weltkarte der Website übernimmt sie beim nächsten Abgleich (" + link.outbox().size() + " warten).", ". The website's world map takes it at the next sync (" + link.outbox().size() + " waiting)."));
            return 1;
        } catch (IllegalArgumentException e) {
            return fail(null, e.getMessage());
        }
    }

    private static int marksList(LiveLink link) {
        var list = link.outbox().list();
        if (list.isEmpty()) return said(t("Keine Markierungen aus dem Spiel warten. Neue: /bauplaner markieren <art> [name]", "No marks from the game are waiting. New: /buildplanner mark <kind> [name]"));
        list(list.size() + t(" Markierung" + (list.size() == 1 ? "" : "en") + " warten auf die Weltkarte:", " mark" + (list.size() == 1 ? "" : "s") + " waiting for the world map:"));
        for (int i = 0; i < list.size() && i < 15; i++) {
            var m = list.get(i);
            list("  " + (i + 1) + ". " + io.github.freadeax.bauplaner.mod.live.WorldMarks.typeLabel(m.type()) + " „" + m.name() + t("“ bei ", "” at ") + m.x() + " " + m.y() + " " + m.z());
        }
        return list.size();
    }

    private static int markRemove(LiveLink link, String nr) {
        return link.outbox().remove(nr) ? said(t("Markierung " + nr + " gelöscht.", "Mark " + nr + " deleted.")) : fail(null, t("Keine wartende Markierung " + nr + ". Liste: /bauplaner markierungen", "No waiting mark " + nr + ". List: /buildplanner marks"));
    }

    private static void say(Object s, String text) { McCompat.chat(Minecraft.getInstance(), Component.literal("[Build Studio] " + text)); }
    /** A line of a list the player asked for: stays in the chat (GAME-12). */
    private static void list(String text) { McCompat.chatLine(Minecraft.getInstance(), Component.literal("[Build Studio] " + text)); }
    private static String noPlan() { return t("Kein Plan platziert.", "No plan placed."); }
    private static String noPlanHint() { return t("Kein Plan platziert. /bauplaner zeigen <datei> oder Taste J.", "No plan placed. /buildplanner show <file> or key J."); }
    private static int fail(Object s, String text) { McCompat.chat(Minecraft.getInstance(), Component.literal("[Build Studio] " + text).withStyle(ChatFormatting.RED)); return 0; }
}
