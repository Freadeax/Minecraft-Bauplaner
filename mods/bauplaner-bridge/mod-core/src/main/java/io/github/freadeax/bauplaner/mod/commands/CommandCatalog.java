package io.github.freadeax.bauplaner.mod.commands;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Every command of the Bauplaner mod and of the Bauplaner Paper plugin as a button for the command page of
 * the J menu (GAME-10). Client commands run under {@code /bauplaner}, server commands always under the
 * plugin alias {@code /bp}: the client mod has its own {@code /bauplaner zeigen|plan|anker|scan|status|…}
 * and would catch them otherwise. A click sends exactly the command the player could type, nothing more.
 * Version neutral, no Minecraft classes: the screen in hologram-26.3 only draws it.
 */
public final class CommandCatalog {
    private CommandCatalog() {}

    public enum Side {
        CLIENT("bauplaner "), SERVER("bp ");
        public final String prefix;
        Side(String prefix) { this.prefix = prefix; }
    }

    /** What a button needs to make sense; the screen greys it out with this reason otherwise. */
    public enum Need {
        NONE(""), PLAN("Erst einen Plan platzieren (Plan-Menü)."), TEAM("Erst im Planer „Mit Spiel abgleichen“ oder auf einem Server mit Teambau spielen."),
        PLUGIN("Der Server hat kein Bauplaner-Plugin (oder du darfst /bp nicht)."), LEAD("Nur für die Bauleitung des Teams."),
        CHEST("Vorher auf die Kiste schauen.");
        public final String reason;
        Need(String reason) { this.reason = reason; }
    }

    public enum Kind { SECTION, NUMBER, WORD, TEXT, PLAYER, CHOICE, ITEM }

    /** One argument. {@code optional} ones may stay empty, but only at the end (and only if all later ones are empty too). */
    public record Arg(String name, Kind kind, List<String> choices, boolean optional) {
        public Arg { choices = List.copyOf(choices); }
        static Arg of(String name, Kind kind) { return new Arg(name, kind, List.of(), false); }
        static Arg opt(String name, Kind kind) { return new Arg(name, kind, List.of(), true); }
        static Arg choice(String name, String... choices) { return new Arg(name, Kind.CHOICE, List.of(choices), false); }
        static Arg optChoice(String name, String... choices) { return new Arg(name, Kind.CHOICE, List.of(choices), true); }
        /** Placeholder text in the input field. */
        public String hint() {
            return switch (kind) {
                case SECTION -> name + " (Nr.)";
                case CHOICE -> String.join("|", choices);
                case ITEM -> name + " (z. B. oak_planks)";
                default -> name;
            } + (optional ? " – leer lassen möglich" : "");
        }
    }

    public record Entry(String id, String group, String label, Side side, String path, List<Arg> args, String help, Need need) {
        public Entry { args = List.copyOf(args); }
        /** Full command without slash and without arguments, e.g. "bp lager markieren". */
        public String base() { return side.prefix + path; }
        public boolean hasArgs() { return !args.isEmpty(); }
        public boolean requiredArgs() { return args.stream().anyMatch(a -> !a.optional()); }
    }

    public static final String STATUS = "Status", HOLOGRAM = "Hologramm", TEAM = "Team", SERVER_TEAM = "Server-Team", STORAGE = "Lager", PROOF = "Nachweis",
            LINK = "Verbindung", RECORD = "Aufnahme";

    private static final List<Entry> ALL = build();

    public static List<Entry> all() { return ALL; }

    public static List<String> groups() {
        List<String> out = new ArrayList<>();
        out.add(STATUS);
        for (Entry e : ALL) if (!out.contains(e.group())) out.add(e.group());
        return out;
    }

    public static List<Entry> group(String group) { return ALL.stream().filter(e -> e.group().equals(group)).toList(); }

    public static Entry byId(String id) {
        for (Entry e : ALL) if (e.id().equals(id)) return e;
        throw new IllegalArgumentException("Unbekannter Befehl: " + id);
    }

    private static final Pattern SECTION = Pattern.compile("[0-9]{1,3}|[A-Za-z0-9_.-]{1,64}"), NUMBER = Pattern.compile("-?[0-9]{1,9}"),
            WORD = Pattern.compile("\\S{1,64}"), PLAYER = Pattern.compile("[.*]?[A-Za-z0-9_]{2,16}"), ITEM = Pattern.compile("([a-z0-9_.-]+:)?[a-z0-9_./-]{1,80}");

    /**
     * The command line for these inputs (without slash), or an exception with a German reason. Values are
     * trimmed; text arguments keep inner spaces and must be the last argument (Brigadier greedy string).
     */
    public static String command(Entry e, List<String> values) {
        StringBuilder out = new StringBuilder(e.base());
        boolean ended = false;
        for (int i = 0; i < e.args().size(); i++) {
            Arg a = e.args().get(i);
            String v = i < values.size() && values.get(i) != null ? values.get(i).trim() : "";
            if (v.isEmpty()) {
                if (!a.optional()) throw new IllegalArgumentException("„" + a.name() + "“ fehlt.");
                ended = true;
                continue;
            }
            if (ended) throw new IllegalArgumentException("„" + a.name() + "“ geht nur zusammen mit dem Feld davor.");
            String checked = switch (a.kind()) {
                case SECTION -> require(v, SECTION, a, "eine Abschnittsnummer");
                case NUMBER -> require(v, NUMBER, a, "eine ganze Zahl");
                case WORD -> require(v, WORD, a, "ein Wort ohne Leerzeichen");
                case PLAYER -> require(v, PLAYER, a, "ein Minecraft-Name");
                case ITEM -> require(v.toLowerCase(Locale.ROOT), ITEM, a, "eine Item-ID wie oak_planks");
                case CHOICE -> {
                    String l = v.toLowerCase(Locale.ROOT);
                    if (!a.choices().contains(l)) throw new IllegalArgumentException("„" + a.name() + "“: " + String.join(", ", a.choices()) + ".");
                    yield l;
                }
                case TEXT -> {
                    if (i != e.args().size() - 1) throw new IllegalStateException("Text nur als letztes Argument: " + e.id());
                    if (v.length() > 250 || v.contains("\n")) throw new IllegalArgumentException("„" + a.name() + "“: höchstens 250 Zeichen, eine Zeile.");
                    yield v;
                }
            };
            out.append(' ').append(checked);
        }
        return out.toString();
    }

    private static String require(String v, Pattern p, Arg a, String what) {
        if (!p.matcher(v).matches()) throw new IllegalArgumentException("„" + a.name() + "“ muss " + what + " sein.");
        return v;
    }

    // ------------------------------------------------------------------ the list

    private static List<Entry> build() {
        Map<String, Entry> m = new LinkedHashMap<>();
        // Hologram (client)
        c(m, HOLOGRAM, "fortschritt", "Fortschritt", "fortschritt", "Prozent, richtig, fehlt, falsch im Chat.", Need.PLAN);
        c(m, HOLOGRAM, "fehler", "Nächster Fehler", "fehler", "Markiert den nächsten falschen oder fehlenden Block.", Need.PLAN);
        c(m, HOLOGRAM, "umschalten", "Ein-/ausblenden", "umschalten", "Hologramm sichtbar oder verborgen.", Need.PLAN);
        c(m, HOLOGRAM, "roentgen", "Röntgensicht", "roentgen", "Offene Blöcke auch durch Wände.", Need.PLAN);
        c(m, HOLOGRAM, "texturen", "Texturen an/aus", "texturen", "Echte Blockmodelle oder einfache Kisten.", Need.PLAN);
        c(m, HOLOGRAM, "material", "Materialliste (Chat)", "material", "Was noch fehlt, mit Inventar.", Need.PLAN);
        c(m, HOLOGRAM, "hierher", "Hierher", "hierher", "Plan an den angeschauten Block.", Need.PLAN);
        c(m, HOLOGRAM, "drehen", "Drehen", "drehen", "Um Viertel drehen (leer = 1 nach rechts).", Need.PLAN, Arg.optChoice("viertel", "1", "2", "3", "-1"));
        c(m, HOLOGRAM, "spiegeln", "Spiegeln", "spiegeln", "An der x-Achse spiegeln.", Need.PLAN);
        c(m, HOLOGRAM, "verschieben", "Verschieben", "verschieben", "Um x y z Blöcke.", Need.PLAN, Arg.of("x", Kind.NUMBER), Arg.of("y", Kind.NUMBER), Arg.of("z", Kind.NUMBER));
        c(m, HOLOGRAM, "ebene", "Nur Ebene y", "ebene", "Nur diese Höhe zeigen.", Need.PLAN, Arg.of("y", Kind.NUMBER));
        c(m, HOLOGRAM, "ebene.bis", "Bis Ebene y", "ebene bis", "Alles bis zu dieser Höhe.", Need.PLAN, Arg.of("y", Kind.NUMBER));
        c(m, HOLOGRAM, "ebene.alle", "Alle Ebenen", "ebene alle", "Ebenenfilter aus.", Need.PLAN);
        c(m, HOLOGRAM, "abschnitt", "Abschnitt wählen", "abschnitt", "Nur diesen Bauabschnitt (Nr.).", Need.PLAN, Arg.of("nummer", Kind.SECTION));
        c(m, HOLOGRAM, "abschnitt.weiter", "Nächster Abschnitt", "abschnitt weiter", "Zum nächsten Bauabschnitt.", Need.PLAN);
        c(m, HOLOGRAM, "abschnitt.alle", "Alle Abschnitte", "abschnitt alle", "Abschnittsfilter aus.", Need.PLAN);
        c(m, HOLOGRAM, "platzierhilfe", "Platzierhilfe", "platzierhilfe", "an: falsche Blöcke werden nicht gesetzt, warnen: nur Hinweis.", Need.NONE, Arg.choice("stufe", "an", "warnen", "aus"));
        c(m, HOLOGRAM, "leistung", "Leistung", "leistung", "Wie viele Geisterblöcke gezeichnet werden.", Need.NONE, Arg.optChoice("stufe", "niedrig", "normal", "hoch"));
        c(m, HOLOGRAM, "entfernen", "Plan entfernen", "entfernen", "Hologramm entfernen (Datei bleibt).", Need.PLAN);
        c(m, HOLOGRAM, "diagnose", "Diagnose", "diagnose", "Versionen, Plan, Speicher – für Fehlerberichte.", Need.NONE);
        // Team in the mod (client, works with the planner and with the server plugin)
        c(m, TEAM, "team", "Übersicht", "team", "Team, Weg zum Server, dein Auftrag.", Need.TEAM);
        c(m, TEAM, "team.abschnitte", "Abschnitte", "team abschnitte", "Alle Abschnitte mit Inhaber und Stand.", Need.TEAM);
        c(m, TEAM, "team.nehmen", "Abschnitt nehmen", "team nehmen", "Freien Abschnitt übernehmen.", Need.TEAM, Arg.of("abschnitt", Kind.SECTION));
        c(m, TEAM, "team.abgeben", "Abgeben", "team abgeben", "Eigenen Abschnitt freigeben (leer = der, in dem du stehst).", Need.TEAM, Arg.opt("abschnitt", Kind.SECTION));
        c(m, TEAM, "team.fertig", "Fertig melden", "team fertig", "Abschnitt fertig melden, optional mit Notiz.", Need.TEAM, Arg.opt("abschnitt", Kind.SECTION), Arg.opt("notiz", Kind.TEXT));
        c(m, TEAM, "team.mein", "Nur meine zeigen", "team mein", "Hologramm nur mit deinen Abschnitten.", Need.TEAM);
        c(m, TEAM, "team.frei", "Nur freie zeigen", "team frei", "Hologramm nur mit freien Abschnitten.", Need.TEAM);
        c(m, TEAM, "team.alle", "Alle zeigen", "team alle", "Abschnittsauswahl aufheben.", Need.TEAM);
        c(m, TEAM, "team.zeigen", "Abschnitt zeigen", "team zeigen", "Rahmen und Richtung zu einem Abschnitt.", Need.TEAM, Arg.of("abschnitt", Kind.SECTION));
        c(m, TEAM, "team.material", "Mein Material", "team material", "Was im Auftrag fehlt: dabei, holen, im Lager (leer = du).", Need.TEAM, Arg.opt("spieler", Kind.PLAYER));
        c(m, TEAM, "team.notiz", "Notiz schreiben", "team notiz", "Notiz an deiner Stelle.", Need.TEAM, Arg.choice("art", "frage", "problem", "material", "info"), Arg.of("text", Kind.TEXT));
        c(m, TEAM, "team.notizen", "Notizen", "team notizen", "Offene Notizen, nächste zuerst.", Need.TEAM);
        c(m, TEAM, "team.erledigt", "Notiz erledigt", "team erledigt", "Notiz als erledigt markieren (ID aus „Notizen“).", Need.TEAM, Arg.of("notiz", Kind.WORD));
        c(m, TEAM, "team.geliefert.hand", "Hand geliefert", "team geliefert hand", "Den Stapel in der Hand als Lieferung melden.", Need.TEAM);
        c(m, TEAM, "team.geliefert", "Lieferung melden", "team geliefert", "Item und Menge als Lieferung.", Need.TEAM, Arg.of("item", Kind.ITEM), Arg.of("menge", Kind.NUMBER));
        c(m, TEAM, "team.sammle", "Sammelauftrag", "team sammle", "Ich sammle dieses Item.", Need.TEAM, Arg.of("item", Kind.ITEM), Arg.of("menge", Kind.NUMBER));
        c(m, TEAM, "team.pruefen", "Prüfen", "team pruefen", "Abschnitt bestätigen oder Nacharbeit (Baumeister).", Need.TEAM, Arg.of("abschnitt", Kind.SECTION), Arg.choice("ergebnis", "ok", "nacharbeit"));
        c(m, TEAM, "team.zuweisen", "Zuweisen", "team zuweisen", "Abschnitt einem Spieler geben (Baumeister).", Need.TEAM, Arg.of("abschnitt", Kind.SECTION), Arg.of("spieler", Kind.PLAYER));
        c(m, TEAM, "team.lager", "Lagerkisten", "team lager", "Lagerkisten vom Server mit Prüfstand.", Need.TEAM);
        c(m, TEAM, "team.korb", "Ausgangskorb", "team korb", "Meldungen, die noch auf Planer oder Server warten.", Need.NONE);
        c(m, TEAM, "team.rahmen", "Rahmen an/aus", "team rahmen", "Abschnittsrahmen im Spiel.", Need.NONE);
        c(m, TEAM, "team.anzeige", "Anzeige an/aus", "team anzeige", "Teamfeld rechts unten.", Need.NONE);
        c(m, TEAM, "team.status", "Kanalstatus", "team status", "Weg zum Server-Plugin und Erlaubnis.", Need.NONE);
        c(m, TEAM, "team.erlauben", "Kanal erlauben", "team erlauben", "Teamkanal für diesen Server einschalten (einmal je Server).", Need.NONE);
        c(m, TEAM, "team.verbieten", "Kanal verbieten", "team verbieten", "Teamkanal für diesen Server aus: die Mod sendet nichts.", Need.NONE);
        // Team on the server (plugin, /bp)
        s(m, SERVER_TEAM, "bp.team", "Übersicht (Server)", "team", "Was der Server über dich und das Team weiß.", Need.PLUGIN);
        s(m, SERVER_TEAM, "bp.abschnitte", "Abschnitte (Server)", "abschnitte", "Abschnitte laut Server.", Need.PLUGIN);
        s(m, SERVER_TEAM, "bp.nehmen", "Nehmen (Server)", "nehmen", "Abschnitt direkt auf dem Server übernehmen.", Need.PLUGIN, Arg.of("abschnitt", Kind.SECTION));
        s(m, SERVER_TEAM, "bp.abgeben", "Abgeben (Server)", "abgeben", "Abschnitt freigeben.", Need.PLUGIN, Arg.of("abschnitt", Kind.SECTION));
        s(m, SERVER_TEAM, "bp.fertig", "Fertig (Server)", "fertig", "Fertig melden (leer = wo du stehst).", Need.PLUGIN, Arg.opt("abschnitt", Kind.SECTION), Arg.opt("notiz", Kind.TEXT));
        s(m, SERVER_TEAM, "bp.zeigen", "Umriss zeigen", "zeigen", "Partikelumriss des Abschnitts.", Need.PLUGIN, Arg.of("abschnitt", Kind.SECTION));
        s(m, SERVER_TEAM, "bp.notiz", "Notiz (Server)", "notiz", "Notiz an deiner Stelle.", Need.PLUGIN, Arg.choice("art", "frage", "problem", "material", "info"), Arg.of("text", Kind.TEXT));
        s(m, SERVER_TEAM, "bp.notizen", "Notizen (Server)", "notizen", "Offene Notizen.", Need.PLUGIN);
        s(m, SERVER_TEAM, "bp.geliefert", "Hand geliefert (Server)", "geliefert hand", "Stapel in der Hand als Lieferung.", Need.PLUGIN);
        s(m, SERVER_TEAM, "bp.sammle", "Sammelauftrag (Server)", "sammle", "Ich sammle … (ohne Menge: was laut Bedarf noch fehlt).", Need.PLUGIN, Arg.opt("item", Kind.ITEM), Arg.opt("menge", Kind.NUMBER));
        s(m, SERVER_TEAM, "bp.pruefen", "Prüfen (Server)", "pruefen", "Bestätigen oder Nacharbeit (Baumeister).", Need.PLUGIN, Arg.of("abschnitt", Kind.SECTION), Arg.choice("ergebnis", "ok", "nacharbeit"), Arg.opt("notiz", Kind.TEXT));
        s(m, SERVER_TEAM, "bp.zuweisen", "Zuweisen (Server)", "zuweisen", "Abschnitt einem Spieler geben.", Need.PLUGIN, Arg.of("abschnitt", Kind.SECTION), Arg.of("spieler", Kind.PLAYER));
        s(m, SERVER_TEAM, "bp.rolle", "Rolle vergeben", "rolle", "Rolle eines Spielers ändern.", Need.LEAD, Arg.of("spieler", Kind.PLAYER), Arg.choice("rolle", "bauleitung", "baumeister", "helfer", "gast"));
        s(m, SERVER_TEAM, "bp.team.wahl", "Team wählen", "team wahl", "Bei mehreren Teams: welches für dich gilt.", Need.PLUGIN, Arg.of("team", Kind.TEXT));
        s(m, SERVER_TEAM, "bp.team.export", "Ausfuhr schreiben", "team export", "Teamprotokoll für den Planer schreiben.", Need.LEAD);
        s(m, SERVER_TEAM, "bp.team.laden", "Teamdateien neu laden", "team laden", "Nach dem Hochladen einer Serverdatei.", Need.LEAD);
        s(m, SERVER_TEAM, "bp.team.hilfe", "Hilfe (Server)", "team hilfe", "Alle Teambefehle des Servers.", Need.PLUGIN);
        // Storage chests (plugin)
        s(m, STORAGE, "bp.lager.liste", "Lagerkisten", "lager liste", "Alle Lagerkisten mit Prüfstand.", Need.PLUGIN);
        s(m, STORAGE, "bp.lager.info", "Diese Kiste", "lager info", "Angeschaute Kiste: Inhalt, Zweck, Schutz.", Need.CHEST);
        s(m, STORAGE, "bp.lager.bedarf", "Bedarf", "lager bedarf", "Was fehlt und was im Lager liegt (leer = ganzes Projekt).", Need.PLUGIN, Arg.opt("abschnitt", Kind.WORD));
        s(m, STORAGE, "bp.lager.wer", "Wer hat …", "lager wer", "Wer hat dieses Item in die angeschaute Kiste gelegt oder entnommen.", Need.CHEST, Arg.of("item", Kind.ITEM));
        s(m, STORAGE, "bp.lager.zeigen", "Kisten zeigen", "lager zeigen", "Partikel an allen Lagerkisten.", Need.PLUGIN);
        s(m, STORAGE, "bp.lager.verlauf", "Verlauf", "lager verlauf", "Letzte Ein- und Ausgänge der angeschauten Kiste.", Need.CHEST, Arg.opt("anzahl", Kind.NUMBER));
        s(m, STORAGE, "bp.lager.pruefen", "Prüfen", "lager pruefen", "Angeschaute Kiste neu zählen, ohne Blick auf eine Kiste alle.", Need.PLUGIN);
        s(m, STORAGE, "bp.lager.pruefen.alle", "Alle prüfen", "lager pruefen alle", "Alle Lagerkisten neu zählen.", Need.PLUGIN);
        s(m, STORAGE, "bp.lager.markieren", "Kiste markieren", "lager markieren", "Angeschaute Kiste als Lagerkiste des Teams (Baumeister).", Need.CHEST, Arg.opt("name", Kind.TEXT));
        s(m, STORAGE, "bp.lager.entmarkieren", "Markierung entfernen", "lager entmarkieren", "Angeschaute Kiste ist keine Lagerkiste mehr.", Need.CHEST);
        s(m, STORAGE, "bp.lager.siegeln", "Siegeln", "lager siegeln", "Jetzigen Inhalt als geprüft bestätigen (Baumeister).", Need.CHEST, Arg.opt("notiz", Kind.TEXT));
        s(m, STORAGE, "bp.lager.name", "Umbenennen", "lager name", "Neuer Name der angeschauten Kiste.", Need.CHEST, Arg.of("name", Kind.TEXT));
        s(m, STORAGE, "bp.lager.abschnitt", "Abschnitt zuordnen", "lager abschnitt", "Kiste gehört zu diesem Abschnitt.", Need.CHEST, Arg.of("abschnitt", Kind.SECTION));
        s(m, STORAGE, "bp.lager.zweck", "Zweck", "lager zweck", "Vorrat, Eingang, Ausgabe oder Rest.", Need.CHEST, Arg.choice("zweck", "vorrat", "eingang", "ausgabe", "rest"));
        s(m, STORAGE, "bp.lager.schutz", "Schutz", "lager schutz", "Wer etwas herausnehmen darf.", Need.CHEST, Arg.choice("stufe", "offen", "team", "abschnitt", "eingang", "gesperrt"));
        s(m, STORAGE, "bp.lager.hilfe", "Hilfe Lager", "lager hilfe", "Alle Lagerbefehle des Servers.", Need.PLUGIN);
        // Build record per player (plugin)
        s(m, PROOF, "bp.beitrag", "Mein Beitrag", "beitrag", "Gesetzte und abgebaute Blöcke, ins Lager, entnommen.", Need.PLUGIN);
        s(m, PROOF, "bp.beitrag.alle", "Beitrag aller", "beitrag alle", "Für alle im Team (Baumeister).", Need.PLUGIN);
        s(m, PROOF, "bp.nachweis", "Nachweis an/aus", "nachweis", "Eigene Zählung ein- oder ausschalten.", Need.PLUGIN, Arg.choice("stufe", "an", "aus"));
        // Website link and world plan (client)
        c(m, LINK, "verbinden", "Website koppeln", "verbinden", "Zeigt den Code für die Website (5 Minuten).", Need.NONE);
        c(m, LINK, "verbinden.status", "Verbindungsstatus", "verbinden status", "Gekoppelte Browser und Port.", Need.NONE);
        c(m, LINK, "verbinden.aus", "Alle Browser trennen", "verbinden aus", "Kopplungen aufheben.", Need.NONE);
        c(m, LINK, "ebenen", "Weltplan-Ebenen", "ebenen", "Ebenen von der Live-Karte.", Need.NONE);
        c(m, LINK, "ebenen.alle", "Alle Ebenen zeigen", "ebenen alle", "Alle Weltplan-Ebenen sichtbar.", Need.NONE);
        // Recording for the website (client, all loaders) and on the server
        c(m, RECORD, "plaene", "Pläne", "plaene", "Pläne im Ordner bauplaner/plans.", Need.NONE);
        c(m, RECORD, "plan", "Plan laden", "plan", "Plan für die Aufnahme laden.", Need.NONE, Arg.of("datei", Kind.TEXT));
        c(m, RECORD, "anker", "Anker hier", "anker hier", "Projektursprung auf den angeschauten Block.", Need.NONE);
        c(m, RECORD, "scan", "Aufnahme starten", "scan", "Planbox lesen und für die Website speichern.", Need.NONE);
        c(m, RECORD, "status", "Aufnahmestatus", "status", "Plan, Anker, laufende Aufnahme.", Need.NONE);
        c(m, RECORD, "abbrechen", "Aufnahme abbrechen", "abbrechen", "Laufende Aufnahme stoppen.", Need.NONE);
        s(m, RECORD, "bp.status", "Server: Status", "status", "Plan, Anker und Aufnahme auf dem Server.", Need.PLUGIN);
        s(m, RECORD, "bp.plaene", "Server: Pläne", "plaene", "Pläne in plugins/BauplanerBridge/plans.", Need.PLUGIN);
        s(m, RECORD, "bp.plan", "Server: Plan laden", "plan", "Plan auf dem Server laden.", Need.PLUGIN, Arg.of("datei", Kind.TEXT));
        s(m, RECORD, "bp.anker", "Server: Anker hier", "anker hier", "Anker auf den angeschauten Block.", Need.PLUGIN);
        s(m, RECORD, "bp.scan", "Server: Aufnahme", "scan", "Aufnahme aus der Serverwelt („geladen“: nur geladene Chunks).", Need.PLUGIN, Arg.optChoice("umfang", "geladen"));
        s(m, RECORD, "bp.abbrechen", "Server: Abbrechen", "abbrechen", "Laufende Serveraufnahme stoppen.", Need.PLUGIN);
        return List.copyOf(m.values());
    }

    private static void c(Map<String, Entry> m, String g, String id, String label, String path, String help, Need need, Arg... args) { add(m, new Entry(id, g, label, Side.CLIENT, path, List.of(args), help, need)); }
    private static void s(Map<String, Entry> m, String g, String id, String label, String path, String help, Need need, Arg... args) { add(m, new Entry(id, g, label, Side.SERVER, path, List.of(args), help, need)); }
    private static void add(Map<String, Entry> m, Entry e) {
        if (m.put(e.id(), e) != null) throw new IllegalStateException("Doppelte ID " + e.id());
        for (int i = 0; i < e.args().size(); i++) if (e.args().get(i).kind() == Kind.TEXT && i != e.args().size() - 1) throw new IllegalStateException("Text nicht am Ende: " + e.id());
    }
}
