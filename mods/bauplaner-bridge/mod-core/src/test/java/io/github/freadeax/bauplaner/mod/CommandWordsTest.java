package io.github.freadeax.bauplaner.mod;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.freadeax.bauplaner.mod.commands.CommandCatalog;
import io.github.freadeax.bauplaner.mod.commands.CommandWords;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/** GAME-12 (0.23.0): every client command in German and English, texts in both languages. */
class CommandWordsTest {
    @AfterEach
    void german() { Lang.choose(Lang.Choice.AUTO); Lang.game("de_de"); }

    /** Read from the client sources: a new German command word fails here until it has an English twin. */
    @Test
    void everyClientCommandWordHasAnEnglishTwin() throws Exception {
        Pattern literal = Pattern.compile("literal\\(\"([a-z0-9_]+)\"\\)");
        Set<String> missing = new TreeSet<>();
        int words = 0;
        for (String dir : List.of("../hologram-26.3/src/main/java", "../client-26.3/src/main/java", "../fabric-26.3/src/main/java", "../neoforge-26.3/src/main/java")) {
            try (Stream<Path> files = Files.walk(Path.of(dir))) {
                for (Path f : files.filter(p -> p.toString().endsWith(".java")).toList()) {
                    var m = literal.matcher(Files.readString(f));
                    while (m.find()) {
                        String w = m.group(1);
                        words++;
                        if (!CommandWords.translated(w) && !CommandWords.SAME.contains(w)) missing.add(w + " (" + f.getFileName() + ")");
                    }
                }
            }
        }
        assertTrue(words > 80, "zu wenige Befehlswörter gefunden: " + words);
        assertEquals(Set.of(), missing, "Befehlswörter ohne englisches Wort in CommandWords");
        // Dynamic literals (language, messages, panel) are not found by the pattern above.
        for (String w : List.of("deutsch", "englisch", "einblendung", "beides", "kompakt", "ausfuehrlich")) assertTrue(CommandWords.translated(w), w);
    }

    @Test
    void englishWordsAreUniqueAndNeverAGermanWord() {
        Set<String> seen = new HashSet<>();
        for (var e : CommandWords.all().entrySet()) {
            assertTrue(seen.add(e.getValue()), "zweimal " + e.getValue());
            assertFalse(CommandWords.all().containsKey(e.getValue()), e.getValue() + " ist auch ein deutsches Wort");
            assertFalse(CommandWords.SAME.contains(e.getValue()), e.getValue());
            assertTrue(e.getValue().matches("[a-z]+"), e.getValue());
        }
        assertEquals("buildplanner team take 3", CommandWords.english("bauplaner team nehmen 3"));
        assertEquals("buildplanner group off Markt alle", CommandWords.english("bauplaner gruppe aus Markt alle"));
        assertEquals("bp lager liste", CommandWords.english("bp lager liste"));
    }

    @Test
    void languageFollowsTheGameUnlessChosen() {
        Lang.game("en_us");
        assertTrue(Lang.en());
        Lang.game("de_at");
        assertFalse(Lang.en());
        Lang.choose(Lang.Choice.EN);
        assertTrue(Lang.en());
        assertEquals("Progress", CommandCatalog.byId("fortschritt").title());
        assertEquals("/buildplanner team take", CommandCatalog.byId("team.nehmen").typed());
        assertEquals("/bp lager liste", CommandCatalog.byId("bp.lager.liste").typed());
        assertEquals("Hologram", CommandCatalog.groupLabel(CommandCatalog.HOLOGRAM));
        assertEquals(Lang.Choice.EN, Lang.Choice.parse("English"));
        assertEquals(Lang.Choice.DE, Lang.Choice.parse("deutsch"));
        Lang.choose(Lang.Choice.DE);
        assertEquals("Fortschritt", CommandCatalog.byId("fortschritt").title());
        assertEquals("/bauplaner team nehmen", CommandCatalog.byId("team.nehmen").typed());
    }

    @Test
    void everyCatalogEntryHasEnglishText() {
        Lang.choose(Lang.Choice.EN);
        for (var e : CommandCatalog.all()) {
            assertFalse(e.labelEn().equals(e.label()) && !Set.of("Status", "Team", "Plan", "Position").contains(e.label()) && !e.label().matches("[A-Za-z ]+"), "englisches Label fehlt: " + e.id());
            assertFalse(e.helpEn().equals(e.help()), "englische Hilfe fehlt: " + e.id());
        }
        for (String g : CommandCatalog.groups()) assertFalse(CommandCatalog.groupLabel(g).isBlank(), g);
        for (var n : CommandCatalog.Need.values()) if (n != CommandCatalog.Need.NONE) assertFalse(n.text().equals(n.reason), n.name());
    }
}
