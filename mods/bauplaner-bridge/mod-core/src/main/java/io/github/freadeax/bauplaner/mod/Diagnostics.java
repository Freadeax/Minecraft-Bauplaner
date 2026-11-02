package io.github.freadeax.bauplaner.mod;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Diagnosebericht der Mod für die Testphase (QA-04): Abschnitte mit Schlüssel/Wert-Zeilen, dazu
 * ausgewählte Zeilen aus {@code logs/latest.log}. Reines Java ohne Minecraft, damit die Auswahl und das
 * Schwärzen testbar sind; die Spielschicht ({@code HologramDiagnose}) füllt die Werte.
 *
 * <p>Der Bericht verlässt den Rechner nie von selbst. Er schwärzt den Benutzerordner, Server-Adressen
 * (IPv4) und Zugangscodes, damit man ihn gefahrlos in ein GitHub-Issue kopieren kann.</p>
 */
public final class Diagnostics {
    /** Höchstens so viele Logzeilen kommen in den Bericht. */
    public static final int MAX_LOG_LINES = 80;

    private final Map<String, Map<String, String>> sections = new LinkedHashMap<>();
    private final List<String> log = new ArrayList<>();
    private final String home;

    /** @param home Benutzerordner (System {@code user.home}); wird in allen Werten als {@code ~} geschwärzt. */
    public Diagnostics(String home) { this.home = home == null || home.isBlank() ? null : home; }

    /** Setzt einen Wert; {@code null} wird als „–“ geschrieben. */
    public Diagnostics put(String section, String key, Object value) {
        sections.computeIfAbsent(section, s -> new LinkedHashMap<>()).put(key, value == null ? "–" : redact(String.valueOf(value)));
        return this;
    }

    public Map<String, Map<String, String>> sections() { return sections; }

    /** Übernimmt die passenden Zeilen aus dem Spiel-Log (siehe {@link #selectLog}). */
    public Diagnostics log(List<String> latestLog) {
        log.clear();
        for (String line : selectLog(latestLog, MAX_LOG_LINES)) log.add(redact(line));
        return this;
    }

    public List<String> logLines() { return List.copyOf(log); }

    private static final Pattern IPV4 = Pattern.compile("\\b(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\b");
    private static final Pattern CODE = Pattern.compile("(?i)(code|token|kopplungscode)([:= ]+)([A-Za-z0-9_-]{6,})");

    /** Schwärzt Benutzerordner, IPv4-Adressen außer 127.0.0.1 und Kopplungscodes. */
    public String redact(String text) {
        String out = text;
        if (home != null) {
            out = out.replace(home, "~");
            out = out.replace(home.replace('\\', '/'), "~");
        }
        out = IPV4.matcher(out).replaceAll(m -> m.group().equals("127.0.0.1") ? "127.0.0.1" : "x.x.x.x");
        out = CODE.matcher(out).replaceAll("$1$2•••");
        return out;
    }

    /**
     * Wählt die für Bauplaner-Fehler nützlichen Logzeilen: jede Zeile, die „bauplaner“ enthält, und die
     * Stack-Zeilen ({@code at …}, {@code Caused by}) direkt danach; dazu Fehlerzeilen ({@code /ERROR]},
     * {@code Exception}) anderer Mods aus dem letzten Teil, weil Abstürze oft dort beginnen. Von allem
     * die letzten {@code max} Zeilen, Reihenfolge wie im Log.
     */
    public static List<String> selectLog(List<String> lines, int max) {
        List<String> picked = new ArrayList<>();
        boolean inStack = false;
        int otherErrors = 0;
        int tailStart = Math.max(0, lines.size() - 400);
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            String lower = line.toLowerCase(Locale.ROOT);
            boolean stack = line.startsWith("\tat ") || line.startsWith("    at ") || line.startsWith("Caused by") || line.startsWith("\t... ");
            if (lower.contains("bauplaner")) { picked.add(line); inStack = true; continue; }
            if (inStack && stack) { picked.add(line); continue; }
            inStack = false;
            if (i >= tailStart && otherErrors < 20 && (line.contains("/ERROR]") || (line.contains("Exception") && !stack))) { picked.add(line); otherErrors++; }
        }
        return picked.size() <= max ? picked : List.copyOf(picked.subList(picked.size() - max, picked.size()));
    }

    /** Dateiname im Ordner {@code bauplaner/diagnose/}, sortierbar nach Zeit. */
    public static String fileName(java.time.LocalDateTime at) {
        return "diagnose-" + at.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")) + ".txt";
    }

    /** Ordner für Diagnoseberichte unterhalb des Bauplaner-Ordners der Instanz. */
    public static Path dir(Path bauplanerRoot) { return bauplanerRoot.resolve("diagnose"); }

    /** Klartext, wie er in die Datei und in die Zwischenablage kommt (Markdown-tauglich für GitHub). */
    public String text(String generatedAt) {
        StringBuilder b = new StringBuilder();
        b.append("## Bauplaner-Mod Diagnose\n");
        b.append("Erstellt: ").append(generatedAt).append('\n');
        b.append("Benutzerordner, Server-Adressen und Codes sind geschwärzt. Bitte vor dem Teilen kurz durchlesen.\n");
        for (var s : sections.entrySet()) {
            b.append("\n### ").append(s.getKey()).append('\n');
            for (var e : s.getValue().entrySet()) b.append("- ").append(e.getKey()).append(": ").append(e.getValue()).append('\n');
        }
        b.append("\n### Log (Auszug aus logs/latest.log, ").append(log.size()).append(" Zeilen)\n```\n");
        if (log.isEmpty()) b.append("(keine passenden Zeilen)\n");
        for (String line : log) b.append(line).append('\n');
        b.append("```\n");
        return b.toString();
    }
}
