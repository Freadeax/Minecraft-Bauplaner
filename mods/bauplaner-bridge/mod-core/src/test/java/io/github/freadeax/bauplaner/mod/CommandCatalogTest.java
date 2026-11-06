package io.github.freadeax.bauplaner.mod;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.freadeax.bauplaner.mod.commands.CommandCatalog;
import io.github.freadeax.bauplaner.mod.commands.CommandCatalog.Side;
import io.github.freadeax.bauplaner.mod.commands.CommandContext;
import io.github.freadeax.bauplaner.mod.commands.ReplyLog;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** Command page of the J menu (GAME-10): catalog, inputs, greyed-out buttons, answers. */
class CommandCatalogTest {

    @Test
    void catalogCoversClientAndServerAndUsesTheAliasForTheServer() {
        List<String> groups = CommandCatalog.groups();
        assertEquals(List.of("Status", "Hologramm", "Bauhilfen", "Team", "Server-Team", "Lager", "Nachweis", "Verbindung", "Aufnahme"), groups);
        // EDIT-04: symmetry and curve commands are clickable too (client side, no server).
        assertTrue(CommandCatalog.all().stream().filter(e -> e.group().equals("Bauhilfen")).allMatch(e -> e.side() == CommandCatalog.Side.CLIENT));
        assertTrue(CommandCatalog.all().stream().filter(e -> e.group().equals("Bauhilfen")).count() >= 15);
        Set<String> ids = new HashSet<>();
        for (var e : CommandCatalog.all()) {
            assertTrue(ids.add(e.id()), "doppelte ID " + e.id());
            assertTrue(e.base().startsWith(e.side() == Side.SERVER ? "bp " : "bauplaner "), e.id());
            assertFalse(e.help().isBlank(), e.id());
        }
        // Every client top-level command of the mod is reachable (no hidden feature).
        for (String path : List.of("fortschritt", "fehler", "packliste", "geruest", "markieren", "markierungen", "umschalten", "roentgen", "texturen", "material", "hierher", "drehen", "spiegeln", "verschieben", "ebene",
                "abschnitt", "platzierhilfe", "leistung", "entfernen", "diagnose", "team", "verbinden", "ebenen", "plaene", "plan", "anker hier", "scan", "status", "abbrechen"))
            assertTrue(CommandCatalog.all().stream().anyMatch(e -> e.side() == Side.CLIENT && e.path().equals(path)), path);
        // Plugin commands as agreed with the plugin (TeamModule.COMMANDS, StorageModule.SUBCOMMANDS).
        for (String path : List.of("team", "abschnitte", "nehmen", "abgeben", "fertig", "zeigen", "notiz", "notizen", "geliefert hand", "sammle", "zuweisen", "pruefen", "rolle",
                "lager liste", "lager info", "lager bedarf", "lager wer", "lager zeigen", "lager verlauf", "lager pruefen", "lager markieren", "lager entmarkieren", "lager siegeln",
                "lager name", "lager abschnitt", "lager zweck", "lager schutz", "lager hilfe", "nachweis", "beitrag", "beitrag alle", "plan", "anker hier", "scan"))
            assertTrue(CommandCatalog.all().stream().anyMatch(e -> e.side() == Side.SERVER && e.path().equals(path)), "bp " + path);
    }

    /** Read from the plugin sources, so a new plugin command fails here until the page knows it. */
    @Test
    void everyPluginCommandInTheSourcesHasAButton() throws Exception {
        var paper = java.nio.file.Path.of("..", "paper", "src", "main", "java", "io", "github", "freadeax", "bauplaner", "bridge", "paper");
        List<String> team = listIn(java.nio.file.Files.readString(paper.resolve("TeamModule.java")), "COMMANDS");
        List<String> storage = listIn(java.nio.file.Files.readString(paper.resolve("StorageModule.java")), "SUBCOMMANDS");
        assertTrue(team.size() > 10 && storage.size() > 10, team + " " + storage);
        Set<String> aliases = Set.of("setzen", "entfernen", "zaehlen"); // markieren, entmarkieren, pruefen
        for (String c : team) {
            if (c.equals("lager")) continue;
            assertTrue(CommandCatalog.all().stream().anyMatch(e -> e.side() == Side.SERVER && (e.path().equals(c) || e.path().startsWith(c + " "))), "Knopf für /bp " + c);
        }
        // „team“ subcommands from the tab completion; verbinden on purpose only in the console (link carries the server key).
        var sub = java.util.regex.Pattern.compile("case \"team\" -> args.length == 2 \\? List.of\\(([^)]*)\\)").matcher(java.nio.file.Files.readString(paper.resolve("TeamModule.java")));
        assertTrue(sub.find(), "team-Unterbefehle");
        for (var r : java.util.regex.Pattern.compile("\"([a-z]+)\"").matcher(sub.group(1)).results().toList()) {
            String c = r.group(1);
            if (c.equals("verbinden")) continue;
            assertTrue(CommandCatalog.all().stream().anyMatch(e -> e.side() == Side.SERVER && e.path().equals("team " + c)), "Knopf für /bp team " + c);
        }
        for (String c : storage) {
            if (aliases.contains(c)) continue;
            assertTrue(CommandCatalog.all().stream().anyMatch(e -> e.side() == Side.SERVER && e.path().equals("lager " + c)), "Knopf für /bp lager " + c);
        }
    }

    private static List<String> listIn(String source, String name) {
        var m = java.util.regex.Pattern.compile(name + "\\s*=\\s*List\\.of\\(([^)]*)\\)").matcher(source);
        assertTrue(m.find(), name);
        return java.util.regex.Pattern.compile("\"([a-z ]+)\"").matcher(m.group(1)).results().map(r -> r.group(1)).toList();
    }

    @Test
    void inputsBecomeTheTypedCommandOrAGermanReason() {
        var nehmen = CommandCatalog.byId("team.nehmen");
        assertEquals("bauplaner team nehmen 3", CommandCatalog.command(nehmen, List.of(" 3 ")));
        assertEquals("„abschnitt“ fehlt.", assertThrows(IllegalArgumentException.class, () -> CommandCatalog.command(nehmen, List.of(""))).getMessage());
        var fertig = CommandCatalog.byId("team.fertig");
        assertEquals("bauplaner team fertig", CommandCatalog.command(fertig, Arrays.asList("", "")));
        assertEquals("bauplaner team fertig 2 Ecke steht, Dach fehlt", CommandCatalog.command(fertig, List.of("2", "Ecke steht, Dach fehlt")));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> CommandCatalog.command(fertig, List.of("", "nur Notiz"))).getMessage().contains("zusammen mit dem Feld davor"));
        var notiz = CommandCatalog.byId("bp.notiz");
        assertEquals("bp notiz frage Treppe links oder rechts?", CommandCatalog.command(notiz, List.of("Frage", "Treppe links oder rechts?")));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> CommandCatalog.command(notiz, List.of("bombe", "x"))).getMessage().contains("frage, problem, material, info"));
        assertEquals("bp lager wer oak_planks", CommandCatalog.command(CommandCatalog.byId("bp.lager.wer"), List.of("Oak_Planks")));
        assertEquals("bp lager wer minecraft:oak_planks", CommandCatalog.command(CommandCatalog.byId("bp.lager.wer"), List.of("minecraft:oak_planks")));
        assertThrows(IllegalArgumentException.class, () -> CommandCatalog.command(CommandCatalog.byId("bp.zuweisen"), List.of("2", "kein name!")));
        assertThrows(IllegalArgumentException.class, () -> CommandCatalog.command(CommandCatalog.byId("verschieben"), List.of("1", "zwei", "3")));
        assertEquals("bauplaner verschieben -10 0 4", CommandCatalog.command(CommandCatalog.byId("verschieben"), List.of("-10", "0", "4")));
        assertThrows(IllegalArgumentException.class, () -> CommandCatalog.command(fertig, List.of("2", "x".repeat(251))));
        assertEquals("bp abwesend 2026-11-10 Urlaub", CommandCatalog.command(CommandCatalog.byId("bp.abwesend"), List.of("2026-11-10 Urlaub")));
        assertEquals("bp uebergeben 3 Anna Dach fehlt", CommandCatalog.command(CommandCatalog.byId("bp.uebergeben"), List.of("3", "Anna", "Dach fehlt")));
        assertEquals("bp annehmen", CommandCatalog.command(CommandCatalog.byId("bp.annehmen"), List.of("")));
        assertEquals("bp scan", CommandCatalog.command(CommandCatalog.byId("bp.scan"), List.of("")));
        assertEquals("bp scan geladen", CommandCatalog.command(CommandCatalog.byId("bp.scan"), List.of("geladen")));
        assertEquals("bauplaner fortschritt", CommandCatalog.command(CommandCatalog.byId("fortschritt"), List.of()));
    }

    @Test
    void buttonsAreGreyedOutWithAReason() {
        var none = new CommandContext(false, false, null, false, false);
        assertTrue(none.blocked(CommandCatalog.byId("fehler")).contains("Plan"));
        assertTrue(none.blocked(CommandCatalog.byId("team.nehmen")).contains("Mit Spiel abgleichen"));
        assertTrue(none.blocked(CommandCatalog.byId("bp.beitrag")).contains("kein Bauplaner-Plugin"));
        assertNull(none.blocked(CommandCatalog.byId("diagnose")));
        assertNull(none.blocked(CommandCatalog.byId("team.erlauben")));
        var helper = new CommandContext(true, true, "helfer", true, false);
        assertNull(helper.blocked(CommandCatalog.byId("bp.beitrag")));
        assertTrue(helper.blocked(CommandCatalog.byId("bp.rolle")).contains("Bauleitung"));
        assertTrue(helper.blocked(CommandCatalog.byId("bp.lager.markieren")).contains("Kiste"));
        assertNull(helper.blocked(CommandCatalog.byId("bp.lager.pruefen")), "ohne Blick prüft der Server alle Kisten");
        var lead = new CommandContext(true, true, "leitung", true, true);
        assertNull(lead.blocked(CommandCatalog.byId("bp.rolle")));
        assertNull(lead.blocked(CommandCatalog.byId("bp.lager.markieren")));
        // Without a team state the role is unknown: the server decides and answers itself.
        assertNull(new CommandContext(false, false, null, true, false).blocked(CommandCatalog.byId("bp.team.laden")));
    }

    @Test
    void answersKeepOwnLinesAndTheServersReplyToACommandSentFromThePage() {
        ReplyLog log = new ReplyLog();
        assertFalse(log.offer("<Anna> hallo", 1000), "fremder Chat bleibt draußen");
        assertTrue(log.own("[Bauplaner] Abschnitt 2 genommen.", 1000));
        assertFalse(log.offer("[Bauplaner] Abschnitt 2 genommen.", 1000), "eigene Zeile nicht doppelt über das Chat-Ereignis");
        log.sent("bp lager liste", true, 2000);
        assertTrue(log.offer("Lagerkisten: 3", 2500), "Antwort des Servers ohne Präfix");
        assertFalse(log.offer("Server neu gestartet in 5 min", 2000 + ReplyLog.SERVER_WINDOW + 1));
        log.sent("bauplaner fortschritt", false, 9000);
        assertFalse(log.offer("<Ben> Hallo", 9100), "nach Client-Befehlen kein Fenster für fremde Zeilen");
        var last = log.last(10);
        assertEquals(List.of("Abschnitt 2 genommen.", "› /bp lager liste", "Lagerkisten: 3", "› /bauplaner fortschritt"), last.stream().map(ReplyLog.Line::text).toList());
        for (int i = 0; i < 100; i++) log.own("[Bauplaner] " + i, 10_000 + i);
        assertEquals(ReplyLog.MAX, log.last(1000).size());
        assertEquals("99", log.last(1).get(0).text());
    }
}
