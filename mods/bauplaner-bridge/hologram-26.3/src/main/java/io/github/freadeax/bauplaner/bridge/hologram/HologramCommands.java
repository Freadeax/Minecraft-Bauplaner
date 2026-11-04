package io.github.freadeax.bauplaner.bridge.hologram;

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
 * {@code /bauplaner zeigen|hierher|verschieben|drehen|spiegeln|umschalten|fehler|entfernen|fortschritt|ebene|material|texturen|platzierhilfe|abschnitt|roentgen|leistung|verbinden|ebenen|diagnose}: the same actions as menu and keys, as client commands (no server needed;
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
                            if (!h.active()) return said("Kein Plan eingeblendet.");
                            int next = h.firstOpenSection();
                            return said(next == 0 && !h.sectionNames().isEmpty() ? "Alle Bauabschnitte sind fertig." : h.setSection(next));
                        }))
                        .then(HologramCommands.<S, Integer>argument("nummer", IntegerArgumentType.integer(0, 255)).executes(c -> said(h.setSection(IntegerArgumentType.getInteger(c, "nummer"))))),
                HologramCommands.<S>literal("roentgen").executes(c -> { h.toggleXray(); return said(h.xray() ? "Röntgensicht an: offene Blöcke auch durch Wände." : "Röntgensicht aus."); }),
                // Render budget for big builds (SIZE-01, 0.9.0): how many open blocks are drawn around you.
                HologramCommands.<S>literal("leistung").executes(c -> said(budgetText(h)))
                        .then(HologramCommands.<S>literal("niedrig").executes(c -> { h.setBudget(Hologram.Budget.NIEDRIG); return said(budgetText(h)); }))
                        .then(HologramCommands.<S>literal("normal").executes(c -> { h.setBudget(Hologram.Budget.NORMAL); return said(budgetText(h)); }))
                        .then(HologramCommands.<S>literal("hoch").executes(c -> { h.setBudget(Hologram.Budget.HOCH); return said(budgetText(h)); })),
                // Website link (MAP-03): off until typed; a port starts it on that port.
                HologramCommands.<S>literal("verbinden").executes(c -> said(link.connect()))
                        .then(HologramCommands.<S>literal("aus").executes(c -> said(link.disconnect())))
                        // LINK-03: the buttons "Planer zulassen/ablehnen" in the J menu run these.
                        .then(HologramCommands.<S>literal("zulassen").executes(c -> said(link.approve())))
                        .then(HologramCommands.<S>literal("ablehnen").executes(c -> said(link.deny())))
                        .then(HologramCommands.<S>literal("status").executes(c -> said(link.statusText())))
                        .then(HologramCommands.<S>literal("port").then(HologramCommands.<S, Integer>argument("port", IntegerArgumentType.integer(1024, 65535))
                                .executes(c -> said(link.setPort(IntegerArgumentType.getInteger(c, "port")))))),
                // Weltplan layers (GAME-08): list, hide/show one, show all.
                HologramCommands.<S>literal("ebenen").executes(c -> layers(link))
                        .then(HologramCommands.<S>literal("alle").executes(c -> { link.showAllLayers(); return said("Alle Weltplan-Ebenen sichtbar."); }))
                        .then(HologramCommands.<S, String>argument("ebene", StringArgumentType.greedyString())
                                .suggests((c, b) -> { link.marks().layers().keySet().forEach(b::suggest); return b.buildFuture(); })
                                .executes(c -> {
                                    String name = StringArgumentType.getString(c, "ebene").trim();
                                    if (!link.marks().layers().containsKey(name)) return fail(null, "Keine Weltplan-Ebene „" + name + "“. Liste: /bauplaner ebenen");
                                    return said("Ebene „" + name + "“ " + (link.toggleLayer(name) ? "sichtbar." : "ausgeblendet."));
                                })),
                // Testphase (QA-04): diagnosis report into bauplaner/diagnose/ and the clipboard.
                HologramCommands.<S>literal("diagnose").executes(c -> HologramDiagnose.run(h, link)));
    }

    /** "Leistung: normal – bis 30 000 offene Blöcke …" */
    static String budgetText(Hologram h) {
        Hologram.Budget b = h.budget();
        String n = String.format(java.util.Locale.GERMANY, "%,d", (int) (HologramRenderer.MAX_BLOCKS * b.factor));
        return "Leistung: " + b.label + " – zeigt bis " + n + " offene Blöcke im Umkreis von " + HologramRenderer.RADIUS + " Blöcken, die nächsten zuerst."
                + (h.capped() ? " Gerade sind es mehr; weiter entfernte erscheinen, wenn du näher kommst." : "")
                + " Ändern: /bauplaner leistung niedrig|normal|hoch";
    }

    private static int said(String text) { say(null, text); return 1; }

    /** Weltplan layers of the marks from the website with their entry counts and state. */
    private static int layers(LiveLink link) {
        var layers = link.marks().layers();
        if (link.marks().size() == 0) return said("Keine Markierungen von der Website.");
        if (layers.isEmpty()) return said(link.marks().size() + " Markierungen ohne Ebenen.");
        say(null, "Weltplan-Ebenen (" + layers.size() + "). Umschalten: /bauplaner ebenen <name>, alle: /bauplaner ebenen alle");
        layers.forEach((name, n) -> say(null, (link.layerShown(name) ? "  ● " : "  ○ ") + name + ": " + n + (link.layerShown(name) ? "" : " (ausgeblendet)")));
        return 1;
    }

    /** All sections with their progress; the active one marked. */
    private static int sections(Hologram h) {
        if (!h.active()) return said("Kein Plan eingeblendet.");
        var names = h.sectionNames();
        if (names.isEmpty()) return said("Dieser Plan hat keine Bauabschnitte. Auf der Website im Tab „Baustelle“ Abschnitte anlegen und neu exportieren.");
        say(null, "Bauabschnitte (" + names.size() + "), aktiv: " + (h.section() == 0 ? "alle" : h.section()) + ". Wählen: /bauplaner abschnitt <nummer>|alle|weiter oder Num /.");
        for (int k = 1; k <= names.size(); k++) say(null, (k == h.section() ? "▶ " : "  ") + k + ". " + names.get(k - 1) + ": " + h.sectionLine(k));
        return names.size();
    }

    private static int guard(Object s, Hologram h, PlacementAdvice.Guard g) {
        if (g != null) h.setGuard(g);
        say(s, "Platzierhilfe: " + h.guard().label + switch (h.guard()) {
            case ON -> " – falsche Blöcke und falsche Ausrichtung werden nicht gesetzt, richtige Planblöcke nicht abgebaut.";
            case WARN -> " – nur Hinweise, gesetzt wird trotzdem.";
            case OFF -> ".";
        });
        return 1;
    }

    private static int layer(Object s, Hologram h) {
        if (!h.active()) return fail(s, "Kein Plan platziert.");
        say(s, switch (h.layers()) { case ALL -> "Alle Ebenen sichtbar."; case ONE -> "Nur Ebene " + h.layerY() + "."; case BELOW -> "Bis Ebene " + h.layerY() + "."; });
        return 1;
    }

    /** Open blocks per type (same list as the material screen), in the chat; also used by the game test. */
    private static int materials(Object s, Hologram h) {
        if (!h.active()) return fail(s, "Kein Plan platziert.");
        var lines = io.github.freadeax.bauplaner.mod.Materials.of(h.check(), h.filter());
        int open = lines.stream().mapToInt(io.github.freadeax.bauplaner.mod.Materials.Line::open).sum();
        say(s, "Material offen: " + open + " Blöcke in " + lines.stream().filter(l -> l.open() > 0).count() + " Sorten.");
        lines.stream().filter(l -> l.open() > 0).limit(10).forEach(l -> say(s, "  " + l.open() + " × " + l.id() + " (von " + l.total() + ")"));
        return open;
    }

    private static int place(Object s, Hologram h, String name) {
        Path file = h.plansDir().resolve(name).normalize();
        if (!file.startsWith(h.plansDir())) return fail(s, "Ungültiger Dateiname.");
        try {
            say(s, h.place(Minecraft.getInstance(), name, McCompat.targetBlock(Minecraft.getInstance())));
            return 1;
        } catch (Exception e) {
            return fail(s, "Plan nicht lesbar: " + e.getMessage());
        }
    }

    private static int need(Object s, Hologram h, Runnable r) {
        if (!h.active()) return fail(s, "Kein Plan platziert. /bauplaner zeigen <datei> oder Taste J.");
        r.run();
        if (h.active()) {
            var p = h.check().placement();
            say(s, "Ursprung " + p.x() + " " + p.y() + " " + p.z() + " · " + p.turns() * 90 + "°" + (p.mirror() ? " · gespiegelt" : "") + (h.visible() ? "" : " · ausgeblendet")
                    + (h.layers() == Hologram.Layers.ALL ? "" : h.layers() == Hologram.Layers.ONE ? " · Ebene " + h.layerY() : " · bis Ebene " + h.layerY())
                    + (h.textured() ? "" : " · ohne Texturen"));
        } else {
            say(s, "Plan entfernt.");
        }
        return 1;
    }

    private static int progress(Object s, Hologram h) {
        if (!h.active()) return fail(s, "Kein Plan platziert. /bauplaner zeigen <datei> oder Taste J.");
        var c = h.check();
        say(s, h.plan().name() + ": " + c.percent() + " % · richtig " + c.count(Verdict.OK) + " · fehlt " + c.count(Verdict.MISSING) + " · falsch "
                + c.count(Verdict.WRONG) + " · Zustand " + c.count(Verdict.STATE) + " · nicht geladen " + c.count(Verdict.UNKNOWN));
        return c.percent();
    }

    private static int finder(Object s, Hologram h) {
        if (!h.active()) return fail(s, "Kein Plan platziert.");
        var p = Minecraft.getInstance().player;
        int i = h.findNext(p.getX(), p.getY(), p.getZ());
        if (i < 0) { say(s, "Keine Fehler in geladenen Chunks."); return 0; }
        var c = h.check();
        say(s, "Nächster Fehler bei " + c.worldX(i) + " " + c.worldY(i) + " " + c.worldZ(i) + ": erwartet " + c.expected(i) + ", gefunden " + c.found(i) + ".");
        return 1;
    }

    private static void say(Object s, String text) { McCompat.chat(Minecraft.getInstance(), Component.literal("[Bauplaner] " + text)); }
    private static int fail(Object s, String text) { McCompat.chat(Minecraft.getInstance(), Component.literal("[Bauplaner] " + text).withStyle(ChatFormatting.RED)); return 0; }
}
