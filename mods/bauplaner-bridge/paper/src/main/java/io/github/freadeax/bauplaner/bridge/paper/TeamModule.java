package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.Particle;
import org.bukkit.command.CommandSender;
import org.bukkit.command.ConsoleCommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

/**
 * Teambau on the server (COOP-02, docs/architecture/TEAMBAU.md). Players without planner or mod see
 * their sections, take them over, report them done, write notes and report deliveries with chat
 * commands; every action is an event of the team log with the player's real identity (origin
 * {@code server}). Rights come from the team log (roles) and Paper permissions. Never changes the world:
 * hints are chat lines, the action bar and particles shown to one player; the optional protection only
 * cancels block changes in sections of others.
 * <p>
 * Files in {@code plugins/BauplanerBridge/team/}: {@code *.team.json} (exported by the planner, tab
 * „Team“ → „Serverdatei“), {@code <teamId>.events.jsonl} (events written here, one per line), exports
 * {@code <name>-server-<date>.team.json} (read by the planner like the server file).
 */
final class TeamModule implements Listener {
    static final List<String> COMMANDS = List.of("team", "abschnitte", "nehmen", "abgeben", "fertig", "zeigen", "notiz", "notizen", "geliefert", "sammle",
            "zuweisen", "pruefen", "rolle");
    private static final String PREFIX = ChatColor.GOLD + "[Bauplaner] " + ChatColor.RESET;

    private final JavaPlugin plugin;
    private final Path dir;
    private final Map<String, TeamLog> teams = new TreeMap<>();
    private final Map<String, Path> headerFiles = new HashMap<>();
    private final Map<String, String> chosen = new HashMap<>();
    private final Map<UUID, String> lastBar = new HashMap<>();
    private final Map<UUID, Long> lastHint = new HashMap<>();
    private TeamLog.View cachedView;
    private TeamLog cachedFor;
    private int cachedSize = -1;
    private BukkitTask barTask;

    TeamModule(JavaPlugin plugin, Path root) {
        this.plugin = plugin;
        this.dir = root.resolve("team");
    }

    void enable() {
        try { Files.createDirectories(dir); } catch (IOException e) { plugin.getLogger().warning("Teamordner nicht anlegbar: " + e.getMessage()); }
        load(null);
        Bukkit.getPluginManager().registerEvents(this, plugin);
        if (plugin.getConfig().getBoolean("team.anzeige", true)) barTask = Bukkit.getScheduler().runTaskTimer(plugin, this::actionBars, 40L, 20L);
    }

    void disable() { if (barTask != null) barTask.cancel(); }

    private static void say(CommandSender s, String text) { s.sendMessage(PREFIX + text); }
    private static boolean fail(CommandSender s, String text) { s.sendMessage(PREFIX + ChatColor.RED + text); return true; }

    // ------------------------------------------------------------------ files

    /** (Re)reads every team file; returns a summary for the sender. */
    private String load(CommandSender s) {
        teams.clear(); headerFiles.clear(); cachedFor = null;
        List<String> problems = new ArrayList<>();
        try (Stream<Path> files = Files.list(dir)) {
            for (Path f : files.filter(p -> p.getFileName().toString().endsWith(".team.json")).sorted().collect(Collectors.toList())) {
                try {
                    TeamLog team = TeamLog.parse(Files.readString(f, StandardCharsets.UTF_8));
                    TeamLog known = teams.get(team.teamId);
                    if (known != null) {
                        // An export of the same team: its events join (the newest header wins by file time).
                        for (JsonObject e : team.events()) known.add(e);
                        if (Files.getLastModifiedTime(f).compareTo(Files.getLastModifiedTime(headerFiles.get(team.teamId))) > 0) {
                            for (JsonObject e : known.events()) team.add(e);
                            teams.put(team.teamId, team); headerFiles.put(team.teamId, f);
                        }
                        continue;
                    }
                    teams.put(team.teamId, team); headerFiles.put(team.teamId, f);
                } catch (IOException | RuntimeException e) {
                    problems.add(f.getFileName() + ": " + e.getMessage());
                }
            }
        } catch (IOException e) {
            problems.add(e.getMessage());
        }
        for (TeamLog team : teams.values()) {
            Path log = dir.resolve(team.teamId + ".events.jsonl");
            if (!Files.exists(log)) continue;
            try {
                int line = 0;
                for (String l : Files.readAllLines(log, StandardCharsets.UTF_8)) {
                    line++;
                    if (l.isBlank()) continue;
                    try { team.add(JsonParser.parseString(l).getAsJsonObject()); }
                    catch (RuntimeException e) { problems.add(log.getFileName() + " Zeile " + line + ": " + e.getMessage()); }
                }
            } catch (IOException e) { problems.add(log.getFileName() + ": " + e.getMessage()); }
        }
        String summary = teams.isEmpty() ? "Keine Teamdatei in plugins/BauplanerBridge/team/ (im Planer: Reiter „Team“ → „Serverdatei“)."
                : teams.size() + " Team(s): " + teams.values().stream().map(t -> t.name + " (" + t.sections.size() + " Abschnitte, " + t.size() + " Ereignisse)").collect(Collectors.joining(", ")) + ".";
        for (String p : problems) plugin.getLogger().warning("Teamdatei: " + p);
        if (s != null) {
            say(s, summary);
            for (String p : problems) fail(s, p);
        } else plugin.getLogger().info(summary);
        return summary;
    }

    private void write(TeamLog team, JsonObject event) throws IOException {
        Path log = dir.resolve(team.teamId + ".events.jsonl");
        Files.writeString(log, TeamLog.GSON.toJson(event) + "\n", StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
    }

    private TeamLog.View view(TeamLog team) {
        if (cachedFor != team || cachedSize != team.size()) { cachedView = team.view(); cachedFor = team; cachedSize = team.size(); }
        return cachedView;
    }

    // ------------------------------------------------------------------ identity

    private record Actor(CommandSender sender, String playerName, UUID uuid, boolean console) {}

    private static String memberIdOf(UUID uuid) { return "mc_" + uuid.toString().replace("-", "").substring(0, 20); }

    /** Member id of an actor in a team; empty when the player is not (yet) a member. */
    private Optional<String> memberOf(TeamLog team, Actor a) {
        TeamLog.View v = view(team);
        Optional<String> byName = v.memberOfPlayer(a.playerName);
        if (byName.isPresent()) return byName;
        String id = a.uuid == null ? null : memberIdOf(a.uuid);
        return id != null && v.known.contains(id) ? Optional.of(id) : Optional.empty();
    }

    /** Member id; joins the player (member.join with the real name) when the server allows it. */
    private Optional<String> ensureMember(TeamLog team, Actor a) {
        Optional<String> m = memberOf(team, a);
        if (m.isPresent()) return m;
        if (a.uuid == null) return Optional.empty();
        if (!plugin.getConfig().getBoolean("team.neue-spieler-beitreten", true)) return Optional.empty();
        String id = memberIdOf(a.uuid);
        JsonObject e = team.event(id, "member.join");
        e.addProperty("member", id); e.addProperty("name", a.playerName); e.addProperty("player", a.playerName);
        if (!append(team, e, a.sender)) return Optional.empty();
        say(a.sender, "Du bist dem Team „" + team.name + "“ als Helfer beigetreten.");
        return Optional.of(id);
    }

    private boolean append(TeamLog team, JsonObject e, CommandSender s) {
        try {
            write(team, e);
            team.add(e);
            return true;
        } catch (IOException ex) {
            fail(s, "Nicht gespeichert: " + ex.getMessage());
            return false;
        }
    }

    /** Writes an event unless the fold rejects it (or a claim collides); a conflict that still takes effect is shown as a hint. */
    private boolean submit(TeamLog team, JsonObject e, CommandSender s, String okText) {
        TeamLog probe = TeamLog.parse(team.exportJson());
        probe.add(e);
        TeamLog.View pv = probe.view();
        String id = TeamLog.str(e, "id"), problem = pv.problems.get(id);
        if (pv.rejectedIds.contains(id) || problem != null && TeamLog.str(e, "kind").equals("section.claim")) return fail(s, problem);
        if (!append(team, e, s)) return true;
        say(s, okText + (problem != null ? ChatColor.YELLOW + " Hinweis: " + problem : ""));
        return true;
    }

    // ------------------------------------------------------------------ commands

    /** Handles a team command; false if {@code sub} is not one. */
    boolean command(CommandSender s, String label, String sub, String[] args) {
        if (!COMMANDS.contains(sub)) return false;
        if (!s.hasPermission("bauplaner.team.use")) { fail(s, "Dir fehlt das Recht bauplaner.team.use."); return true; }
        Actor actor;
        if (sub.equals("team") && args.length >= 2 && args[0].equalsIgnoreCase("als")) {
            // Console only: act for a player (server admin; also used by the server test).
            if (!(s instanceof ConsoleCommandSender)) { fail(s, "„team als“ geht nur in der Serverkonsole."); return true; }
            String player = args[1];
            UUID uuid = UUID.nameUUIDFromBytes(("OfflinePlayer:" + player).getBytes(StandardCharsets.UTF_8));
            Player online = Bukkit.getPlayerExact(player);
            if (online != null) uuid = online.getUniqueId();
            actor = new Actor(s, player, uuid, false);
            String[] rest = java.util.Arrays.copyOfRange(args, 2, args.length);
            if (rest.length == 0) { fail(s, "/" + label + " team als <spieler> <befehl …>"); return true; }
            return command(actor, label, rest[0].toLowerCase(Locale.ROOT), java.util.Arrays.copyOfRange(rest, 1, rest.length));
        }
        actor = s instanceof Player p ? new Actor(s, p.getName(), p.getUniqueId(), false) : new Actor(s, "Konsole", null, true);
        return command(actor, label, sub, args);
    }

    private boolean command(Actor a, String label, String sub, String[] args) {
        CommandSender s = a.sender;
        if (sub.equals("team") && args.length > 0) {
            switch (args[0].toLowerCase(Locale.ROOT)) {
                case "laden": if (!leader(s)) return true; load(s); return true;
                case "export": return export(s, a);
                case "wahl": return choose(s, a, String.join(" ", java.util.Arrays.copyOfRange(args, 1, args.length)));
                case "hilfe": return help(s, label);
                default: break;
            }
        }
        if (!COMMANDS.contains(sub)) return help(s, label);
        if (teams.isEmpty()) return fail(s, "Auf diesem Server ist noch kein Team angelegt. Die Bauleitung legt die Serverdatei aus dem Planer (Reiter „Team“) nach plugins/BauplanerBridge/team/ und ruft /" + label + " team laden auf.");
        TeamLog team = teamOf(a);
        TeamLog.View v = view(team);
        Optional<String> me = memberOf(team, a);
        return switch (sub) {
            case "team" -> overview(s, team, v, me, label);
            case "abschnitte" -> sections(s, team, v);
            case "nehmen" -> args.length == 0 ? fail(s, "/" + label + " nehmen <nr>") : withSection(s, team, args[0], sec -> {
                Optional<String> m = ensureMember(team, a);
                if (m.isEmpty()) return fail(s, "Du bist nicht im Team (neue Spieler treten auf diesem Server nicht selbst bei).");
                JsonObject e = team.event(m.get(), "section.claim"); e.addProperty("section", sec.id());
                return submit(team, e, s, "Abschnitt " + sec.number() + " „" + sec.name() + "“ gehört jetzt dir. /" + label + " zeigen " + sec.number() + " zeigt den Umriss.");
            });
            case "abgeben" -> args.length == 0 ? fail(s, "/" + label + " abgeben <nr>") : withSection(s, team, args[0], sec -> {
                if (me.isEmpty()) return fail(s, "Du bist nicht im Team.");
                JsonObject e = team.event(me.get(), "section.release"); e.addProperty("section", sec.id());
                return submit(team, e, s, "Abschnitt " + sec.number() + " „" + sec.name() + "“ ist wieder frei.");
            });
            case "fertig" -> {
                Optional<String> m = ensureMember(team, a);
                if (m.isEmpty()) yield fail(s, "Du bist nicht im Team.");
                String ref = args.length > 0 ? args[0] : null;
                Optional<TeamLog.Section> sec = ref != null ? team.section(ref) : ownSection(team, v, m.get(), a);
                if (sec.isEmpty()) yield fail(s, ref == null ? "Welcher Abschnitt? /" + label + " fertig <nr> [notiz]" : "Abschnitt „" + ref + "“ gibt es nicht.");
                JsonObject e = team.event(m.get(), "section.done"); e.addProperty("section", sec.get().id());
                String note = args.length > 1 ? String.join(" ", java.util.Arrays.copyOfRange(args, 1, args.length)) : "";
                if (!note.isBlank()) e.addProperty("note", clip(note, 300));
                yield submit(team, e, s, "Abschnitt " + sec.get().number() + " „" + sec.get().name() + "“ als fertig gemeldet. Die Bauleitung prüft ihn.");
            }
            case "zeigen" -> args.length == 0 ? fail(s, "/" + label + " zeigen <nr>") : withSection(s, team, args[0], sec -> show(s, sec));
            case "notiz" -> note(s, a, team, args, label);
            case "notizen" -> notes(s, team, v, a);
            case "geliefert" -> delivered(s, a, team, args, label);
            case "sammle" -> gather(s, a, team, args, label);
            case "zuweisen" -> args.length < 2 ? fail(s, "/" + label + " zuweisen <nr> <spieler>") : withSection(s, team, args[0], sec -> {
                if (me.isEmpty() && !a.console) return fail(s, "Du bist nicht im Team.");
                Optional<String> target = v.memberOfPlayer(args[1]).or(() -> v.names.entrySet().stream().filter(x -> x.getValue().equalsIgnoreCase(args[1])).map(Map.Entry::getKey).findFirst());
                if (target.isEmpty()) return fail(s, "„" + args[1] + "“ ist nicht im Team. Spieler treten bei, sobald sie einen Abschnitt nehmen oder melden.");
                JsonObject e = team.event(me.orElse(team.founder), "section.assign"); e.addProperty("section", sec.id()); e.addProperty("member", target.get());
                return submit(team, e, s, "Abschnitt " + sec.number() + " „" + sec.name() + "“ an " + v.name(target.get()) + " zugewiesen.");
            });
            case "pruefen" -> args.length < 2 ? fail(s, "/" + label + " pruefen <nr> ok|nacharbeit [notiz]") : withSection(s, team, args[0], sec -> {
                if (me.isEmpty()) return fail(s, "Du bist nicht im Team.");
                String r = args[1].toLowerCase(Locale.ROOT);
                if (!r.equals("ok") && !r.equals("nacharbeit")) return fail(s, "ok oder nacharbeit");
                JsonObject e = team.event(me.get(), "section.verify"); e.addProperty("section", sec.id()); e.addProperty("ok", r.equals("ok"));
                if (args.length > 2) e.addProperty("note", clip(String.join(" ", java.util.Arrays.copyOfRange(args, 2, args.length)), 300));
                return submit(team, e, s, "Abschnitt " + sec.number() + (r.equals("ok") ? " bestätigt." : " braucht Nacharbeit."));
            });
            case "rolle" -> {
                if (args.length < 2) yield fail(s, "/" + label + " rolle <spieler> <bauleitung|baumeister|helfer|gast>");
                String role = switch (args[1].toLowerCase(Locale.ROOT)) { case "bauleitung", "leitung" -> "leitung"; case "baumeister", "meister" -> "meister"; case "helfer" -> "helfer"; case "gast" -> "gast"; default -> null; };
                if (role == null) yield fail(s, "Rolle bauleitung, baumeister, helfer oder gast.");
                Optional<String> target = v.memberOfPlayer(args[0]).or(() -> v.names.entrySet().stream().filter(x -> x.getValue().equalsIgnoreCase(args[0])).map(Map.Entry::getKey).findFirst());
                if (target.isEmpty()) yield fail(s, "„" + args[0] + "“ ist nicht im Team.");
                String by = a.console || s.hasPermission("bauplaner.team.leitung") && me.isEmpty() ? team.founder : me.orElse("");
                if (by.isEmpty()) yield fail(s, "Du bist nicht im Team.");
                JsonObject e = team.event(by, "member.role"); e.addProperty("member", target.get()); e.addProperty("role", role);
                yield submit(team, e, s, v.name(target.get()) + " ist jetzt " + TeamLog.ROLE_LABEL.get(role) + ".");
            }
            default -> help(s, label);
        };
    }

    private boolean leader(CommandSender s) {
        if (s.hasPermission("bauplaner.team.leitung")) return true;
        fail(s, "Dafür fehlt das Recht bauplaner.team.leitung.");
        return false;
    }

    private interface SectionAction { boolean run(TeamLog.Section s); }
    private boolean withSection(CommandSender s, TeamLog team, String ref, SectionAction action) {
        Optional<TeamLog.Section> sec = team.section(ref);
        if (sec.isEmpty()) return fail(s, "Abschnitt „" + ref + "“ gibt es nicht. /bauplaner abschnitte listet alle.");
        return action.run(sec.get());
    }

    private TeamLog teamOf(Actor a) {
        String key = a.uuid == null ? "konsole" : a.uuid.toString();
        TeamLog t = chosen.containsKey(key) ? teams.get(chosen.get(key)) : null;
        if (t != null) return t;
        if (a.sender instanceof Player p) {
            Location l = p.getLocation();
            String dim = PaperCompat.dimension(p.getWorld());
            for (TeamLog team : teams.values())
                for (TeamLog.Section sec : team.sections) for (TeamLog.Box b : sec.boxes()) if (b.contains(dim, l.getBlockX(), l.getBlockY(), l.getBlockZ())) return team;
        }
        return teams.values().iterator().next();
    }

    private boolean choose(CommandSender s, Actor a, String name) {
        if (teams.isEmpty()) return fail(s, "Kein Team angelegt.");
        if (name.isBlank()) { say(s, "Teams: " + teams.values().stream().map(t -> t.name).collect(Collectors.joining(", "))); return true; }
        Optional<TeamLog> t = teams.values().stream().filter(x -> x.name.equalsIgnoreCase(name) || x.name.toLowerCase(Locale.ROOT).startsWith(name.toLowerCase(Locale.ROOT))).findFirst();
        if (t.isEmpty()) return fail(s, "Team „" + name + "“ nicht gefunden.");
        chosen.put(a.uuid == null ? "konsole" : a.uuid.toString(), t.get().teamId);
        say(s, "Aktives Team: " + t.get().name + ".");
        return true;
    }

    private Optional<TeamLog.Section> ownSection(TeamLog team, TeamLog.View v, String member, Actor a) {
        if (a.sender instanceof Player p) {
            Location l = p.getLocation(); String dim = PaperCompat.dimension(p.getWorld());
            for (TeamLog.Section sec : team.ordered()) for (TeamLog.Box b : sec.boxes()) if (b.contains(dim, l.getBlockX(), l.getBlockY(), l.getBlockZ())) return Optional.of(sec);
        }
        List<TeamLog.Section> mine = team.ordered().stream().filter(sec -> member.equals(v.section(sec.id()).owner) && !v.section(sec.id()).status.equals("bestaetigt")).collect(Collectors.toList());
        return mine.size() == 1 ? Optional.of(mine.get(0)) : Optional.empty();
    }

    private boolean help(CommandSender s, String label) {
        say(s, "Team: /" + label + " team · abschnitte · nehmen <nr> · abgeben <nr> · fertig [<nr>] [notiz] · zeigen <nr>");
        say(s, "notiz <frage|problem|material|info> <text> · notizen · geliefert <item|hand> [menge] · sammle <item> <menge>");
        say(s, "Baumeister: zuweisen <nr> <spieler> · pruefen <nr> ok|nacharbeit [notiz] · Bauleitung: rolle <spieler> <rolle> · team laden · team export · team wahl <name>");
        return true;
    }

    private boolean overview(CommandSender s, TeamLog team, TeamLog.View v, Optional<String> me, String label) {
        say(s, ChatColor.BOLD + team.name + ChatColor.RESET + (team.projectName.equals(team.name) ? "" : " · " + team.projectName)
                + (v.releaseNumber >= 0 ? " · Planstand " + v.releaseNumber + (v.releaseSummary == null || v.releaseSummary.isBlank() ? "" : " (" + v.releaseSummary + ")") : ""));
        if (me.isPresent()) {
            String m = me.get();
            say(s, "Du: " + v.name(m) + " · " + TeamLog.ROLE_LABEL.get(v.role(m)));
            List<String> mine = team.ordered().stream().filter(sec -> m.equals(v.section(sec.id()).owner))
                    .map(sec -> sec.number() + " " + sec.name() + " (" + TeamLog.STATUS_LABEL.get(v.section(sec.id()).status) + ")").collect(Collectors.toList());
            say(s, mine.isEmpty() ? "Du hast keinen Abschnitt. /" + label + " nehmen <nr>" : "Deine Abschnitte: " + String.join(", ", mine));
        } else say(s, "Du bist noch nicht im Team. Mit /" + label + " nehmen <nr> trittst du bei.");
        List<String> free = team.ordered().stream().filter(sec -> v.section(sec.id()).status.equals("frei")).limit(5).map(sec -> sec.number() + " " + sec.name()).collect(Collectors.toList());
        say(s, free.isEmpty() ? "Kein Abschnitt frei." : "Frei: " + String.join(", ", free));
        long open = v.notes.values().stream().filter(n -> n.resolvedBy == null).count();
        if (open > 0) say(s, open + " offene Notiz(en): /" + label + " notizen");
        return true;
    }

    private boolean sections(CommandSender s, TeamLog team, TeamLog.View v) {
        for (TeamLog.Section sec : team.ordered()) {
            TeamLog.SectionState st = v.section(sec.id());
            ChatColor c = switch (st.status) { case "frei" -> ChatColor.GREEN; case "vergeben" -> ChatColor.YELLOW; case "gemeldet" -> ChatColor.AQUA; case "bestaetigt" -> ChatColor.GRAY; default -> ChatColor.RED; };
            say(s, c + "" + sec.number() + ". " + sec.name() + ChatColor.RESET + " – " + TeamLog.STATUS_LABEL.get(st.status) + (st.owner != null ? " · " + v.name(st.owner) : ""));
        }
        if (team.sections.isEmpty()) say(s, "Das Projekt hat keine Bauabschnitte.");
        return true;
    }

    private boolean show(CommandSender s, TeamLog.Section sec) {
        if (!(s instanceof Player p)) return fail(s, "Der Umriss ist nur im Spiel sichtbar.");
        if (sec.boxes().isEmpty()) return fail(s, "Der Abschnitt hat keine Box (Projekt nicht auf der Weltkarte platziert?).");
        TeamLog.Box first = sec.boxes().get(0);
        say(s, "Umriss von „" + sec.name() + "“ für 30 s: " + first.minX() + " " + first.minY() + " " + first.minZ() + " bis " + first.maxX() + " " + first.maxY() + " " + first.maxZ() + ".");
        int[] runs = { 0 };
        BukkitTask[] task = new BukkitTask[1];
        task[0] = Bukkit.getScheduler().runTaskTimer(plugin, () -> {
            if (++runs[0] > 30 || !p.isOnline()) { task[0].cancel(); return; }
            for (TeamLog.Box b : sec.boxes()) if (PaperCompat.dimension(p.getWorld()).equals(b.dimension())) outline(p, b);
        }, 0L, 20L);
        return true;
    }

    /** Box edges as particles for one player (at most ~600 points). */
    private static void outline(Player p, TeamLog.Box b) {
        double x0 = b.minX(), y0 = b.minY(), z0 = b.minZ(), x1 = b.maxX() + 1, y1 = b.maxY() + 1, z1 = b.maxZ() + 1;
        double edges = 4 * ((x1 - x0) + (y1 - y0) + (z1 - z0));
        double step = Math.max(0.5, edges / 600);
        double[][] lines = { { x0, y0, z0, x1, y0, z0 }, { x0, y1, z0, x1, y1, z0 }, { x0, y0, z1, x1, y0, z1 }, { x0, y1, z1, x1, y1, z1 },
            { x0, y0, z0, x0, y1, z0 }, { x1, y0, z0, x1, y1, z0 }, { x0, y0, z1, x0, y1, z1 }, { x1, y0, z1, x1, y1, z1 },
            { x0, y0, z0, x0, y0, z1 }, { x1, y0, z0, x1, y0, z1 }, { x0, y1, z0, x0, y1, z1 }, { x1, y1, z0, x1, y1, z1 } };
        try {
            for (double[] l : lines) {
                double len = Math.abs(l[3] - l[0]) + Math.abs(l[4] - l[1]) + Math.abs(l[5] - l[2]);
                for (double t = 0; t <= len; t += step) {
                    double f = len == 0 ? 0 : t / len;
                    p.spawnParticle(Particle.END_ROD, l[0] + (l[3] - l[0]) * f, l[1] + (l[4] - l[1]) * f, l[2] + (l[5] - l[2]) * f, 1, 0, 0, 0, 0);
                }
            }
        } catch (Throwable e) {
            // Particle API differs on some servers: the coordinates in chat stay as the fallback.
        }
    }

    private boolean note(CommandSender s, Actor a, TeamLog team, String[] args, String label) {
        if (args.length < 2 || !TeamLog.NOTE_TAGS.contains(args[0].toLowerCase(Locale.ROOT))) return fail(s, "/" + label + " notiz <frage|problem|material|info> <text>");
        Optional<String> m = memberOf(team, a);
        String by = m.orElseGet(() -> a.uuid == null ? team.founder : memberIdOf(a.uuid));
        if (m.isEmpty() && a.uuid != null) { m = ensureMember(team, a); if (m.isPresent()) by = m.get(); }
        JsonObject e = team.event(by, "note.add");
        e.addProperty("noteId", TeamLog.newId("note"));
        e.addProperty("text", clip(String.join(" ", java.util.Arrays.copyOfRange(args, 1, args.length)), 500));
        e.addProperty("tag", args[0].toLowerCase(Locale.ROOT));
        if (s instanceof Player p) {
            Location l = p.getLocation();
            JsonArray pos = new JsonArray(); pos.add(l.getBlockX()); pos.add(l.getBlockY()); pos.add(l.getBlockZ());
            e.add("pos", pos);
            String dim = PaperCompat.dimension(p.getWorld());
            for (TeamLog.Section sec : team.ordered()) if (sec.boxes().stream().anyMatch(b -> b.contains(dim, l.getBlockX(), l.getBlockY(), l.getBlockZ()))) { e.addProperty("section", sec.id()); break; }
        }
        return submit(team, e, s, "Notiz gespeichert. Sie erscheint im Planer beim nächsten Abgleich.");
    }

    private boolean notes(CommandSender s, TeamLog team, TeamLog.View v, Actor a) {
        List<TeamLog.NoteState> open = v.notes.values().stream().filter(n -> n.resolvedBy == null).collect(Collectors.toList());
        if (s instanceof Player p) {
            Location l = p.getLocation();
            List<TeamLog.NoteState> near = open.stream().filter(n -> n.pos != null && Math.abs(n.pos[0] - l.getBlockX()) <= 32 && Math.abs(n.pos[2] - l.getBlockZ()) <= 32).collect(Collectors.toList());
            if (!near.isEmpty()) { say(s, near.size() + " Notiz(en) in der Nähe:"); open = near; }
        }
        if (open.isEmpty()) { say(s, "Keine offenen Notizen."); return true; }
        for (TeamLog.NoteState n : open.subList(0, Math.min(10, open.size())))
            say(s, ChatColor.YELLOW + n.tag + ChatColor.RESET + " · " + v.name(n.by) + ": " + n.text + (n.pos != null ? ChatColor.GRAY + " (" + n.pos[0] + " " + n.pos[1] + " " + n.pos[2] + ")" : ""));
        return true;
    }

    private static String itemId(String raw) {
        String r = raw.toLowerCase(Locale.ROOT);
        return r.contains(":") ? r : "minecraft:" + r;
    }

    @SuppressWarnings("deprecation")
    private boolean delivered(CommandSender s, Actor a, TeamLog team, String[] args, String label) {
        if (args.length == 0) return fail(s, "/" + label + " geliefert <item> <menge>  oder  /" + label + " geliefert hand");
        String item; long count;
        if (args[0].equalsIgnoreCase("hand")) {
            if (!(s instanceof Player p)) return fail(s, "„hand“ geht nur im Spiel.");
            ItemStack stack = p.getInventory().getItemInMainHand();
            if (stack == null || stack.getType() == Material.AIR) return fail(s, "Du hältst nichts in der Hand.");
            item = stack.getType().getKey().toString();
            count = args.length > 1 ? parseCount(args[1]) : stack.getAmount();
        } else {
            item = itemId(args[0]);
            count = args.length > 1 ? parseCount(args[1]) : -1;
        }
        if (count <= 0) return fail(s, "Menge als Zahl, z. B. 64 oder 3x64.");
        if (!item.matches("[a-z0-9_.-]+:[a-z0-9_./-]+")) return fail(s, "Ungültige Item-ID.");
        Optional<String> m = ensureMember(team, a);
        if (m.isEmpty()) return fail(s, "Du bist nicht im Team.");
        JsonObject e = team.event(m.get(), "contribution");
        JsonArray items = new JsonArray(); JsonObject line = new JsonObject(); line.addProperty("item", item); line.addProperty("count", count); items.add(line);
        e.add("items", items);
        return submit(team, e, s, count + " × " + item.replace("minecraft:", "") + " als geliefert vermerkt (das Plugin nimmt nichts aus dem Inventar).");
    }

    private boolean gather(CommandSender s, Actor a, TeamLog team, String[] args, String label) {
        if (args.length < 2) return fail(s, "/" + label + " sammle <item> <menge>  (0 = zurückgeben)");
        long count = args[1].equals("0") ? 0 : parseCount(args[1]);
        if (count < 0) return fail(s, "Menge als Zahl.");
        String item = itemId(args[0]);
        Optional<String> m = ensureMember(team, a);
        if (m.isEmpty()) return fail(s, "Du bist nicht im Team.");
        JsonObject e = team.event(m.get(), "gather.claim"); e.addProperty("item", item); e.addProperty("count", count);
        return submit(team, e, s, count == 0 ? "Sammelauftrag zurückgegeben." : "Du sammelst " + count + " × " + item.replace("minecraft:", "") + ".");
    }

    /** "64", "3x64", "2st" (stacks of 64); -1 if invalid. */
    static long parseCount(String text) {
        String t = text.toLowerCase(Locale.ROOT).trim();
        try {
            if (t.matches("\\d+x\\d+")) { String[] p = t.split("x"); return Long.parseLong(p[0]) * Long.parseLong(p[1]); }
            if (t.matches("\\d+st")) return Long.parseLong(t.substring(0, t.length() - 2)) * 64;
            long n = Long.parseLong(t);
            return n > 0 && n <= 1_000_000_000L ? n : -1;
        } catch (NumberFormatException e) { return -1; }
    }

    private static String clip(String t, int max) { return t.length() <= max ? t : t.substring(0, max); }

    private boolean export(CommandSender s, Actor a) {
        if (teams.isEmpty()) return fail(s, "Kein Team angelegt.");
        TeamLog team = teamOf(a);
        String safe = team.name.replaceAll("[^A-Za-z0-9ÄÖÜäöüß_-]+", "-").replaceAll("^-+|-+$", "");
        Path out = dir.resolve((safe.isEmpty() ? "team" : safe) + "-server-" + LocalDate.now() + ".export.json");
        try {
            Path tmp = out.resolveSibling(out.getFileName() + ".tmp");
            Files.writeString(tmp, team.exportJson(), StandardCharsets.UTF_8);
            Files.move(tmp, out, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) { return fail(s, "Ausfuhr nicht geschrieben: " + e.getMessage()); }
        say(s, "Teamstand geschrieben: plugins/BauplanerBridge/team/" + out.getFileName() + " (" + team.size() + " Ereignisse). Im Planer im Reiter „Team“ einlesen.");
        return true;
    }

    List<String> complete(String sub, String[] args) {
        if (teams.isEmpty()) return List.of();
        TeamLog team = teams.values().iterator().next();
        List<String> numbers = team.ordered().stream().map(sec -> String.valueOf(sec.number())).collect(Collectors.toList());
        return switch (sub) {
            case "nehmen", "abgeben", "fertig", "zeigen" -> args.length == 2 ? numbers : List.of();
            case "zuweisen" -> args.length == 2 ? numbers : args.length == 3 ? Bukkit.getOnlinePlayers().stream().map(Player::getName).collect(Collectors.toList()) : List.of();
            case "pruefen" -> args.length == 2 ? numbers : args.length == 3 ? List.of("ok", "nacharbeit") : List.of();
            case "notiz" -> args.length == 2 ? TeamLog.NOTE_TAGS : List.of();
            case "geliefert" -> args.length == 2 ? List.of("hand") : List.of();
            case "rolle" -> args.length == 2 ? Bukkit.getOnlinePlayers().stream().map(Player::getName).collect(Collectors.toList()) : args.length == 3 ? List.of("bauleitung", "baumeister", "helfer", "gast") : List.of();
            case "team" -> args.length == 2 ? List.of("laden", "export", "wahl", "hilfe") : List.of();
            default -> List.of();
        };
    }

    // ------------------------------------------------------------------ in the world

    private record Hit(TeamLog team, TeamLog.Section section) {}
    private Hit at(String dim, int x, int y, int z) {
        for (TeamLog team : teams.values())
            for (TeamLog.Section sec : team.sections) for (TeamLog.Box b : sec.boxes()) if (b.contains(dim, x, y, z)) return new Hit(team, sec);
        return null;
    }

    private void actionBars() {
        if (teams.isEmpty()) return;
        for (Player p : Bukkit.getOnlinePlayers()) {
            Location l = p.getLocation();
            Hit hit = at(PaperCompat.dimension(p.getWorld()), l.getBlockX(), l.getBlockY(), l.getBlockZ());
            if (hit == null) { lastBar.remove(p.getUniqueId()); continue; }
            TeamLog.View v = view(hit.team);
            TeamLog.SectionState st = v.section(hit.section.id());
            String text = "Abschnitt " + hit.section.number() + " · " + hit.section.name() + " · " + TeamLog.STATUS_LABEL.get(st.status) + (st.owner != null ? " · " + v.name(st.owner) : " · /bauplaner nehmen " + hit.section.number());
            PaperCompat.actionBar(p, text);
            lastBar.put(p.getUniqueId(), text);
        }
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent e) { guard(e.getPlayer(), e.getBlock().getLocation(), () -> e.setCancelled(true)); }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent e) { guard(e.getPlayer(), e.getBlock().getLocation(), () -> e.setCancelled(true)); }

    /** Protection: hint (default) or block changes in sections other members took over. */
    private void guard(Player p, Location l, Runnable cancel) {
        String mode = plugin.getConfig().getString("team.schutz", "hinweis");
        if (teams.isEmpty() || "aus".equals(mode)) return;
        Hit hit = at(PaperCompat.dimension(l.getWorld()), l.getBlockX(), l.getBlockY(), l.getBlockZ());
        if (hit == null) return;
        TeamLog.View v = view(hit.team);
        TeamLog.SectionState st = v.section(hit.section.id());
        if (st.owner == null || st.status.equals("frei")) return;
        Actor a = new Actor(p, p.getName(), p.getUniqueId(), false);
        Optional<String> me = memberOf(hit.team, a);
        if (me.isPresent() && (me.get().equals(st.owner) || TeamLog.rank(v.role(me.get())) >= TeamLog.rank("meister"))) return;
        if (p.hasPermission("bauplaner.team.leitung")) return;
        boolean block = "sperren".equals(mode);
        if (block) cancel.run();
        long now = System.currentTimeMillis();
        if (now - lastHint.getOrDefault(p.getUniqueId(), 0L) < (block ? 3_000 : 60_000)) return;
        lastHint.put(p.getUniqueId(), now);
        say(p, ChatColor.YELLOW + "Abschnitt " + hit.section.number() + " „" + hit.section.name() + "“ baut " + v.name(st.owner) + "."
                + (block ? " Hier kannst du nichts ändern." : " Bitte absprechen."));
    }
}
