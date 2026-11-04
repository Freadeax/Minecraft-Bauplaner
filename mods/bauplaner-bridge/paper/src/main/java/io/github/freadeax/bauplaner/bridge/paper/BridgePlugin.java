package io.github.freadeax.bauplaner.bridge.paper;

import io.github.freadeax.bauplaner.bridge.AnchorStore;
import io.github.freadeax.bauplaner.bridge.BridgeException;
import io.github.freadeax.bauplaner.bridge.Plan;
import io.github.freadeax.bauplaner.bridge.ScanJob;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabExecutor;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

/**
 * Paper/Spigot plugin of the Bauplaner-Brücke. Reads the box of a website plan from the server world
 * and writes the recording ({@code bauplaner-scan} v1, docs/architecture/MOD_BRIDGE.md) that the
 * website imports. Never sets or removes blocks and never generates terrain.
 * <p>
 * Files below {@code plugins/BauplanerBridge/}: {@code plans/} (exported plans), {@code scans/}
 * (recordings), {@code state.properties} (anchor per plan, shared by everyone on the server).
 * Each player (and the console) has an own selected plan; the anchor belongs to the plan.
 */
public final class BridgePlugin extends JavaPlugin implements TabExecutor {
    private static final String PREFIX = ChatColor.GOLD + "[Bauplaner] " + ChatColor.RESET;
    private static final List<String> SUBCOMMANDS = List.of("hilfe", "plaene", "plan", "anker", "scan", "abbrechen", "status");

    private Path root;
    private final Map<String, Plan> selected = new HashMap<>();
    private ServerScan scan;
    private BukkitTask task;
    private TeamModule team;
    private TeamChannel channel;
    private ServerLink link;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        root = getDataFolder().toPath();
        try {
            Files.createDirectories(root.resolve("plans"));
            Files.createDirectories(root.resolve("scans"));
        } catch (IOException e) {
            getLogger().warning("Ordner nicht anlegbar: " + e.getMessage());
        }
        team = new TeamModule(this, root);
        team.enable();
        // Teamkanal für die Bauplaner-Mod (COOP-03): Spieler mit Mod sehen Abschnitte, Inhaber und Meldungen live.
        if (getConfig().getBoolean("team.kanal", true)) { channel = new TeamChannel(this, team); channel.enable(); }
        // Anbindung ohne Befehle (LINK-02): Selbsteinrichtung, Kopplung durch einen OP, Steuerung aus dem Planer.
        link = new ServerLink(this, root);
        link.enable();
        if (channel != null) channel.link(link);
        var command = getCommand("bauplaner");
        if (command != null) { command.setExecutor(this); command.setTabCompleter(this); }
        getLogger().info("Bereit: Minecraft " + PaperCompat.gameVersion() + ", DataVersion " + PaperCompat.dataVersion()
                + ". Pläne in " + root.resolve("plans") + ", Aufnahmen in " + root.resolve("scans") + ".");
    }

    /** Team channel to the Bauplaner mod, null when switched off in the config (for the storage module: broadcastStore). */
    TeamChannel teamChannel() { return channel; }

    /** Server link (LINK-02). */
    ServerLink serverLink() { return link; }

    Path root() { return root; }

    List<String> planNames() { return planFiles().collect(Collectors.toList()); }

    /** Stores the anchor of a plan for everyone (same as /bauplaner anker). */
    void storeAnchor(Plan plan, String dimension, int[] pos) throws IOException {
        anchors().put(anchorKey(plan), new AnchorStore.Entry(plan.fileName(), dimension, pos));
    }

    /** Team module (team logs, rights, facade for the storage module). */
    TeamModule teamModule() { return team; }

    @Override
    public void onDisable() {
        stopScan();
        if (channel != null) channel.disable();
        if (team != null) team.disable();
    }

    // ---------------------------------------------------------------- messages

    private static void say(CommandSender s, String text) { s.sendMessage(PREFIX + text); }
    private static boolean fail(CommandSender s, String text) { s.sendMessage(PREFIX + ChatColor.RED + text); return true; }
    private static String key(CommandSender s) { return s instanceof Player p ? p.getUniqueId().toString() : "konsole"; }

    // ---------------------------------------------------------------- commands

    @Override
    public boolean onCommand(CommandSender s, Command command, String label, String[] args) {
        String sub = args.length == 0 ? "hilfe" : args[0].toLowerCase(Locale.ROOT);
        String[] rest = Arrays.copyOfRange(args, Math.min(1, args.length), args.length);
        if (team.command(s, label, sub, rest)) return true;
        switch (sub) {
            case "plaene": return listPlans(s);
            case "plan": return rest.length == 0 ? fail(s, "/" + label + " plan <datei>") : loadPlan(s, String.join(" ", rest));
            case "anker": return anchor(s, label, rest);
            case "scan": return startScan(s, rest.length > 0 && rest[0].equalsIgnoreCase("geladen"));
            case "abbrechen": return cancel(s);
            case "status": return status(s);
            default: return help(s, label);
        }
    }

    @Override
    public List<String> onTabComplete(CommandSender s, Command command, String label, String[] args) {
        if (args.length == 1) return startsWith(Stream.concat(SUBCOMMANDS.stream(), TeamModule.COMMANDS.stream()), args[0]);
        String sub = args[0].toLowerCase(Locale.ROOT);
        if (TeamModule.COMMANDS.contains(sub)) return startsWith(team.complete(sub, args).stream(), args[args.length - 1]);
        if (sub.equals("plan") && args.length == 2) return startsWith(planFiles(), args[1]);
        if (sub.equals("scan") && args.length == 2) return startsWith(Stream.of("geladen"), args[1]);
        if (sub.equals("anker")) {
            if (args.length == 2) return startsWith(Stream.of("hier", "~"), args[1]);
            if (args.length <= 4) return startsWith(Stream.of("~"), args[args.length - 1]);
            if (args.length == 5) return startsWith(Bukkit.getWorlds().stream().map(PaperCompat::dimension), args[4]);
        }
        return List.of();
    }

    private static List<String> startsWith(Stream<String> values, String prefix) {
        String p = prefix.toLowerCase(Locale.ROOT);
        return values.filter(v -> v.toLowerCase(Locale.ROOT).startsWith(p)).collect(Collectors.toList());
    }

    private boolean help(CommandSender s, String label) {
        say(s, "1) Plan im Tab „Export“ der Website exportieren und nach plugins/BauplanerBridge/plans/ legen (Serververwaltung).");
        say(s, "2) /" + label + " plan <datei>  3) /" + label + " anker hier (angeschauter Block = Projektursprung 0/0/0) oder /" + label + " anker <x> <y> <z> [welt]");
        say(s, "4) /" + label + " scan  (oder „scan geladen“: nur geladene Chunks). Die Aufnahme landet in plugins/BauplanerBridge/scans/ und wird im Tab „Bauen“ importiert.");
        say(s, "Weitere Befehle: plaene, status, abbrechen. Das Plugin verändert die Welt nie.");
        say(s, "Gemeinsam bauen: /" + label + " team (Abschnitte nehmen, fertig melden, Notizen) – /" + label + " team hilfe.");
        return true;
    }

    private Stream<String> planFiles() {
        try (var files = Files.list(root.resolve("plans"))) {
            return files.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(".schem")).sorted().collect(Collectors.toList()).stream();
        } catch (IOException e) {
            return Stream.empty();
        }
    }

    private boolean listPlans(CommandSender s) {
        var names = planFiles().collect(Collectors.toList());
        if (names.isEmpty()) return fail(s, "Keine Pläne in plugins/BauplanerBridge/plans/.");
        names.forEach(n -> say(s, n));
        return true;
    }

    private boolean loadPlan(CommandSender s, String name) {
        Path dir = root.resolve("plans");
        Path file = dir.resolve(name).normalize();
        if (!file.startsWith(dir) || !file.getFileName().toString().endsWith(".schem")) return fail(s, "Ungültiger Dateiname.");
        Plan plan;
        try {
            plan = Plan.read(file);
        } catch (IOException | BridgeException e) {
            return fail(s, "Plan nicht lesbar: " + e.getMessage());
        }
        selected.put(key(s), plan);
        say(s, "Plan geladen: " + plan.name() + " · " + plan.width() + "×" + plan.height() + "×" + plan.length() + " (" + plan.volume() + " Zellen).");
        int dv = PaperCompat.dataVersion();
        if (dv != 0 && plan.dataVersion() != dv) say(s, "Hinweis: Plan für DataVersion " + plan.dataVersion() + ", Server " + dv + ".");
        storedAnchor(plan).ifPresent(e -> say(s, "Gespeicherter Anker: " + e.anchor()[0] + " " + e.anchor()[1] + " " + e.anchor()[2] + " (" + e.dimension() + ")."));
        return true;
    }

    private AnchorStore anchors() throws IOException { return new AnchorStore(root.resolve("state.properties")); }
    private static String anchorKey(Plan plan) { return "plan:" + plan.fileName(); }

    private Optional<AnchorStore.Entry> storedAnchor(Plan plan) {
        try {
            return anchors().get(anchorKey(plan)).filter(e -> e.planFile().equals(plan.fileName()));
        } catch (IOException e) {
            getLogger().warning("Anker nicht lesbar: " + e.getMessage());
            return Optional.empty();
        }
    }

    private boolean anchor(CommandSender s, String label, String[] args) {
        Plan plan = selected.get(key(s));
        if (plan == null) return fail(s, "Zuerst /" + label + " plan <datei>.");
        World world;
        int[] pos;
        if (args.length == 1 && args[0].equalsIgnoreCase("hier")) {
            if (!(s instanceof Player p)) return fail(s, "„anker hier“ geht nur im Spiel; in der Konsole /" + label + " anker <x> <y> <z> [welt].");
            Block b = PaperCompat.targetBlock(p);
            world = b.getWorld();
            pos = new int[] { b.getX(), b.getY(), b.getZ() };
        } else if (args.length == 3 || args.length == 4) {
            Location base = s instanceof Player p ? p.getLocation() : null;
            pos = new int[3];
            for (int i = 0; i < 3; i++) {
                Integer v = coordinate(args[i], base == null ? null : new int[] { base.getBlockX(), base.getBlockY(), base.getBlockZ() }[i]);
                if (v == null) return fail(s, "Koordinate „" + args[i] + "“ ist keine ganze Zahl" + (base == null ? " (~ nur im Spiel)." : "."));
                pos[i] = v;
            }
            if (args.length == 4) {
                world = PaperCompat.findWorld(args[3]);
                if (world == null) return fail(s, "Welt „" + args[3] + "“ nicht gefunden. Vorhanden: "
                        + Bukkit.getWorlds().stream().map(PaperCompat::dimension).collect(Collectors.joining(", ")) + ".");
            } else {
                world = s instanceof Player p ? p.getWorld() : Bukkit.getWorlds().get(0);
            }
        } else {
            return fail(s, "/" + label + " anker hier  oder  /" + label + " anker <x> <y> <z> [welt]");
        }
        String dim = PaperCompat.dimension(world);
        int[] m = plan.projectMin();
        say(s, "Projektursprung 0/0/0 = " + pos[0] + " " + pos[1] + " " + pos[2] + " in " + dim + ". Planbox von "
                + (pos[0] + m[0]) + " " + (pos[1] + m[1]) + " " + (pos[2] + m[2]) + " bis "
                + (pos[0] + m[0] + plan.width() - 1) + " " + (pos[1] + m[1] + plan.height() - 1) + " " + (pos[2] + m[2] + plan.length() - 1) + ".");
        if (pos[1] + m[1] < world.getMinHeight() || pos[1] + m[1] + plan.height() > world.getMaxHeight())
            say(s, ChatColor.YELLOW + "Hinweis: Die Planbox ragt über die Bauhöhe (" + world.getMinHeight() + " bis " + (world.getMaxHeight() - 1) + "); Zellen außerhalb gelten als Luft.");
        try {
            anchors().put(anchorKey(plan), new AnchorStore.Entry(plan.fileName(), dim, pos));
            say(s, "Anker gespeichert; er gilt für alle, die diesen Plan laden.");
        } catch (IOException e) {
            say(s, "Anker nicht gespeichert: " + e.getMessage());
        }
        return true;
    }

    /** Integer or Minecraft-style relative coordinate ({@code ~}, {@code ~-3}); null if invalid. */
    static Integer coordinate(String text, Integer base) {
        try {
            if (text.startsWith("~")) {
                if (base == null) return null;
                return base + (text.length() == 1 ? 0 : Integer.parseInt(text.substring(1)));
            }
            return Integer.parseInt(text);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean startScan(CommandSender s, boolean loadedOnly) {
        Plan plan = selected.get(key(s));
        if (plan == null) return fail(s, "Zuerst /bauplaner plan <datei>.");
        var entry = storedAnchor(plan);
        if (entry.isEmpty()) return fail(s, "Zuerst /bauplaner anker hier (oder anker <x> <y> <z>).");
        if (scan != null) return fail(s, "Es läuft bereits eine Aufnahme (" + scan.plan.fileName() + " von " + scan.ownerName + ", " + scan.percent() + " %). Bitte warten.");
        World world = PaperCompat.findWorld(entry.get().dimension());
        if (world == null) return fail(s, "Die Welt des Ankers (" + entry.get().dimension() + ") ist nicht geladen.");
        boolean load = !loadedOnly && getConfig().getBoolean("chunks-nachladen", true) && s.hasPermission("bauplaner.nachladen");
        int[] anchor = entry.get().anchor();
        int[] m = plan.projectMin();
        long chunkCount = ServerScan.chunkCount(plan, new int[] { anchor[0] + m[0], anchor[1] + m[1], anchor[2] + m[2] });
        int maxChunks = getConfig().getInt("max-chunks", 4096);
        if (load && chunkCount > maxChunks) {
            say(s, ChatColor.YELLOW + "Die Planbox umfasst " + chunkCount + " Chunks (Grenze max-chunks " + maxChunks + "); es werden nur geladene Chunks gelesen.");
            load = false;
        }
        String dim = PaperCompat.dimension(world);
        ScanJob job = new ScanJob(plan, anchor, PaperCompat.serverBlocks(world), PaperCompat.dataVersion(),
                new ScanJob.Info(PaperCompat.gameVersion(), PaperCompat.pluginVersion(this), PaperCompat.loader(), dim, "server"));
        scan = new ServerScan(this, key(s), s.getName(), world, plan, job, load);
        say(s, "Aufnahme gestartet: " + plan.volume() + " Zellen in " + chunkCount + " Chunks"
                + (load ? "; nicht geladene, aber vorhandene Chunks werden nachgeladen." : "; nur bereits geladene Chunks werden gelesen."));
        if (!load && !loadedOnly && !s.hasPermission("bauplaner.nachladen")) say(s, "Zum Nachladen fehlt das Recht bauplaner.nachladen.");
        long budget = Math.max(1, Math.min(50, getConfig().getInt("millisekunden-pro-tick", 8))) * 1_000_000L;
        task = Bukkit.getScheduler().runTaskTimer(this, () -> tick(budget), 1L, 1L);
        return true;
    }

    private void tick(long budget) {
        ServerScan current = scan;
        if (current == null) { stopScan(); return; }
        CommandSender owner = owner(current);
        try {
            if (Bukkit.getWorld(current.world.getUID()) == null) throw new BridgeException("Die Welt wurde entladen.");
            boolean done = current.tick(budget);
            if (owner instanceof Player p) PaperCompat.actionBar(p, "Bauplaner-Aufnahme " + current.percent() + " %");
            if (!done) return;
        } catch (RuntimeException e) {
            stopScan();
            if (owner != null) fail(owner, "Aufnahme fehlgeschlagen: " + e.getMessage());
            getLogger().warning("Aufnahme fehlgeschlagen: " + e);
            return;
        }
        stopScan();
        Instant now = Instant.now();
        byte[] bytes;
        try {
            bytes = current.job.toFile(now);
        } catch (RuntimeException e) {
            if (owner != null) fail(owner, "Aufnahme nicht schreibbar: " + e.getMessage());
            return;
        }
        Path out = root.resolve("scans").resolve(ScanJob.fileName(current.plan, now));
        String summary = (current.job.unloaded() > 0 ? " " + current.job.unloaded() + " Zellen lagen in nicht geladenen oder nie erzeugten Chunks (gelten als „nicht aufgenommen“)." : "")
                + (current.loadedByScan() > 0 ? " " + current.loadedByScan() + " Chunks wurden dafür nachgeladen." : "");
        // Writing can take a moment for large boxes; keep it off the main thread.
        Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
            String result;
            try {
                Files.createDirectories(out.getParent());
                Path tmp = out.resolveSibling(out.getFileName() + ".tmp");
                Files.write(tmp, bytes);
                Files.move(tmp, out, StandardCopyOption.ATOMIC_MOVE);
                result = "Aufnahme gespeichert: plugins/BauplanerBridge/scans/" + out.getFileName() + "." + summary + " Jetzt im Tab „Bauen“ mit „Spielaufnahme importieren“ öffnen.";
            } catch (IOException e) {
                result = ChatColor.RED + "Aufnahme nicht gespeichert: " + e.getMessage();
            }
            String message = result;
            getLogger().info(ChatColor.stripColor(message));
            Bukkit.getScheduler().runTask(this, () -> {
                CommandSender o = owner(current);
                if (o != null && !(o instanceof org.bukkit.command.ConsoleCommandSender)) say(o, message);
            });
        });
    }

    private CommandSender owner(ServerScan s) {
        if (s.owner.equals("konsole")) return Bukkit.getConsoleSender();
        try {
            return Bukkit.getPlayer(java.util.UUID.fromString(s.owner));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private void stopScan() {
        if (task != null) { task.cancel(); task = null; }
        if (scan != null) { scan.close(); scan = null; }
    }

    private boolean cancel(CommandSender s) {
        if (scan == null) return fail(s, "Keine Aufnahme aktiv.");
        if (!scan.owner.equals(key(s)) && !s.hasPermission("bauplaner.abbrechen.alle"))
            return fail(s, "Die laufende Aufnahme gehört " + scan.ownerName + ".");
        CommandSender owner = owner(scan);
        stopScan();
        say(s, "Aufnahme abgebrochen, keine Datei geschrieben.");
        if (owner != null && owner != s) say(owner, "Deine Aufnahme wurde von " + s.getName() + " abgebrochen.");
        return true;
    }

    private boolean status(CommandSender s) {
        Plan plan = selected.get(key(s));
        say(s, plan == null ? "Kein Plan geladen." : "Plan: " + plan.fileName() + " (Revision " + plan.revisionNumber() + ")");
        if (plan != null) {
            var e = storedAnchor(plan);
            say(s, e.isEmpty() ? "Kein Anker." : "Anker: " + e.get().anchor()[0] + " " + e.get().anchor()[1] + " " + e.get().anchor()[2] + " (" + e.get().dimension() + ")");
        }
        if (scan != null) {
            List<String> parts = new ArrayList<>();
            parts.add(scan.plan.fileName() + " von " + scan.ownerName);
            parts.add(scan.preparing() ? "Chunks vorbereiten" : scan.job.done() + " / " + scan.job.total() + " Zellen");
            say(s, "Aufnahme läuft: " + String.join(", ", parts) + " (" + scan.percent() + " %)");
        }
        return true;
    }
}
