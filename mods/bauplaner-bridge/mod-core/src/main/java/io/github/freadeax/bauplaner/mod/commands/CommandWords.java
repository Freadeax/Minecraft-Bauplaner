package io.github.freadeax.bauplaner.mod.commands;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * German command word → English command word (GAME-12, 0.23.0). The client registers every {@code /bauplaner}
 * literal a second time under its English word, so {@code /bauplaner fortschritt} and
 * {@code /buildplanner progress} (also mixed, e.g. {@code /bauplaner progress}) run the same command.
 * Tab completion offers the words of the current language ({@link io.github.freadeax.bauplaner.mod.Lang}).
 * Words that are the same in both languages (status, scan, team, x …) are simply missing here.
 * {@code CommandWordsTest} reads the mod sources and fails when a German literal has no entry.
 */
public final class CommandWords {
    private CommandWords() {}

    /** Root of the English command tree; {@code /bauplaner} stays the German one. */
    public static final String ROOT_DE = "bauplaner", ROOT_EN = "buildplanner";

    private static final Map<String, String> EN = build();

    private static Map<String, String> build() {
        Map<String, String> m = new LinkedHashMap<>();
        // Recording (core)
        put(m, "plaene", "plans"); put(m, "anker", "anchor"); put(m, "hier", "here"); put(m, "abbrechen", "cancel");
        // Help, language, notices, menus (0.23.0)
        put(m, "hilfe", "help"); put(m, "sprache", "language"); put(m, "deutsch", "german"); put(m, "englisch", "english");
        put(m, "meldungen", "notices"); put(m, "einblendung", "popup"); put(m, "beides", "both"); put(m, "menue", "menu"); put(m, "kompakt", "compact"); put(m, "ausfuehrlich", "detailed"); put(m, "befehle", "commands");
        // Hologram
        put(m, "zeigen", "show"); put(m, "fortschritt", "progress"); put(m, "hierher", "moveto"); put(m, "verschieben", "move");
        put(m, "drehen", "rotate"); put(m, "spiegeln", "mirror"); put(m, "umschalten", "toggle"); put(m, "fehler", "error");
        put(m, "packliste", "packlist"); put(m, "geruest", "scaffold"); put(m, "entfernen", "remove"); put(m, "ebene", "layer");
        put(m, "alle", "all"); put(m, "bis", "upto"); put(m, "texturen", "textures"); put(m, "platzierhilfe", "assist");
        put(m, "an", "on"); put(m, "aus", "off"); put(m, "warnen", "warn"); put(m, "abschnitt", "section"); put(m, "weiter", "next");
        put(m, "roentgen", "xray"); put(m, "leistung", "performance"); put(m, "niedrig", "low"); put(m, "hoch", "high");
        // Website link and Weltplan
        put(m, "verbinden", "connect"); put(m, "zulassen", "approve"); put(m, "ablehnen", "deny");
        put(m, "markieren", "mark"); put(m, "markierungen", "marks"); put(m, "loeschen", "delete"); put(m, "ebenen", "layers");
        put(m, "gruppe", "group"); put(m, "gelaende", "terrain"); put(m, "vergessen", "forget");
        // Team
        put(m, "abschnitte", "sections"); put(m, "nehmen", "take"); put(m, "abgeben", "release"); put(m, "fertig", "done");
        put(m, "pruefen", "review"); put(m, "nacharbeit", "rework"); put(m, "zuweisen", "assign"); put(m, "mein", "mine");
        put(m, "frei", "free"); put(m, "notiz", "note"); put(m, "notizen", "notes"); put(m, "erledigt", "resolve");
        put(m, "geliefert", "delivered"); put(m, "sammle", "collect"); put(m, "lager", "storage"); put(m, "aufnahme", "record");
        put(m, "erlauben", "allow"); put(m, "verbieten", "forbid"); put(m, "korb", "outbox"); put(m, "leeren", "clear");
        put(m, "rahmen", "frames"); put(m, "anzeige", "panel");
        put(m, "mitbauen", "join"); put(m, "aussteigen", "leave");
        // Build guides
        put(m, "symmetrie", "symmetry"); put(m, "kante", "edge"); put(m, "kurve", "curve"); put(m, "punkt", "point");
        put(m, "zurueck", "undo"); put(m, "profil", "profile"); put(m, "rohr", "pipe"); put(m, "weg", "path"); put(m, "mauer", "wall");
        put(m, "breite", "width"); put(m, "hoehe", "height"); put(m, "geschlossen", "closed"); put(m, "glatt", "smooth");
        put(m, "versetzen", "shift"); put(m, "alsplan", "asplan"); put(m, "bauhilfe", "guide");
        return Collections.unmodifiableMap(m);
    }

    private static void put(Map<String, String> m, String de, String en) {
        if (m.put(de, en) != null) throw new IllegalStateException("doppelt: " + de);
    }

    /** All pairs German → English. */
    public static Map<String, String> all() { return EN; }

    /** The English word for a German command word, or the word itself when it is the same in both languages. */
    public static String en(String de) { return EN.getOrDefault(de, de); }

    /** True when the word has an English twin. */
    public static boolean translated(String de) { return EN.containsKey(de); }

    /** A typed command line ("bauplaner team nehmen 3") in English words ("buildplanner team take 3"); arguments stay. */
    public static String english(String line) {
        String[] parts = line.split(" ", -1);
        if (!parts[0].equals(ROOT_DE)) return line; // server commands (/bp …) only know the German words
        StringBuilder out = new StringBuilder();
        boolean words = true;
        for (int i = 0; i < parts.length; i++) {
            String p = parts[i];
            String w = i == 0 && p.equals(ROOT_DE) ? ROOT_EN : words && i > 0 && EN.containsKey(p) ? EN.get(p) : p;
            // Only leading literals are translated: after the first argument everything is user input.
            if (i > 0 && !EN.containsKey(p) && !EN.containsValue(p) && !SAME.contains(p)) words = false;
            out.append(i == 0 ? "" : " ").append(w);
        }
        return out.toString();
    }

    /** Words that are the same in both languages (no entry needed). */
    public static final java.util.Set<String> SAME = java.util.Set.of("bauplaner", "status", "scan", "plan", "team", "material", "diagnose", "port", "x", "z",
            "normal", "ok", "hand", "block", "radius", "auto", "chat");
}
