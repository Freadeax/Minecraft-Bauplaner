package io.github.freadeax.bauplaner.bridge.hologram;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.Diagnostics;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;

/**
 * {@code /bauplaner diagnose} (QA-04, Testphase): schreibt einen Diagnosebericht nach
 * {@code <Instanz>/bauplaner/diagnose/diagnose-<zeit>.txt} und legt ihn in die Zwischenablage, damit
 * Tester ihn in ein GitHub-Issue oder eine Nachricht einfügen. Liest nur, was der Client ohnehin hat;
 * nichts wird gesendet. Die Auswahl der Logzeilen und das Schwärzen stehen in {@link Diagnostics}.
 */
public final class HologramDiagnose {
    private static String loader = "unbekannt";
    private static String version = "unbekannt";
    private static java.util.function.IntSupplier errors = () -> 0;

    private HologramDiagnose() {}

    /** Vom {@link HologramClient} beim Start gesetzt. */
    static void init(String loaderName, String modVersion) { loader = loaderName; version = modVersion; }

    /** Zähler des Absturzschutzes ({@link HologramClient#errors()}), erscheint im Bericht unter „Mod“. */
    static void errors(java.util.function.IntSupplier count) { errors = count; }

    /** Baut den Bericht, schreibt ihn und meldet das Ergebnis im Chat. */
    static int run(Hologram h, LiveLink link) {
        Minecraft mc = Minecraft.getInstance();
        Path game = mc.gameDirectory.toPath();
        Path root = h.plansDir().getParent();
        String text;
        try {
            text = report(mc, h, link, game).text(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        } catch (RuntimeException | LinkageError e) {
            // Der Bericht soll auch dann entstehen, wenn ein Teil des Spiels nicht lesbar ist.
            text = "## Build-Studio-Mod Diagnose\nBericht unvollständig: " + e + "\nMod " + version + " · " + loader + " · Minecraft " + McCompat.gameVersion() + "\n";
        }
        String where;
        try {
            Path dir = Diagnostics.dir(root);
            Files.createDirectories(dir);
            Path file = dir.resolve(Diagnostics.fileName(LocalDateTime.now()));
            Files.writeString(file, text, StandardCharsets.UTF_8);
            where = "bauplaner/diagnose/" + file.getFileName();
        } catch (Exception e) {
            where = null;
        }
        boolean copied;
        // Minecraft only logs when the system refuses the clipboard (seen on headless Wayland): read it back before saying so.
        try {
            mc.keyboardHandler.setClipboard(text);
            String back = mc.keyboardHandler.getClipboard();
            copied = back != null && back.replace("\r\n", "\n").strip().equals(text.replace("\r\n", "\n").strip());
        } catch (RuntimeException e) { copied = false; }
        McCompat.chat(mc, Component.literal("[Build Studio] Diagnose " + (where == null ? "nicht speicherbar" : "gespeichert: " + where)
                + (copied ? " und in die Zwischenablage kopiert." : where == null ? "." : " – die Zwischenablage ging nicht, bitte die Datei anhängen.") + " Im Fehlerbericht (Website → Testphase → Fehler melden) einfügen oder die Datei anhängen."));
        return 1;
    }

    private static Diagnostics report(Minecraft mc, Hologram h, LiveLink link, Path game) {
        var d = new Diagnostics(System.getProperty("user.home"));
        Runtime rt = Runtime.getRuntime();
        d.put("Mod", "Version", version).put("Mod", "Loader", loader)
                .put("Mod", "Minecraft", McCompat.gameVersion() + " (DataVersion " + McCompat.dataVersion() + ")")
                .put("Mod", "Java", System.getProperty("java.version") + " · " + System.getProperty("java.vendor"))
                .put("Mod", "System", System.getProperty("os.name") + " " + System.getProperty("os.version") + " · " + System.getProperty("os.arch"))
                .put("Mod", "Arbeitsspeicher", (rt.totalMemory() - rt.freeMemory()) / 1_048_576 + " von " + rt.maxMemory() / 1_048_576 + " MB")
                .put("Mod", "Launcher (geschätzt)", launcher(game))
                .put("Mod", "Instanzordner", game.toAbsolutePath())
                .put("Mod", "Abgefangene Fehler seit Start", errors.getAsInt());

        List<String> mods = modFiles(game);
        d.put("Modpack", "Mods im Ordner mods", mods.size()).put("Modpack", "Dateien", mods.isEmpty() ? "–" : String.join(", ", mods))
                .put("Modpack", "Shaderpaket aktiv", McCompat.shadersActive() ? "ja (Iris)" : "nein");

        // Tastenkonflikte: jede Build-Studio-Taste gegen alle anderen Tasten des Spiels.
        List<String> clashes = new ArrayList<>();
        for (KeyMapping k : mc.options.keyMappings) {
            if (k.getCategory() != HologramKeys.CATEGORY) continue;
            List<String> with = new ArrayList<>();
            if (!k.isUnbound()) for (KeyMapping other : mc.options.keyMappings) if (other != k && other.same(k)) with.add(Component.translatable(other.getName()).getString());
            String line = Component.translatable(k.getName()).getString() + " = " + (k.isUnbound() ? "nicht belegt" : k.getTranslatedKeyMessage().getString());
            d.put("Tasten", line, with.isEmpty() ? "ok" : "KONFLIKT mit " + String.join(", ", with));
            if (!with.isEmpty()) clashes.add(line);
        }
        d.put("Tasten", "Konflikte gesamt", clashes.size());

        d.put("Welt", "Art", mc.level == null ? "keine Welt geladen" : mc.hasSingleplayerServer() ? "Einzelspieler" : "Mehrspieler/Server")
                .put("Welt", "Dimension", mc.level == null ? null : McCompat.dimension(mc.level))
                .put("Welt", "Spieler", mc.player == null ? null : mc.player.blockPosition().toShortString());

        d.put("Hologramm", "Plan eingeblendet", h.active() ? "ja" : "nein").put("Hologramm", "Pläne im Ordner", h.planFiles().size());
        if (h.active()) {
            var c = h.check();
            var p = c.placement();
            d.put("Hologramm", "Datei", h.planFile()).put("Hologramm", "Planname", h.plan().name())
                    .put("Hologramm", "Planblöcke", c.size())
                    .put("Hologramm", "Planbox", h.plan().size()[0] + " × " + h.plan().size()[1] + " × " + h.plan().size()[2] + " · " + c.chunkCount() + " Chunks")
                    .put("Hologramm", "Platzierung", p.dimension() + " " + p.x() + " " + p.y() + " " + p.z() + " · " + p.turns() * 90 + "°" + (p.mirror() ? " · gespiegelt" : ""))
                    .put("Hologramm", "Fortschritt", c.percent() + " % · richtig " + c.count(Verdict.OK) + " · fehlt " + c.count(Verdict.MISSING) + " · falsch " + c.count(Verdict.WRONG)
                            + " · Zustand " + c.count(Verdict.STATE) + " · nicht geladen " + c.count(Verdict.UNKNOWN))
                    .put("Hologramm", "Sichtbar", h.visible() ? "ja" : "ausgeblendet")
                    .put("Hologramm", "Ebenen", switch (h.layers()) { case ALL -> "alle"; case ONE -> "nur " + h.layerY(); case BELOW -> "bis " + h.layerY(); })
                    .put("Hologramm", "Bauabschnitt", h.section() == 0 ? "alle (" + h.sectionNames().size() + " vorhanden)" : h.section() + " „" + h.sectionName() + "“");
        }
        d.put("Hologramm", "Leistung", h.budget().label + " · Anteil " + Math.round(h.budgetScale() * 100) + " % · " + h.fps() + " fps · gezeigt " + h.shown() + (h.capped() ? " (gekappt)" : "") + (h.loading() ? " · lädt" : ""))
                .put("Speicher", "Java-Heap", (Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) / 1_048_576 + " MB belegt von " + Runtime.getRuntime().maxMemory() / 1_048_576 + " MB");
        d.put("Hologramm", "Texturen", h.textured() ? "an" : "aus").put("Hologramm", "Röntgensicht", h.xray() ? "an" : "aus")
                .put("Hologramm", "Platzierhilfe", h.guard().label);

        d.put("Website-Verbindung", "Status", link.statusText()).put("Website-Verbindung", "Läuft", link.running() ? "ja, Port " + link.port() : "nein")
                .put("Website-Verbindung", "Website zuletzt aktiv", link.websiteActive() ? "ja (letzte 5 s)" : "nein");

        d.log(latestLog(game));
        return d;
    }

    /** Dateinamen im mods-Ordner (ohne Unterordner), sortiert; zeigt das Modpack unabhängig vom Loader. */
    private static List<String> modFiles(Path game) {
        try (var files = Files.list(game.resolve("mods"))) {
            return files.map(f -> f.getFileName().toString()).filter(n -> n.endsWith(".jar") || n.endsWith(".disabled")).sorted(String.CASE_INSENSITIVE_ORDER).toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private static String launcher(Path game) {
        String p = game.toAbsolutePath().toString().toLowerCase(Locale.ROOT).replace('\\', '/');
        if (p.contains("modrinthapp") || p.contains("com.modrinth")) return "Modrinth App";
        if (p.contains("prismlauncher") || p.contains("polymc")) return "Prism Launcher";
        if (p.contains("curseforge")) return "CurseForge";
        if (p.contains("atlauncher")) return "ATLauncher";
        if (p.contains("multimc")) return "MultiMC";
        if (p.endsWith("/.minecraft") || p.contains("/.minecraft/")) return "Offizieller Launcher";
        return "unbekannt";
    }

    /** Letzte Zeilen von logs/latest.log; nicht lesbar ⇒ leer. */
    private static List<String> latestLog(Path game) {
        try {
            byte[] bytes = Files.readAllBytes(game.resolve("logs").resolve("latest.log"));
            List<String> lines = new String(bytes, StandardCharsets.UTF_8).lines().toList();
            return lines.size() <= 20_000 ? lines : lines.subList(lines.size() - 20_000, lines.size());
        } catch (Exception e) {
            return List.of();
        }
    }
}
