package io.github.freadeax.bauplaner.mod.team;

import io.github.freadeax.bauplaner.mod.live.Json;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * What the mod knows about the team of a build (Teambau, COOP-03, docs/architecture/TEAMBAU.md §7): the
 * folded team view, sent either by the planner over the website link ({@code POST /v1/team}, source
 * {@link Source#PLANER}) or by the Paper plugin over the channel {@code bauplaner:team} ({@link Source#SERVER}).
 * Both send the same JSON ("Teamstand", format {@code team-link} version 1). The mod never folds events
 * itself; it only shows this state and overlays its own actions that still wait in the outbox.
 */
public record TeamState(Source source, String teamId, String name, String dimension, Integer revision, String revisionSummary, String me,
        List<Section> sections, List<Member> members, List<Note> notes, List<Store> stores, String at) {

    public enum Source {
        PLANER("Planer"), SERVER("Server"), ROOM("Team-Raum");
        public final String label;
        Source(String label) { this.label = label; }
    }

    public static final int MAX_SECTIONS = 1000, MAX_MEMBERS = 500, MAX_NOTES = 500, MAX_STORES = 200, MAX_BOXES = 64;
    public static final List<String> STATUSES = List.of("frei", "vergeben", "gemeldet", "bestaetigt", "nacharbeit");
    public static final Map<String, String> STATUS_LABEL = Map.of("frei", "frei", "vergeben", "in Arbeit", "gemeldet", "fertig gemeldet",
            "bestaetigt", "bestätigt", "nacharbeit", "Nacharbeit", "wartet", "wartet auf Abgleich");
    public static final Map<String, String> ROLE_LABEL = Map.of("leitung", "Bauleitung", "meister", "Baumeister", "helfer", "Helfer", "gast", "Gast");
    private static final Set<String> NOTE_TAGS = Set.of("frage", "problem", "material", "info");
    private static final int XZ = 30_000_000;

    /**
     * One build section. {@code nr} is 1-based in build order (as on the server and in the plan file).
     * {@code boxes}: world boxes [x0,y0,z0,x1,y1,z1] (inclusive) from the server file; empty from the planer.
     * {@code pending}: the owner/status is the mod's own action still waiting in the outbox.
     */
    public record Section(String id, int nr, String name, String owner, String status, List<int[]> boxes, List<Need> need, String offerTo, boolean pending) {
        public boolean free() { return owner == null || "frei".equals(status); }
        public boolean contains(int x, int y, int z) {
            for (int[] b : boxes) if (x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]) return true;
            return false;
        }
        Section with(String owner, String status) { return new Section(id, nr, name, owner, status, boxes, need, offerTo, true); }
    }

    /** Material of a section: needed, lying ready in checked chests (COOP-04 stores). */
    public record Need(String item, int count, int stored) {}

    public record Member(String id, String name, String player, String role, Integer color, boolean away) {
        public String label() { return player != null && !player.equalsIgnoreCase(name) ? name + " (" + player + ")" : name; }
    }

    public record Note(String id, String tag, String text, String by, String section, int[] pos) {}

    /** A marked chest at the build site, counted by the plugin (COOP-04). */
    public record Store(String id, String name, String dimension, int[] pos, int[] pos2, String section, String purpose, String status, String checkedAt,
            List<Item> items, boolean more) {}

    public record Item(String item, int count) {}

    public static TeamState parse(Map<String, Object> body, Source source) {
        String teamId = Json.str(body.get("teamId"), "Team-ID", 64);
        String name = Json.str(body.get("name"), "Teamname", 120);
        String dimension = body.get("dimension") == null ? "minecraft:overworld" : Json.str(body.get("dimension"), "Dimension", 200);
        Integer revision = body.get("revision") == null ? null : Json.integer(body.get("revision"), "Planstand", 0, 1_000_000);
        String summary = body.get("revisionSummary") == null ? null : Json.str(body.get("revisionSummary"), "Planstand-Text", 300);
        String me = body.get("me") == null ? null : Json.str(body.get("me"), "Ich bin", 64);
        List<Object> secs = Json.arr(body.get("sections"), "Abschnitte");
        if (secs.size() > MAX_SECTIONS) throw new Json.JsonException("Höchstens " + MAX_SECTIONS + " Abschnitte");
        List<Section> sections = new ArrayList<>();
        int n = 0;
        for (Object o : secs) {
            Map<String, Object> m = Json.obj(o, "Abschnitt");
            n++;
            String id = Json.str(m.get("id"), "Abschnitt-ID", 64);
            int nr = m.get("nr") == null ? n : Json.integer(m.get("nr"), "Abschnittsnummer", 1, MAX_SECTIONS);
            String sname = Json.str(m.get("name"), "Abschnittsname", 120);
            String owner = m.get("owner") == null ? null : Json.str(m.get("owner"), "Inhaber", 64);
            String status = m.get("status") == null ? (owner == null ? "frei" : "vergeben") : Json.str(m.get("status"), "Status", 20);
            if (!STATUSES.contains(status)) status = owner == null ? "frei" : "vergeben"; // newer planner states: show as taken/free
            List<int[]> boxes = new ArrayList<>();
            if (m.get("boxes") != null) {
                List<Object> bl = Json.arr(m.get("boxes"), "Boxen");
                if (bl.size() > MAX_BOXES) throw new Json.JsonException("Höchstens " + MAX_BOXES + " Boxen je Abschnitt");
                for (Object b : bl) boxes.add(box(Json.arr(b, "Box")));
            }
            List<Need> need = new ArrayList<>();
            if (m.get("need") != null) for (Object x : limit(Json.arr(m.get("need"), "Bedarf"), 256)) {
                Map<String, Object> l = Json.obj(x, "Bedarf");
                need.add(new Need(item(l.get("item")), Json.integer(l.get("count"), "Menge", 0, 1_000_000_000),
                        l.get("stored") == null ? 0 : Json.integer(l.get("stored"), "Bereit", 0, 1_000_000_000)));
            }
            String offerTo = null;
            if (m.get("offer") instanceof Map<?, ?> offer && offer.get("to") instanceof String to && to.length() <= 64) offerTo = to;
            sections.add(new Section(id, nr, sname, owner, status, List.copyOf(boxes), List.copyOf(need), offerTo, false));
        }
        List<Member> members = new ArrayList<>();
        if (body.get("members") != null) for (Object o : limit(Json.arr(body.get("members"), "Mitglieder"), MAX_MEMBERS)) {
            Map<String, Object> m = Json.obj(o, "Mitglied");
            String role = m.get("role") == null ? "helfer" : Json.str(m.get("role"), "Rolle", 20);
            if (!ROLE_LABEL.containsKey(role)) role = "gast";
            members.add(new Member(Json.str(m.get("id"), "Mitglied-ID", 64), Json.str(m.get("name"), "Mitgliedsname", 60),
                    m.get("player") == null ? null : Json.str(m.get("player"), "Spielername", 20), role,
                    m.get("color") == null ? null : TeamColors.parse(Json.str(m.get("color"), "Farbe", 9)),
                    Boolean.TRUE.equals(m.get("away"))));
        }
        List<Note> notes = new ArrayList<>();
        if (body.get("notes") != null) for (Object o : limit(Json.arr(body.get("notes"), "Notizen"), MAX_NOTES)) {
            Map<String, Object> m = Json.obj(o, "Notiz");
            String tag = m.get("tag") == null ? "info" : Json.str(m.get("tag"), "Notizart", 20);
            if (!NOTE_TAGS.contains(tag)) tag = "info";
            int[] pos = m.get("pos") == null ? null : point(Json.arr(m.get("pos"), "Position"));
            notes.add(new Note(Json.str(m.get("id"), "Notiz-ID", 64), tag, Json.str(m.get("text"), "Notiztext", 500),
                    m.get("by") == null ? "" : Json.str(m.get("by"), "Urheber", 64), m.get("section") == null ? null : Json.str(m.get("section"), "Abschnitt", 64), pos));
        }
        List<Store> stores = new ArrayList<>();
        if (body.get("stores") != null) for (Object o : limit(Json.arr(body.get("stores"), "Lagerkisten"), MAX_STORES)) stores.add(store(Json.obj(o, "Lagerkiste"), dimension));
        String at = body.get("at") instanceof String s && s.length() <= 40 ? s : null;
        return new TeamState(source, teamId, name, dimension, revision, summary, me, List.copyOf(sections), List.copyOf(members), List.copyOf(notes), List.copyOf(stores), at);
    }

    /** One chest from the plugin (also used for the {@code store} broadcast after a count). */
    public static Store store(Map<String, Object> m, String fallbackDimension) {
        List<Item> items = new ArrayList<>();
        if (m.get("items") != null) for (Object x : limit(Json.arr(m.get("items"), "Inhalt"), 64)) {
            Map<String, Object> l = Json.obj(x, "Inhalt");
            items.add(new Item(item(l.get("item")), Json.integer(l.get("count"), "Menge", 0, 1_000_000_000)));
        }
        return new Store(Json.str(m.get("id"), "Kisten-ID", 64), m.get("name") == null ? "Lager" : Json.str(m.get("name"), "Kistenname", 60),
                m.get("dimension") == null ? fallbackDimension : Json.str(m.get("dimension"), "Dimension", 200),
                point(Json.arr(m.get("pos"), "Kistenposition")), m.get("pos2") == null ? null : point(Json.arr(m.get("pos2"), "Kistenposition 2")),
                m.get("section") == null ? null : Json.str(m.get("section"), "Abschnitt", 64),
                m.get("purpose") == null ? "vorrat" : Json.str(m.get("purpose"), "Zweck", 20), m.get("status") == null ? "ungeprueft" : Json.str(m.get("status"), "Prüfstand", 20),
                m.get("checkedAt") instanceof String s && s.length() <= 40 ? s : null, List.copyOf(items), Boolean.TRUE.equals(m.get("more")));
    }

    /** Same state with one chest replaced or added (after a {@code store} broadcast). */
    public TeamState withStore(Store store) {
        List<Store> next = new ArrayList<>(stores);
        next.removeIf(s -> s.id().equals(store.id()));
        next.add(store);
        return new TeamState(source, teamId, name, dimension, revision, revisionSummary, me, sections, members, notes, List.copyOf(next), at);
    }

    private static List<Object> limit(List<Object> l, int max) {
        if (l.size() > max) throw new Json.JsonException("Höchstens " + max + " Einträge");
        return l;
    }

    private static String item(Object v) {
        String s = Json.str(v, "Item", 120);
        if (!s.matches("[a-z0-9_.-]+:[a-z0-9_./-]+")) throw new Json.JsonException("Item-ID ungültig: " + s);
        return s;
    }

    private static int[] point(List<Object> a) {
        if (a.size() != 3) throw new Json.JsonException("Position braucht x, y, z");
        return new int[] { Json.integer(a.get(0), "x", -XZ, XZ), Json.integer(a.get(1), "y", -2048, 4096), Json.integer(a.get(2), "z", -XZ, XZ) };
    }

    private static int[] box(List<Object> a) {
        if (a.size() != 6) throw new Json.JsonException("Box braucht x0, y0, z0, x1, y1, z1");
        int[] b = new int[6];
        for (int i = 0; i < 6; i++) b[i] = Json.integer(a.get(i), "Box", i % 3 == 1 ? -2048 : -XZ, i % 3 == 1 ? 4096 : XZ);
        return new int[] { Math.min(b[0], b[3]), Math.min(b[1], b[4]), Math.min(b[2], b[5]), Math.max(b[0], b[3]), Math.max(b[1], b[4]), Math.max(b[2], b[5]) };
    }

    // ------------------------------------------------------------------ queries

    public Optional<Member> member(String id) { return id == null ? Optional.empty() : members.stream().filter(m -> m.id.equals(id)).findFirst(); }

    /** Member of a Minecraft player name (case-insensitive), e.g. the own player when "me" is unknown. */
    public Optional<Member> memberOfPlayer(String player) {
        return player == null ? Optional.empty() : members.stream().filter(m -> m.player != null && m.player.equalsIgnoreCase(player)).findFirst();
    }

    public String nameOf(String memberId) { return member(memberId).map(Member::name).orElse(memberId == null ? "–" : memberId); }

    public String roleOf(String memberId) { return member(memberId).map(Member::role).orElse(memberId == null ? "gast" : "helfer"); }

    /** ARGB colour of a member: the planner's colour if given, otherwise a stable one from the id. */
    public int colorOf(String memberId) {
        Optional<Member> m = member(memberId);
        return m.isPresent() && m.get().color != null ? m.get().color : TeamColors.of(memberId);
    }

    public Optional<Section> section(String id) { return sections.stream().filter(s -> s.id.equals(id)).findFirst(); }

    /** Section by "3", id or (start of the) name. */
    public Optional<Section> findSection(String ref) {
        String r = ref.trim();
        if (r.matches("\\d{1,4}")) { int k = Integer.parseInt(r); return sections.stream().filter(s -> s.nr == k).findFirst(); }
        Optional<Section> byId = section(r);
        if (byId.isPresent()) return byId;
        String l = r.toLowerCase(java.util.Locale.ROOT);
        return sections.stream().filter(s -> s.name.toLowerCase(java.util.Locale.ROOT).startsWith(l)).findFirst();
    }

    public List<Section> mine() { return me == null ? List.of() : sections.stream().filter(s -> me.equals(s.owner) && !"bestaetigt".equals(s.status)).toList(); }

    /** First section whose server box contains the position (only server states carry boxes). */
    public Optional<Section> sectionAt(String dim, int x, int y, int z) {
        if (!dimension.equals(dim)) return Optional.empty();
        return sections.stream().filter(s -> s.contains(x, y, z)).findFirst();
    }

    public int count(String status) { return (int) sections.stream().filter(s -> s.status.equals(status)).count(); }

    /**
     * The state as the player sees it while own actions still wait in the outbox (offline, or not yet
     * answered): a claim shows the section as the own one ("wartet"), a release as free, a report as reported.
     * The real answer replaces this as soon as it arrives.
     */
    public TeamState overlay(List<TeamOutbox.Action> pending) {
        if (pending.isEmpty() || me == null) return this;
        Map<String, Section> byId = new LinkedHashMap<>();
        for (Section s : sections) byId.put(s.id, s);
        for (TeamOutbox.Action a : pending) {
            String sec = a.str("section");
            Section s = sec == null ? null : byId.get(sec);
            if (s == null) continue;
            switch (a.kind()) {
                case "section.claim" -> { if (s.free()) byId.put(sec, s.with(me, "vergeben")); }
                case "section.release" -> { if (me.equals(s.owner)) byId.put(sec, s.with(null, "frei")); }
                case "section.done" -> byId.put(sec, s.with(s.owner == null ? me : s.owner, "gemeldet"));
                default -> { }
            }
        }
        return new TeamState(source, teamId, name, dimension, revision, revisionSummary, me, List.copyOf(byId.values()), members, notes, stores, at);
    }

    /** "Team Burgbau · Planstand 4 · 3 frei, 2 in Arbeit, 1 gemeldet · vom Server". */
    public String summary() {
        StringBuilder b = new StringBuilder("Team „").append(name).append("“");
        if (revision != null) b.append(" · Planstand ").append(revision);
        b.append(" · ").append(count("frei")).append(" frei, ").append(count("vergeben")).append(" in Arbeit, ").append(count("gemeldet")).append(" gemeldet, ")
                .append(count("bestaetigt")).append(" bestätigt");
        if (count("nacharbeit") > 0) b.append(", ").append(count("nacharbeit")).append(" Nacharbeit");
        return b.append(" · vom ").append(source.label).toString();
    }
}
