package io.github.freadeax.bauplaner.mod;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.freadeax.bauplaner.mod.commands.CommandExport;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/** GAME-12: the command list on the planner page #/mod comes from the mod's own catalog and must stay in step. */
class CommandExportTest {
    private static final Path FILE = Path.of("../../../apps/web/src/views/mod/modCommands.json");

    @Test
    void plannerPageListsTheCurrentCatalog() throws Exception {
        String json = CommandExport.json();
        if (Boolean.getBoolean("bauplaner.writeCommands") || "1".equals(System.getenv("BAUPLANER_WRITE_COMMANDS"))) Files.writeString(FILE, json, StandardCharsets.UTF_8);
        assertTrue(Files.isRegularFile(FILE), "modCommands.json fehlt – mit BAUPLANER_WRITE_COMMANDS=1 ./gradlew :mod-core:test erzeugen");
        assertEquals(json, Files.readString(FILE, StandardCharsets.UTF_8), "modCommands.json veraltet – mit BAUPLANER_WRITE_COMMANDS=1 ./gradlew :mod-core:test neu schreiben");
    }

    @Test
    void englishCommandsUseTheEnglishRoot() {
        String json = CommandExport.json();
        assertTrue(json.contains("\"command\": \"/buildplanner progress\""), "englischer Befehl für fortschritt");
        assertTrue(json.contains("\"command\": \"/bauplaner fortschritt\""), "deutscher Befehl");
    }
}
