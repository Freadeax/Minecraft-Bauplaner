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
import org.bukkit.event.inventory.InventoryCloseEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

/**
 * Teambau on the server (COOP-02, docs/architecture/team/TEAMBAU.md). Players without planner or mod see
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
            "zuweisen", "pruefen", "rolle", "lager", "nachweis", "beitrag", "uebergeben", "annehmen", "ablehnen", "abwesend", "zurueck");
    private static final String PREFIX = ChatColor.GOLD + "[Bauplaner] " + ChatColor.RESET;

    private final JavaPlugin plugin;
    private final Path dir;
    private final Map<String, TeamLog> teams = new TreeMap<>();
    private final Map<String, Path> headerFiles = new HashMap<>();
    private final Map<String, String> chosen = new HashMap<>();
    private final Map<UUID, String> lastBar = new HashMap<>();
    private final Map<UUID, Long> lastHint = new HashMap<>();
    /**
     * Folded view per team, rebuilt only when that team's log grew (PERF-05 O-8). One shared slot made
     * every hopper or block event on a server with two teams replay both team logs, alternately.
     */
    private final Map<TeamLog, CachedView> views = new java.util.IdentityHashMap<>();
    private record CachedView(int size, TeamLog.View view) {}
    private BukkitTask barTask, tallyTask;
    private final StorageModule storage;
    private RoomLink room;
    /** Baunachweis not yet written: team|member|section → counts (COOP-04). */
    private final Map<String, Tally> pending = new TreeMap<>();
    private static final class Tally {
        final String teamId, member, section, from;
        long placed, broken;
        final Map<String, Long> blocks = new HashMap<>();
        Tally(String teamId, String member, String section) { this.teamId = teamId; this.member = member; this.section = section; this.from = java.time.Instant.now().toString(); }
    }

    TeamModule(JavaPlugin plugin, Path root) {
        this.plugin = plugin;
        this.dir = root.resolve("team");
        this.storage = new StorageModule(plugin, new Access());
    }

    void enable() {
        try { Files.createDirectories(dir); } catch (IOException e) { plugin.getLogger().warning("Teamordner nicht anlegbar: " + e.getMessage()); }
        load(null);
        room = new RoomLink(plugin, this, dir);
        uplink = room;
        room.enable();
        Bukkit.getPluginManager().registerEvents(this, plugin);
        if (plugin.getConfig().getBoolean("team.anzeige", true)) barTask = Bukkit.getScheduler().runTaskTimer(plugin, this::actionBars, 40L, 20L);
        long minutes = Math.max(1, plugin.getConfig().getLong("team.nachweis-minuten", 5));
        tallyTask = Bukkit.getScheduler().runTaskTimer(plugin, this::flushTallies, minutes * 1200L, minutes * 1200L);
        storage.enable();
    }

    void disable() {
        if (barTask != null) barTask.cancel();
        if (tallyTask != null) tallyTask.cancel();
        storage.disable();
        flushTallies();
        if (room != null) room.disable();
        uplink = TeamUplink.NONE;
    }

    /** Reads the team files again (new plan from the team room). */
    void reload() { load(null); }


    private boolean tallyEnabled() { return plugin.getConfig().getBoolean("team.nachweis", true); }

    /** Writes the collected Baunachweis as build.tally events (one per member and section). */
    private void flushTallies() {
        if (pending.isEmpty()) return;
        String until = java.time.Instant.now().toString();
        for (Tally t : new ArrayList<>(pending.values())) {
            TeamLog team = teams.get(t.teamId);
            if (team == null || t.placed == 0 && t.broken == 0) continue;
            JsonObject e = team.event(t.member, "build.tally");
            e.addProperty("section", t.section); e.addProperty("placed", t.placed); e.addProperty("broken", t.broken);
            List<Map.Entry<String, Long>> top = t.blocks.entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(48).collect(Collectors.toList());
            if (!top.isEmpty()) e.add("blocks", lines(top));
            e.addProperty("from", t.from); e.addProperty("until", until.compareTo(t.from) > 0 ? until : t.from);
            try { write(team, e); team.add(e); toUplink(team, e); } catch (IOException ex) { plugin.getLogger().warning("Baunachweis nicht gespeichert: " + ex.getMessage()); continue; }
        }
        pending.clear();
    }

    private static JsonArray lines(List<Map.Entry<String, Long>> entries) {
        JsonArray a = new JsonArray();
        for (Map.Entry<String, Long> x : entries) { JsonObject o = new JsonObject(); o.addProperty("item", x.getKey()); o.addProperty("count", x.getValue()); a.add(o); }
        return a;
    }

    private static void say(CommandSender s, String text) { s.sendMessage(PREFIX + text); }
    private static boolean fail(CommandSender s, String text) { s.sendMessage(PREFIX + ChatColor.RED + text); return true; }

    // ------------------------------------------------------------------ files

    /** (Re)reads every team file; returns a summary for the sender. */
    private String load(CommandSender s) {
        flushTallies();
        teams.clear(); headerFiles.clear(); views.clear();
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
        changed.run();
        return summary;
    }

    private void write(TeamLog team, JsonObject event) throws IOException {
        Path log = dir.resolve(team.teamId + ".events.jsonl");
        Files.writeString(log, TeamLog.GSON.toJson(event) + "\n", StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
    }

    private TeamLog.View view(TeamLog team) {
        CachedView c = views.get(team);
        if (c == null || c.size() != team.size()) views.put(team, c = new CachedView(team.size(), team.view()));
        return c.view();
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

    /** Live team room (TEAM_LIVE.md); {@link TeamUplink#NONE} until a room is configured. */
    static volatile TeamUplink uplink = TeamUplink.NONE;

    private void toUplink(TeamLog team, JsonObject e) {
        try { uplink.sent(team, e); } catch (RuntimeException ex) { plugin.getLogger().warning("Team-Uplink: " + ex.getMessage()); }
    }

    private boolean append(TeamLog team, JsonObject e, CommandSender s) {
        try {
            write(team, e);
            team.add(e);
            changed.run();
            toUplink(team, e);
            return true;
        } catch (IOException ex) {
            fail(s, "Nicht gespeichert: " + ex.getMessage());
            return false;
        }
    }

    /**
     * An event from the live team room (main thread): stored and folded like a local one, not sent back
     * to the uplink. Known ids are ignored (the room may resend). False for an unknown team or a write error.
     */
    boolean receive(String teamId, JsonObject e) {
        TeamLog team = teams.values().stream().filter(t -> t.teamId.equals(teamId)).findFirst().orElse(null);
        String id = TeamLog.str(e, "id");
        if (team == null || id == null) return false;
        if (team.has(id)) return true;
        try {
            write(team, e);
            team.add(e);
            changed.run();
            return true;
        } catch (IOException | RuntimeException ex) {
            plugin.getLogger().warning("Team-Raum: Ereignis " + id + " nicht übernommen: " + ex.getMessage());
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
                case "verbinden": {
                    if (!leader(s)) return true;
                    if (args.length < 2) return fail(s, "/" + label + " team verbinden <server-link aus dem Planer> (am besten in der Serverkonsole)");
                    say(s, "Verbinde mit dem Team-Raum …");
                    room.connect(args[1]).thenAccept(text -> Bukkit.getScheduler().runTask(plugin, () -> say(s, text)));
                    return true;
                }
                case "trennen": if (!leader(s)) return true; say(s, room.disconnect(args.length > 1 ? args[1] : null)); return true;
                case "raum": room.status().forEach(line -> say(s, line)); return true;
                case "hilfe": return help(s, label);
                default: break;
            }
        }
        if (!COMMANDS.contains(sub)) return help(s, label);
        if (teams.isEmpty()) return fail(s, "Auf diesem Server ist noch kein Team angelegt. Die Bauleitung legt es im Planer auf den Server (Seite „Spiel“ → „Server“ → „Team auf den Server“), ohne Befehl.");
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
            case "uebergeben" -> args.length < 2 ? fail(s, "/" + label + " uebergeben <nr> <spieler> [notiz]") : withSection(s, team, args[0], sec -> {
                if (me.isEmpty() && !a.console) return fail(s, "Du bist nicht im Team.");
                Optional<String> target = memberByName(v, args[1]);
                if (target.isEmpty()) return fail(s, "„" + args[1] + "“ ist nicht im Team.");
                JsonObject e = team.event(me.orElse(team.founder), "section.handover"); e.addProperty("section", sec.id()); e.addProperty("member", target.get());
                if (args.length > 2) e.addProperty("note", clip(String.join(" ", java.util.Arrays.copyOfRange(args, 2, args.length)), 300));
                boolean ok = submit(team, e, s, "Übergabe von Abschnitt " + sec.number() + " „" + sec.name() + "“ an " + v.name(target.get()) + " angeboten. Bis zur Annahme bleibt der Abschnitt beim bisherigen Inhaber.");
                notifyMember(team, target.get(), "Dir wird Abschnitt " + sec.number() + " „" + sec.name() + "“ übergeben: /" + label + " annehmen " + sec.number() + " oder /" + label + " ablehnen " + sec.number());
                return ok;
            });
            case "annehmen", "ablehnen" -> {
                if (me.isEmpty()) yield fail(s, "Du bist nicht im Team.");
                Optional<TeamLog.Section> sec = args.length > 0 ? team.section(args[0])
                        : team.ordered().stream().filter(x -> { TeamLog.Offer o = v.section(x.id()).offer; return o != null && o.to().equals(me.get()); }).findFirst();
                if (sec.isEmpty()) yield fail(s, args.length > 0 ? "Abschnitt „" + args[0] + "“ gibt es nicht." : "Für dich liegt kein Übergabeangebot vor.");
                boolean accept = sub.equals("annehmen");
                JsonObject e = team.event(me.get(), accept ? "section.accept" : "section.decline"); e.addProperty("section", sec.get().id());
                yield submit(team, e, s, accept ? "Abschnitt " + sec.get().number() + " „" + sec.get().name() + "“ gehört jetzt dir."
                        : "Übergabeangebot für Abschnitt " + sec.get().number() + " „" + sec.get().name() + "“ beendet.");
            }
            case "abwesend", "zurueck" -> {
                Optional<String> m = ensureMember(team, a);
                if (m.isEmpty()) yield fail(s, "Du bist nicht im Team.");
                JsonObject e = team.event(m.get(), "member.away"); e.addProperty("member", m.get());
                List<String> rest = new java.util.ArrayList<>(List.of(args));
                boolean back = sub.equals("zurueck") || rest.size() == 1 && rest.get(0).equalsIgnoreCase("aus");
                String until = null;
                if (!back) {
                    if (!rest.isEmpty() && rest.get(0).equalsIgnoreCase("bis")) rest.remove(0);
                    if (!rest.isEmpty() && rest.get(0).matches("\\d{4}-\\d{2}-\\d{2}")) {
                        try { java.time.LocalDate.parse(rest.get(0)); } catch (java.time.format.DateTimeParseException ex) { yield fail(s, "Datum als JJJJ-MM-TT, z. B. 2026-11-10."); }
                        until = rest.remove(0);
                    }
                    String note = clip(String.join(" ", rest).trim(), 120);
                    if (until != null) e.addProperty("until", until);
                    if (!note.isEmpty()) e.addProperty("note", note);
                    if (until == null && note.isEmpty()) e.addProperty("note", "abwesend");
                }
                yield submit(team, e, s, back ? "Willkommen zurück – du bist wieder als anwesend eingetragen."
                        : "Als abwesend eingetragen" + (until != null ? " bis einschließlich " + until : "") + ". /" + label + " zurueck hebt das auf.");
            }
            case "lager" -> storage.command(s, a.playerName, a.uuid, a.console, label, args);
            case "nachweis" -> tallySwitch(s, a, team, v, args, label);
            case "beitrag" -> contributionReport(s, a, team, args, label);
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
        say(s, "Lager: lager hilfe · lager info · lager bedarf [nr] · nachweis [an|aus] · beitrag [alle] · Baumeister: lager markieren [name] · lager siegeln · lager schutz <stufe>");
        say(s, "Übergabe: uebergeben <nr> <spieler> [notiz] · annehmen [nr] · ablehnen [nr] · abwesend [bis JJJJ-MM-TT] [notiz] · zurueck");
        say(s, "Baumeister: zuweisen <nr> <spieler> · pruefen <nr> ok|nacharbeit [notiz] · Bauleitung: rolle <spieler> <rolle> · team laden · team export · team wahl <name> · team verbinden <link> · team trennen · team raum");
        return true;
    }

    private static Optional<String> memberByName(TeamLog.View v, String name) {
        return v.memberOfPlayer(name).or(() -> v.names.entrySet().stream().filter(x -> x.getValue().equalsIgnoreCase(name)).map(Map.Entry::getKey).findFirst())
                .or(() -> v.known.contains(name) ? Optional.of(name) : Optional.empty());
    }

    /** Tells an online member (by linked player name) something, e.g. a handover offer. */
    private void notifyMember(TeamLog team, String member, String text) {
        String player = view(team).players.get(member);
        if (player == null) return;
        Player p = Bukkit.getPlayerExact(player);
        if (p != null) say(p, text);
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
            for (TeamLog.Section sec : team.ordered()) {
                TeamLog.Offer o = v.section(sec.id()).offer;
                if (o != null && o.to().equals(m)) say(s, ChatColor.AQUA + "Übergabe an dich: " + sec.number() + " " + sec.name() + " (von " + v.name(o.by()) + (o.note() != null ? ": " + o.note() : "") + ") – /" + label + " annehmen " + sec.number() + ChatColor.RESET);
            }
            TeamLog.Away aw = v.away.get(m);
            if (aw != null) say(s, "Du bist als abwesend eingetragen" + (aw.until() != null ? " bis " + aw.until() : "") + ". /" + label + " zurueck");
        } else say(s, "Du bist noch nicht im Team. Mit /" + label + " nehmen <nr> trittst du bei.");
        List<String> free = team.ordered().stream().filter(sec -> v.section(sec.id()).status.equals("frei")).limit(5).map(sec -> sec.number() + " " + sec.name()).collect(Collectors.toList());
        say(s, free.isEmpty() ? "Kein Abschnitt frei." : "Frei: " + String.join(", ", free));
        if (!v.away.isEmpty()) say(s, "Abwesend: " + v.away.entrySet().stream().map(x -> v.name(x.getKey()) + (x.getValue().until() != null ? " (bis " + x.getValue().until() + ")" : "")).collect(Collectors.joining(", ")));
        long open = v.notes.values().stream().filter(n -> n.resolvedBy == null).count();
        if (open > 0) say(s, open + " offene Notiz(en): /" + label + " notizen");
        return true;
    }

    private boolean sections(CommandSender s, TeamLog team, TeamLog.View v) {
        for (TeamLog.Section sec : team.ordered()) {
            TeamLog.SectionState st = v.section(sec.id());
            ChatColor c = switch (st.status) { case "frei" -> ChatColor.GREEN; case "vergeben" -> ChatColor.YELLOW; case "gemeldet" -> ChatColor.AQUA; case "bestaetigt" -> ChatColor.GRAY; default -> ChatColor.RED; };
            say(s, c + "" + sec.number() + ". " + sec.name() + ChatColor.RESET + " – " + TeamLog.STATUS_LABEL.get(st.status) + (st.owner != null ? " · " + v.name(st.owner) : "")
                    + (st.owner != null && v.away.containsKey(st.owner) ? " (abwesend)" : "") + (st.offer != null ? ChatColor.AQUA + " → Übergabe an " + v.name(st.offer.to()) + " offen" : ""));
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
        if (args.length == 0) return fail(s, "/" + label + " sammle <item> [menge]  (ohne Menge: was laut Bedarf noch fehlt; 0 = zurückgeben)");
        long count;
        if (args.length == 1) {
            // COOP-05: missing amount = need of the project − counted stores − what others already collect.
            String it = itemId(args[0]);
            TeamLog.View v = view(team);
            long need = StorageModule.need(team, null).getOrDefault(it, 0L), have = StorageModule.stock(v, null).getOrDefault(it, 0L);
            if (need == 0) return fail(s, "Für " + it.replace("minecraft:", "") + " steht kein Bedarf in der Serverdatei. /" + label + " sammle <item> <menge>");
            String mine = memberOf(team, a).orElse("") + " " + it;
            long others = v.gather.entrySet().stream().filter(x -> x.getKey().endsWith(" " + it) && !x.getKey().equals(mine)).mapToLong(Map.Entry::getValue).sum();
            count = need - have - others;
            if (count <= 0) { say(s, it.replace("minecraft:", "") + ": Bedarf " + need + ", im Lager " + have + ", unterwegs " + others + " – es fehlt nichts."); return true; }
        } else count = args[1].equals("0") ? 0 : parseCount(args[1]);
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
        flushTallies();
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
            case "nehmen", "abgeben", "fertig", "zeigen", "annehmen", "ablehnen" -> args.length == 2 ? numbers : List.of();
            case "uebergeben" -> args.length == 2 ? numbers : args.length == 3 ? Bukkit.getOnlinePlayers().stream().map(Player::getName).collect(Collectors.toList()) : List.of();
            case "abwesend" -> args.length == 2 ? List.of("bis", "aus", java.time.LocalDate.now().plusDays(7).toString()) : List.of();
            case "zuweisen" -> args.length == 2 ? numbers : args.length == 3 ? Bukkit.getOnlinePlayers().stream().map(Player::getName).collect(Collectors.toList()) : List.of();
            case "pruefen" -> args.length == 2 ? numbers : args.length == 3 ? List.of("ok", "nacharbeit") : List.of();
            case "notiz" -> args.length == 2 ? TeamLog.NOTE_TAGS : List.of();
            case "geliefert" -> args.length == 2 ? List.of("hand") : List.of();
            case "rolle" -> args.length == 2 ? Bukkit.getOnlinePlayers().stream().map(Player::getName).collect(Collectors.toList()) : args.length == 3 ? List.of("bauleitung", "baumeister", "helfer", "gast") : List.of();
            case "team" -> args.length == 2 ? List.of("laden", "export", "wahl", "verbinden", "trennen", "raum", "hilfe") : List.of();
            case "lager" -> storage.complete(args);
            case "nachweis" -> args.length == 2 ? List.of("an", "aus") : List.of();
            case "beitrag" -> args.length == 2 ? List.of("alle") : List.of();
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

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void countPlace(BlockPlaceEvent e) { count(e.getPlayer(), e.getBlock().getLocation(), e.getBlock().getType().getKey().toString(), true); }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void countBreak(BlockBreakEvent e) { count(e.getPlayer(), e.getBlock().getLocation(), null, false); }

    /** Baunachweis: only team members, only inside section boxes, only when switched on (server and member). */
    private void count(Player p, Location l, String block, boolean placed) {
        if (teams.isEmpty() || !tallyEnabled()) return;
        Hit hit = at(PaperCompat.dimension(l.getWorld()), l.getBlockX(), l.getBlockY(), l.getBlockZ());
        if (hit == null) return;
        Optional<String> me = memberOf(hit.team, new Actor(p, p.getName(), p.getUniqueId(), false));
        if (me.isEmpty() || view(hit.team).tallyOff.contains(me.get())) return;
        Tally t = pending.computeIfAbsent(hit.team.teamId + "|" + me.get() + "|" + hit.section.id(), k -> new Tally(hit.team.teamId, me.get(), hit.section.id()));
        if (placed) { t.placed++; if (block != null) t.blocks.merge(block, 1L, Long::sum); } else t.broken++;
    }

    // ------------------------------------------------------------------ storage chests (COOP-04/05): StorageModule

    /** Access of the storage module to teams, views, members and the log. */
    private final class Access implements StorageModule.TeamAccess {
        @Override public java.util.Collection<TeamLog> teams() { return teams.values(); }
        @Override public TeamLog.View view(TeamLog team) { return TeamModule.this.view(team); }
        @Override public Optional<String> member(TeamLog team, String playerName, UUID uuid) { return memberOf(team, new Actor(Bukkit.getConsoleSender(), playerName, uuid, uuid == null)); }
        @Override public Optional<String> join(TeamLog team, CommandSender s, String playerName, UUID uuid) { return ensureMember(team, new Actor(s, playerName, uuid, false)); }
        @Override public boolean append(TeamLog team, JsonObject e, CommandSender s) { return TeamModule.this.append(team, e, s); }
        @Override public boolean submit(TeamLog team, JsonObject e, CommandSender s, String okText) {
            int before = team.size();
            TeamModule.this.submit(team, e, s, okText);
            return team.size() > before;
        }
        @Override public TeamLog teamFor(CommandSender s, String playerName, UUID uuid) { return teamOf(new Actor(s, playerName, uuid, uuid == null)); }
    }

    StorageModule storage() { return storage; }

    // ------------------------------------------------------------------ team room for the server link (LINK-02)

    List<String> roomStatus() { return room.status(); }
    java.util.concurrent.CompletableFuture<String> roomConnect(String link) { return room.connect(link); }
    String roomDisconnect(String teamId) { return room.disconnect(teamId); }

    private boolean tallySwitch(CommandSender s, Actor a, TeamLog team, TeamLog.View v, String[] args, String label) {
        Optional<String> m = ensureMember(team, a);
        if (m.isEmpty()) return fail(s, "Du bist nicht im Team.");
        if (args.length == 0) {
            boolean on = !v.tallyOff.contains(m.get());
            say(s, "Baunachweis für dich: " + (on ? "an" : "aus") + (tallyEnabled() ? "" : " (auf diesem Server ganz abgeschaltet)") + ". Gezählt werden nur Blöcke in Abschnitten des Teams. /" + label + " nachweis " + (on ? "aus" : "an"));
            return true;
        }
        String r = args[0].toLowerCase(Locale.ROOT);
        if (!r.equals("an") && !r.equals("aus")) return fail(s, "/" + label + " nachweis an|aus");
        if (r.equals("aus")) pending.keySet().removeIf(k -> k.startsWith(team.teamId + "|" + m.get() + "|"));
        JsonObject e = team.event(m.get(), "member.tally"); e.addProperty("member", m.get()); e.addProperty("on", r.equals("an"));
        return submit(team, e, s, r.equals("an") ? "Baunachweis an: deine Blöcke in Teamabschnitten werden gezählt." : "Baunachweis aus: es wird nichts mehr gezählt, bisherige Zahlen sind ausgeblendet.");
    }

    private boolean contributionReport(CommandSender s, Actor a, TeamLog team, String[] args, String label) {
        flushTallies();
        TeamLog.View v = view(team);
        if (args.length > 0 && args[0].equalsIgnoreCase("alle")) {
            List<Map.Entry<String, Long>> rank = v.placed.entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).collect(Collectors.toList());
            if (rank.isEmpty()) { say(s, "Noch kein Baunachweis."); return true; }
            for (var x : rank.subList(0, Math.min(10, rank.size()))) say(s, v.name(x.getKey()) + ": " + x.getValue() + " gesetzt, " + v.broken.getOrDefault(x.getKey(), 0L) + " abgebaut");
            for (TeamLog.Section sec : team.ordered()) {
                long n = v.sectionPlaced.getOrDefault(sec.id(), 0L);
                if (n > 0) say(s, sec.number() + ". " + sec.name() + ": " + n + " Blöcke · " + v.sectionBuilders.getOrDefault(sec.id(), Map.of()).entrySet().stream()
                        .sorted(Map.Entry.<String, Long>comparingByValue().reversed()).map(x -> v.name(x.getKey()) + " " + x.getValue()).collect(Collectors.joining(", ")));
            }
            return true;
        }
        Optional<String> m = memberOf(team, a);
        if (m.isEmpty()) return fail(s, "Du bist nicht im Team.");
        String id = m.get();
        if (v.tallyOff.contains(id)) say(s, "Dein Baunachweis ist aus. /" + label + " nachweis an");
        say(s, v.name(id) + ": " + v.placed.getOrDefault(id, 0L) + " Blöcke gesetzt, " + v.broken.getOrDefault(id, 0L) + " abgebaut.");
        Map<String, Long> in = v.stored.getOrDefault(id, Map.of()), out = v.taken.getOrDefault(id, Map.of());
        if (!in.isEmpty()) say(s, "Ins Lager: " + in.entrySet().stream().map(x -> x.getValue() + " " + x.getKey().replace("minecraft:", "")).collect(Collectors.joining(", ")));
        if (!out.isEmpty()) say(s, "Entnommen: " + out.entrySet().stream().map(x -> x.getValue() + " " + x.getKey().replace("minecraft:", "")).collect(Collectors.joining(", ")));
        return true;
    }

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

    // ------------------------------------------------------------------ Teamkanal (COOP-03, TeamChannel)

    private Runnable changed = () -> { };

    /** Called after every new event and after (re)loading the team files. */
    void onChange(Runnable r) { changed = r == null ? () -> { } : r; }

    java.util.Collection<TeamLog> teamList() { return teams.values(); }

    TeamLog team(String teamId) { return teams.get(teamId); }

    /** The team a player works in (chosen with /bp team wahl, else the one they stand in, else the first); null without teams. */
    TeamLog teamFor(Player p) { return teams.isEmpty() ? null : teamOf(new Actor(p, p.getName(), p.getUniqueId(), false)); }

    TeamLog.View viewOf(TeamLog team) { return view(team); }

    Optional<String> memberFor(TeamLog team, Player p) { return memberOf(team, new Actor(p, p.getName(), p.getUniqueId(), false)); }

    /** Answer to an action from the mod: ok, final (false = try again later) and a text for the player. */
    record ChannelResult(boolean ok, boolean fin, String text) {}

    private static final java.util.Set<String> CHANNEL_KINDS = java.util.Set.of("section.claim", "section.release", "section.done", "section.verify", "section.assign",
            "contribution", "gather.claim", "note.add", "note.resolve",
            "section.handover", "section.accept", "section.decline", "member.away");
    private static final List<String> CHANNEL_FIELDS = List.of("section", "note", "ok", "member", "blocks", "items", "item", "count", "noteId", "text", "tag", "pos", "until");

    /**
     * An action a player sent with the mod over the team channel. The event keeps the id the mod chose (so a
     * resend after a lost answer counts once) but gets the server time, the player's real member id and
     * origin "server"; rights and conflicts are judged by the same fold as the chat commands.
     */
    ChannelResult submitFor(Player p, TeamLog team, JsonObject body) {
        String id = TeamLog.str(body, "id"), kind = TeamLog.str(body, "kind");
        if (id == null || !id.matches("[A-Za-z0-9_-]{4,64}")) return new ChannelResult(false, true, "Ungültige Ereignis-ID.");
        if (team.has(id)) return new ChannelResult(true, true, null);
        if (kind == null || !CHANNEL_KINDS.contains(kind)) return new ChannelResult(false, true, "Diese Teamaktion geht nicht über die Mod: " + kind);
        if (!p.hasPermission("bauplaner.team.use")) return new ChannelResult(false, true, "Dir fehlt das Recht bauplaner.team.use.");
        Actor a = new Actor(p, p.getName(), p.getUniqueId(), false);
        Optional<String> m = kind.equals("note.add") ? ensureMember(team, a).or(() -> memberOf(team, a)) : ensureMember(team, a);
        if (m.isEmpty()) return new ChannelResult(false, true, "Du bist nicht im Team „" + team.name + "“ (neue Spieler treten auf diesem Server nicht selbst bei).");
        String sec = TeamLog.str(body, "section");
        if (sec != null && team.sections.stream().noneMatch(x -> x.id().equals(sec))) return new ChannelResult(false, true, "Diesen Abschnitt kennt der Server nicht (anderer Planstand?).");
        JsonObject e = new JsonObject();
        e.addProperty("id", id);
        e.addProperty("at", team.nextTime());
        e.addProperty("by", m.get());
        e.addProperty("origin", "server");
        e.addProperty("kind", kind);
        for (String f : CHANNEL_FIELDS) if (body.has(f)) e.add(f, body.get(f).deepCopy());
        if (e.has("note") && e.get("note").isJsonPrimitive()) e.addProperty("note", clip(e.get("note").getAsString(), 300));
        if (e.has("text") && e.get("text").isJsonPrimitive()) e.addProperty("text", clip(e.get("text").getAsString(), 500));
        if (TeamLog.GSON.toJson(e).length() > 4096) return new ChannelResult(false, true, "Teamaktion zu groß.");
        TeamLog probe = TeamLog.parse(team.exportJson());
        probe.add(e);
        TeamLog.View pv = probe.view();
        String problem = pv.problems.get(id);
        if (pv.rejectedIds.contains(id) || problem != null && kind.equals("section.claim")) return new ChannelResult(false, true, problem == null ? "Nicht erlaubt." : problem);
        try { write(team, e); }
        catch (IOException ex) { return new ChannelResult(false, false, "Server konnte nicht speichern: " + ex.getMessage()); }
        team.add(e);
        changed.run();
        toUplink(team, e);
        return new ChannelResult(true, true, problem);
    }

    /**
     * A team server file from the planner, handed over by the mod of a leader (POST /v1/team/push). Written next
     * to the other team files and loaded; events of an already known team join its log.
     */
    String importFile(String json) throws IOException {
        TeamLog t = TeamLog.parse(json);
        String safe = t.name.replaceAll("[^A-Za-z0-9ÄÖÜäöüß_-]+", "-").replaceAll("^-+|-+$", "");
        String file = (safe.isEmpty() ? "team" : safe.length() > 40 ? safe.substring(0, 40) : safe) + "-" + t.teamId.replaceFirst("^team_", "").substring(0, Math.min(8, t.teamId.replaceFirst("^team_", "").length())) + ".team.json";
        Path out = dir.resolve(file);
        Path tmp = out.resolveSibling(file + ".tmp");
        Files.writeString(tmp, json, StandardCharsets.UTF_8);
        Files.move(tmp, out, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        return load(null);
    }

    /** Whether a player may hand over plan files for a team: permission or role Bauleitung in it. */
    boolean leads(Player p, TeamLog team) {
        if (p.hasPermission("bauplaner.team.leitung")) return true;
        if (team == null) return false;
        Optional<String> m = memberFor(team, p);
        return m.isPresent() && "leitung".equals(view(team).role(m.get()));
    }
}
