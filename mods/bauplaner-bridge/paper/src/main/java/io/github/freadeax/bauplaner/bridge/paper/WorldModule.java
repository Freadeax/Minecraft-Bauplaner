package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.player.PlayerBucketEmptyEvent;
import org.bukkit.event.player.PlayerBucketFillEvent;
import org.bukkit.plugin.java.JavaPlugin;

/**
 * WORLD-SHARE-01: the team's Weltplan on the server, straight from the Team-Raum – no file to download,
 * copy or paste. The planner puts it into the room (document {@code weltplan}), the plugin reads it with
 * its server key whenever a new version is announced and
 * <ul>
 *   <li>writes the markers (projects, sites, paths, zones, points) into BlueMap and Dynmap itself
 *       ({@link MapMarkers}),</li>
 *   <li>optionally protects locked entries: {@code weltplan.sperren} hinweis (chat line) or sperren
 *       (placing, breaking and buckets refused; {@code bauplaner.weltplan.umgehen} exempt), default aus.</li>
 * </ul>
 * The last version per team is kept in {@code team/<teamId>.weltplan.json}, so markers and locks are back
 * right after a restart even before the room answers.
 */
final class WorldModule implements Listener {
    private static final String PREFIX = ChatColor.GOLD + "[Bauplaner] " + ChatColor.RESET;
    static final int MAX_DOC = 4 * 1024 * 1024;

    private final JavaPlugin plugin;
    private final Path dir;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    private final MapMarkers maps;
    private final Map<String, WorldShare> teams = new LinkedHashMap<>();
    private final Map<String, Integer> revs = new HashMap<>();
    private final Map<UUID, Long> lastHint = new HashMap<>();

    WorldModule(JavaPlugin plugin, Path teamDir) {
        this.plugin = plugin;
        this.dir = teamDir;
        this.maps = new MapMarkers(plugin.getLogger());
    }

    void enable() {
        plugin.getServer().getPluginManager().registerEvents(this, plugin);
        maps.enable();
        try (Stream<Path> files = Files.list(dir)) {
            for (Path f : files.filter(x -> x.getFileName().toString().endsWith(".weltplan.json")).sorted().collect(Collectors.toList())) {
                String teamId = f.getFileName().toString().replaceFirst("\\.weltplan\\.json$", "");
                try {
                    JsonObject j = JsonParser.parseString(Files.readString(f, StandardCharsets.UTF_8)).getAsJsonObject();
                    teams.put(teamId, WorldShare.parse(j.getAsJsonObject("doc").toString()));
                    revs.put(teamId, j.get("rev").getAsInt());
                } catch (IOException | RuntimeException e) { plugin.getLogger().warning("Weltplan " + f.getFileName() + " nicht lesbar: " + e.getMessage()); }
            }
        } catch (IOException ignored) { /* no team folder yet */ }
        if (!teams.isEmpty()) maps.write(WorldShare.combine(teams));
    }

    String mode() {
        String m = plugin.getConfig().getString("weltplan.sperren", "aus").toLowerCase(Locale.ROOT);
        return m.equals("sperren") || m.equals("hinweis") ? m : "aus";
    }

    // ------------------------------------------------------------------ from the Team-Raum (RoomLink)

    /** After the room's welcome: {@code docs} holds the revision of each shared document. */
    void welcome(String teamId, String base, String rid, String key, JsonObject docs) {
        if (teamId == null) return;
        int rev = docs != null && docs.has("weltplan") ? docs.get("weltplan").getAsInt() : 0;
        if (rev > 0 && rev != revs.getOrDefault(teamId, 0)) fetch(teamId, base, rid, key);
    }

    /** The room announced a new version ({@code {type: doc, name, rev}}). */
    void announced(String teamId, String base, String rid, String key, JsonObject m) {
        if (teamId == null || !"weltplan".equals(TeamLog.str(m, "name"))) return;
        int rev = m.has("rev") ? m.get("rev").getAsInt() : -1;
        if (rev != revs.getOrDefault(teamId, 0)) fetch(teamId, base, rid, key);
    }

    private void fetch(String teamId, String base, String rid, String key) {
        int known = revs.getOrDefault(teamId, 0);
        HttpRequest req = HttpRequest.newBuilder(URI.create(base + "/v1/rooms/" + rid + "/doc/weltplan" + (known > 0 ? "?known=" + known : "")))
                .timeout(Duration.ofSeconds(30)).header("Authorization", "Bearer " + key).header("Accept", "application/json").GET().build();
        http.sendAsync(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).whenComplete((res, ex) -> {
            if (ex != null || res.statusCode() != 200 || res.body().length() > MAX_DOC) {
                if (ex != null || res.statusCode() != 404) plugin.getLogger().warning("Weltplan aus dem Team-Raum nicht geholt: " + (ex != null ? ex.getMessage() : "Antwort " + res.statusCode()));
                return;
            }
            JsonObject answer;
            WorldShare share;
            try {
                answer = JsonParser.parseString(res.body()).getAsJsonObject();
                if (answer.has("unchanged")) return;
                share = WorldShare.parse(answer.getAsJsonObject("doc").toString());
            } catch (RuntimeException e) { plugin.getLogger().warning("Weltplan aus dem Team-Raum nicht lesbar: " + e.getMessage()); return; }
            int rev = answer.get("rev").getAsInt();
            String text = "{\"rev\":" + rev + ",\"doc\":" + answer.getAsJsonObject("doc") + "}";
            Bukkit.getScheduler().runTask(plugin, () -> apply(teamId, rev, share, text));
        });
    }

    private void apply(String teamId, int rev, WorldShare share, String text) {
        teams.put(teamId, share);
        revs.put(teamId, rev);
        try {
            Path f = dir.resolve(teamId + ".weltplan.json"), tmp = dir.resolve(teamId + ".weltplan.json.tmp");
            Files.writeString(tmp, text, StandardCharsets.UTF_8);
            Files.move(tmp, f, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) { plugin.getLogger().warning("Weltplan nicht gespeichert: " + e.getMessage()); }
        maps.write(WorldShare.combine(teams));
        plugin.getLogger().info("Weltplan des Teams " + teamId + " (Stand " + rev + (share.by.isEmpty() ? "" : ", von " + share.by) + "): " + share.items + " Einträge, "
                + share.shapeCount() + " Marker" + (maps.names().isEmpty() ? "" : " → " + String.join(", ", maps.names())) + ", " + share.lockCount() + " gesperrt.");
    }

    // ------------------------------------------------------------------ protection of locked entries

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent e) { guard(e.getPlayer(), e.getBlock().getLocation(), () -> e.setCancelled(true)); }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent e) { guard(e.getPlayer(), e.getBlock().getLocation(), () -> e.setCancelled(true)); }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBucket(PlayerBucketEmptyEvent e) { guard(e.getPlayer(), e.getBlockClicked().getRelative(e.getBlockFace()).getLocation(), () -> e.setCancelled(true)); }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onFill(PlayerBucketFillEvent e) { guard(e.getPlayer(), e.getBlockClicked().getLocation(), () -> e.setCancelled(true)); }

    /** The locked entry at a block, over all teams; null when free. */
    WorldShare.Lock lockAt(Location l) {
        String dim = PaperCompat.dimension(l.getWorld());
        for (WorldShare t : teams.values()) { WorldShare.Lock hit = t.lockAt(dim, l.getBlockX(), l.getBlockZ()); if (hit != null) return hit; }
        return null;
    }

    private void guard(Player p, Location l, Runnable cancel) {
        String mode = mode();
        if ("aus".equals(mode) || teams.isEmpty()) return;
        WorldShare.Lock hit = lockAt(l);
        if (hit == null || p.hasPermission("bauplaner.weltplan.umgehen")) return;
        boolean block = "sperren".equals(mode);
        if (block) cancel.run();
        long now = System.currentTimeMillis();
        if (now - lastHint.getOrDefault(p.getUniqueId(), 0L) < (block ? 3_000 : 60_000)) return;
        lastHint.put(p.getUniqueId(), now);
        String what = switch (hit.kind()) { case "site" -> "Bauplatz"; case "zone" -> "Zone"; case "path" -> "Weg"; default -> "Eintrag"; };
        p.sendMessage(PREFIX + ChatColor.YELLOW + what + " „" + hit.name() + "“ ist im Weltplan gesperrt."
                + (block ? " Hier kannst du nichts ändern." : " Bitte nur nach Absprache bauen."));
    }

    // ------------------------------------------------------------------ /bauplaner weltplan

    /** GAME-12: English words for {@code /bauplaner weltplan sperren aus|hinweis|sperren} (also {@code worldplan locks off|notice|lock}). */
    static final Map<String, String> WORDS = Map.of("locks", "sperren", "off", "aus", "notice", "hinweis", "lock", "sperren");

    /** Player with a non-German game language gets English answers (GAME-12); the console stays German. */
    private static boolean english(CommandSender s) { return s instanceof Player p && !String.valueOf(p.getLocale()).toLowerCase(Locale.ROOT).startsWith("de"); }

    private static String t(CommandSender s, String de, String en) { return english(s) ? en : de; }

    private static String word(String w) { String l = w.toLowerCase(Locale.ROOT); return WORDS.getOrDefault(l, l); }

    boolean command(CommandSender s, String label, String[] rest) {
        boolean en = english(s);
        String cmd = en ? "worldplan" : "weltplan";
        if (rest.length >= 1 && word(rest[0]).equals("sperren")) {
            if (!s.hasPermission("bauplaner.team.leitung")) { s.sendMessage(PREFIX + ChatColor.RED + t(s, "Das darf nur die Bauleitung (bauplaner.team.leitung).", "Only the team lead may do this (bauplaner.team.leitung).")); return true; }
            String m = rest.length >= 2 ? word(rest[1]) : "";
            if (!List.of("aus", "hinweis", "sperren").contains(m)) {
                s.sendMessage(PREFIX + "/" + label + (en ? " worldplan locks <off|notice|lock> – now: " : " weltplan sperren <aus|hinweis|sperren> – jetzt: ") + mode());
                return true;
            }
            plugin.getConfig().set("weltplan.sperren", m);
            plugin.saveConfig();
            s.sendMessage(PREFIX + t(s, "Gesperrte Weltplan-Einträge: ", "Locked world plan entries: ") + switch (m) {
                case "sperren" -> t(s, "geschützt (Bauen dort verhindert)", "protected (building there is prevented)");
                case "hinweis" -> t(s, "Hinweis im Chat, Bauen erlaubt", "notice in the chat, building allowed");
                default -> t(s, "kein Schutz", "no protection");
            } + ".");
            return true;
        }
        if (teams.isEmpty()) {
            s.sendMessage(PREFIX + t(s, "Noch kein Weltplan aus dem Team-Raum. Im Planer auf der Weltkarte „Weltplan im Team“ wählen; der Server muss mit dem Team-Raum verbunden sein (/" + label + " team).",
                    "No world plan from the team room yet. In the planner choose “World plan in the team” on the world map; the server must be connected to the team room (/" + label + " team)."));
            return true;
        }
        for (Map.Entry<String, WorldShare> t : teams.entrySet()) {
            WorldShare w = t.getValue();
            s.sendMessage(PREFIX + (en ? "World plan " + t.getKey() + " · revision " + revs.getOrDefault(t.getKey(), 0) + (w.by.isEmpty() ? "" : " by " + w.by) + ": " + w.items + " entries, "
                    + w.shapeCount() + " markers, " + w.lockCount() + " locked."
                    : "Weltplan " + t.getKey() + " · Stand " + revs.getOrDefault(t.getKey(), 0) + (w.by.isEmpty() ? "" : " von " + w.by) + ": " + w.items + " Einträge, "
                    + w.shapeCount() + " Marker, " + w.lockCount() + " gesperrt."));
        }
        s.sendMessage(PREFIX + t(s, "Webkarten: ", "Web maps: ") + (maps.names().isEmpty() ? t(s, "keine (BlueMap oder Dynmap installieren, dann zeichnet das Plugin die Marker selbst)", "none (install BlueMap or Dynmap, then the plugin draws the markers itself)") : String.join(", ", maps.names()))
                + t(s, " · Sperren: ", " · locks: ") + mode() + (en ? " (/" + label + " worldplan locks off|notice|lock)." : " (/" + label + " " + cmd + " sperren aus|hinweis|sperren)."));
        return true;
    }
}
