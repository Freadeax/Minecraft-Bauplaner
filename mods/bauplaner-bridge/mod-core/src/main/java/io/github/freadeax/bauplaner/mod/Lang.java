package io.github.freadeax.bauplaner.mod;

import java.util.Locale;

/**
 * Language of the mod's own texts (GAME-12, 0.23.0): German or English. {@link Choice#AUTO} follows the game
 * language (German for every {@code de_*}, English otherwise); {@code /bauplaner sprache deutsch|english|auto}
 * or the button in the plan menu overrides it. Texts stay next to the code that uses them as pairs
 * {@code t("Deutsch", "English")}, so a new line cannot forget one of the two languages.
 * Version neutral: the client sets the game language every tick, the core only reads the flag.
 */
public final class Lang {
    private Lang() {}

    public enum Choice {
        AUTO("auto", "automatisch (wie das Spiel)", "automatic (like the game)"),
        DE("deutsch", "Deutsch", "German"),
        EN("english", "Englisch", "English");
        public final String key, de, en;
        Choice(String key, String de, String en) { this.key = key; this.de = de; this.en = en; }
        public String label() { return t(de, en); }
        public Choice next() { return values()[(ordinal() + 1) % values().length]; }
        /** "deutsch", "german", "de", "english", "englisch", "en", "auto" → choice; null when unknown. */
        public static Choice parse(String s) {
            if (s == null) return null;
            return switch (s.trim().toLowerCase(Locale.ROOT)) {
                case "auto", "automatisch", "automatic", "spiel", "game" -> AUTO;
                case "deutsch", "german", "de", "de_de" -> DE;
                case "english", "englisch", "en", "en_us", "en_gb" -> EN;
                default -> null;
            };
        }
    }

    private static volatile Choice choice = Choice.AUTO;
    private static volatile boolean gameGerman = true;

    public static Choice choice() { return choice; }
    public static void choose(Choice c) { choice = c == null ? Choice.AUTO : c; }

    /** Game language code such as "de_de" or "en_us". */
    public static void game(String code) { gameGerman = code == null || code.toLowerCase(Locale.ROOT).startsWith("de"); }

    /** True when the mod speaks English right now. */
    public static boolean en() { return choice == Choice.EN || choice == Choice.AUTO && !gameGerman; }

    /** The text in the current language. */
    public static String t(String de, String en) { return en() ? en : de; }

    /** Number with the grouping of the current language: "30.000" or "30,000". */
    public static String n(long value) { return String.format(en() ? Locale.ENGLISH : Locale.GERMANY, "%,d", value); }
}
