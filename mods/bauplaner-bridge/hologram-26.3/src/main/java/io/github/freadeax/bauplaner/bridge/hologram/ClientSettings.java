package io.github.freadeax.bauplaner.bridge.hologram;

import io.github.freadeax.bauplaner.mod.Lang;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

/**
 * The player's own display settings (GAME-12, 0.23.0), saved in {@code bauplaner/oberflaeche.properties} (separate from the hologram settings in einstellungen.properties):
 * language of the mod, where messages appear and how much the build panel at the top right shows.
 * Changed with {@code /bauplaner sprache|meldungen|anzeige …} or in the plan menu (J) → „Einstellungen“.
 */
public final class ClientSettings {
    /** Where the mod's messages go. */
    public enum Notices {
        POPUP("einblendung", "Einblendung", "pop-up"),
        CHAT("chat", "Chat (wie früher)", "chat (as before)"),
        BOTH("beides", "Einblendung und Chat", "pop-up and chat");
        public final String key, de, en;
        Notices(String key, String de, String en) { this.key = key; this.de = de; this.en = en; }
        public String label() { return Lang.t(de, en); }
        public Notices next() { return values()[(ordinal() + 1) % values().length]; }
        static Notices parse(String s) {
            for (Notices n : values()) if (n.key.equals(s) || n.name().equalsIgnoreCase(s)) return n;
            return switch (s == null ? "" : s) { case "popup" -> POPUP; case "both" -> BOTH; default -> null; };
        }
    }

    /** How much the build panel (top right) shows. */
    public enum Panel {
        COMPACT("kompakt", "kompakt", "compact"),
        DETAILED("ausfuehrlich", "ausführlich", "detailed"),
        HIDDEN("aus", "aus", "off");
        public final String key, de, en;
        Panel(String key, String de, String en) { this.key = key; this.de = de; this.en = en; }
        public String label() { return Lang.t(de, en); }
        public Panel next() { return values()[(ordinal() + 1) % values().length]; }
        static Panel parse(String s) {
            for (Panel p : values()) if (p.key.equals(s) || p.name().equalsIgnoreCase(s)) return p;
            return switch (s == null ? "" : s) { case "compact" -> COMPACT; case "detailed" -> DETAILED; case "off", "hidden" -> HIDDEN; default -> null; };
        }
    }

    private static Path file;
    private static Notices notices = Notices.POPUP;
    private static Panel panel = Panel.COMPACT;

    private ClientSettings() {}

    static void load(Path root) {
        file = root.resolve("oberflaeche.properties");
        if (!Files.isRegularFile(file)) return;
        Properties p = new Properties();
        try (Reader r = Files.newBufferedReader(file, StandardCharsets.UTF_8)) { p.load(r); } catch (IOException | IllegalArgumentException e) { return; }
        Lang.Choice c = Lang.Choice.parse(p.getProperty("sprache"));
        if (c != null) Lang.choose(c);
        Notices n = Notices.parse(p.getProperty("meldungen"));
        if (n != null) notices = n;
        Panel pa = Panel.parse(p.getProperty("anzeige"));
        if (pa != null) panel = pa;
    }

    private static void save() {
        if (file == null) return;
        Properties p = new Properties();
        p.setProperty("sprache", Lang.choice().key);
        p.setProperty("meldungen", notices.key);
        p.setProperty("anzeige", panel.key);
        try {
            Files.createDirectories(file.getParent());
            try (Writer w = Files.newBufferedWriter(file, StandardCharsets.UTF_8)) { p.store(w, "Bauplaner: Sprache (auto|deutsch|english), Meldungen (einblendung|chat|beides), Anzeige (kompakt|ausfuehrlich|aus)"); }
        } catch (IOException ignored) {
            // Settings are a convenience: without a writable folder they last until the game closes.
        }
    }

    public static Notices notices() { return notices; }
    public static Panel panel() { return panel; }

    static String setLanguage(Lang.Choice c) {
        Lang.choose(c);
        save();
        return Lang.t("Sprache: ", "Language: ") + c.label() + Lang.t(" – Befehle gehen in beiden Sprachen (/bauplaner und /buildplanner).",
                " – commands work in both languages (/bauplaner and /buildplanner).");
    }

    static String setNotices(Notices n) {
        notices = n;
        save();
        return Lang.t("Meldungen: ", "Messages: ") + n.label() + ".";
    }

    static String setPanel(Panel p) {
        panel = p;
        save();
        return Lang.t("Bauanzeige: ", "Build panel: ") + p.label() + ".";
    }
}
