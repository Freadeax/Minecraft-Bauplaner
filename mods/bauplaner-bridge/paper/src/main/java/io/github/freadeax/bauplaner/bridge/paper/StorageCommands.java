package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonObject;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.Particle;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.scheduler.BukkitTask;

/**
 * {@code /bauplaner lager …} for {@link StorageModule} (COOP-04/05): markieren, liste, bedarf, pruefen, zeigen and the
 * commands on one store. Split from the module (PERF-05 O-6/O-8) without changing behaviour; lookups, checks and
 * the team access stay in the module.
 */
final class StorageCommands {
    private final StorageModule mod;

    StorageCommands(StorageModule mod) { this.mod = mod; }

    /** {@code /bauplaner lager …}; {@code player}/{@code uuid} are the acting player (also for the console's „team als“). */
    boolean command(CommandSender s, String player, UUID uuid, boolean console, String label, String[] args) {
        // Acting for a player from the console ("team als") uses the player's team role only.
        boolean admin = console || s instanceof Player && s.hasPermission("bauplaner.lager.verwalten");
        if (!s.hasPermission("bauplaner.lager.use")) return StorageModule.fail(s, "Dir fehlt das Recht bauplaner.lager.use.");
        String sub = args.length == 0 ? "liste" : args[0].toLowerCase(Locale.ROOT);
        List<String> rest = new ArrayList<>(List.of(args).subList(Math.min(1, args.length), args.length));
        if (sub.equals("hilfe") || !StorageModule.SUBCOMMANDS.contains(sub)) return help(s, label);
        if (mod.teams.teams().isEmpty()) return StorageModule.fail(s, "Auf diesem Server ist noch kein Team angelegt (/" + label + " team hilfe).");
        TeamLog team = mod.teams.teamFor(s, player, uuid);
        TeamLog.View v = mod.teams.view(team);
        // "bei <x> <y> <z> [welt]" names a container without looking at it (console, server test).
        Block target = null;
        int bei = rest.indexOf("bei");
        if (bei >= 0 && rest.size() >= bei + 4) {
            Integer x = BridgePlugin.coordinate(rest.get(bei + 1), null), y = BridgePlugin.coordinate(rest.get(bei + 2), null), z = BridgePlugin.coordinate(rest.get(bei + 3), null);
            if (x == null || y == null || z == null) return StorageModule.fail(s, "bei <x> <y> <z> [welt] erwartet ganze Zahlen.");
            World w = null;
            int used = 4;
            if (rest.size() > bei + 4 && PaperCompat.findWorld(rest.get(bei + 4)) != null) { w = PaperCompat.findWorld(rest.get(bei + 4)); used = 5; }
            if (w == null) w = s instanceof Player p ? p.getWorld() : Bukkit.getWorlds().get(0);
            target = w.getBlockAt(x, y, z);
            for (int i = 0; i < used; i++) rest.remove(bei);
        } else if (s instanceof Player p) {
            Block hit = p.getTargetBlockExact(6);
            if (hit != null && StoreWorld.isStoreBlock(hit)) target = hit;
        } else if (rest.size() >= 3 && rest.subList(rest.size() - 3, rest.size()).stream().allMatch(x -> x.matches("-?\\d+"))) {
            // COOP-04 console form: lager setzen <name> <x> <y> <z> (world of the team file).
            int n = rest.size();
            World w = PaperCompat.findWorld(Optional.ofNullable(TeamLog.str(team.header, "dimension")).orElse("minecraft:overworld"));
            if (w == null) w = Bukkit.getWorlds().get(0);
            target = w.getBlockAt(Integer.parseInt(rest.get(n - 3)), Integer.parseInt(rest.get(n - 2)), Integer.parseInt(rest.get(n - 1)));
            rest = new ArrayList<>(rest.subList(0, n - 3));
        }
        StorageModule.Found here = target != null ? mod.find(target) : null;
        String text = String.join(" ", rest).trim();
        Optional<String> me = mod.teams.member(team, player, uuid);
        String by = me.orElse(admin ? team.founder : "");
        // Counts are booked to the member who triggers them (COOP-04: stored/taken from count differences).
        switch (sub) {
            case "markieren", "setzen" -> {
                if (target == null) return StorageModule.fail(s, "Schau auf eine Kiste, ein Fass oder eine Shulkerkiste (höchstens 6 Blöcke) – oder /" + label + " lager markieren bei <x> <y> <z> [name].");
                if (!StoreWorld.isStoreBlock(target)) return StorageModule.fail(s, "Dort steht keine Kiste, kein Fass und keine Shulkerkiste.");
                if (here != null) return StorageModule.fail(s, "Das ist schon das Lager „" + here.store().name + "“ (" + here.team().name + ").");
                if (by.isEmpty()) return StorageModule.fail(s, "Du bist nicht im Team.");
                if (!admin && StoreLedger.rank(v.role(by)) < 2) return StorageModule.fail(s, "Lager markieren dürfen Baumeister und die Bauleitung.");
                String id = TeamLog.newId("chest");
                String name = text.isEmpty() ? "Lager " + (v.stores.stores.size() + 1) : clip(text, 60);
                JsonObject e = team.event(by, "store.chest");
                e.addProperty("chest", id); e.addProperty("name", name);
                e.add("pos", mod.xyz(new int[] { target.getX(), target.getY(), target.getZ() })); e.addProperty("dimension", PaperCompat.dimension(target.getWorld()));
                if (!mod.teams.submit(team, e, s, "Lager „" + name + "“ markiert bei " + target.getX() + " " + target.getY() + " " + target.getZ() + ".")) return true;
                // Section from the position, protection from the server default.
                String dim = PaperCompat.dimension(target.getWorld());
                Block t = target;
                String section = team.sections.stream().filter(sec -> sec.boxes().stream().anyMatch(b -> b.contains(dim, t.getX(), t.getY(), t.getZ()))).map(TeamLog.Section::id).findFirst().orElse(null);
                JsonObject c = team.event(by, "store.config");
                c.addProperty("chest", id);
                if (section != null) c.addProperty("section", section);
                c.addProperty("protection", mod.defaultProtection());
                mod.teams.append(team, c, s);
                StorageModule.say(s, "Zugeordnet: " + mod.sectionLabel(team, section) + " · Schutz „" + mod.defaultProtection() + "“ (" + StoreLedger.describe(mod.defaultProtection()) + "). Ändern mit /" + label + " lager abschnitt|zweck|schutz.");
                mod.check(team, mod.teams.view(team).stores.get(id), true, s, by);
                return true;
            }
            case "liste" -> {
                List<StoreIndex.Store> list = v.stores.stores.values().stream().filter(x -> !x.removed).collect(Collectors.toList());
                if (list.isEmpty()) return StorageModule.fail(s, "Noch kein Lager markiert. /" + label + " lager markieren");
                for (StoreIndex.Store x : list)
                    StorageModule.say(s, x.name + " · " + mod.statusLabel(x) + " · " + mod.sectionLabel(team, x.section) + " · " + x.purpose + " · " + x.pos[0] + " " + x.pos[1] + " " + x.pos[2]
                            + (x.items != null ? " · " + StoreLedger.total(x.items) + " Items" : "") + (!x.deviation.isEmpty() ? ChatColor.RED + " · " + StoreLedger.diffText(x.deviation, 3) : ""));
                TreeMap<String, Long> stock = mod.stock(v, null);
                if (!stock.isEmpty()) StorageModule.say(s, "Bestand: " + stock.entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed()).limit(10)
                        .map(x -> x.getValue() + " " + StoreLedger.shortItem(x.getKey())).collect(Collectors.joining(", ")));
                return true;
            }
            case "bedarf" -> { return needReport(s, team, v, text, label); }
            case "pruefen", "zaehlen" -> {
                if (!text.equals("alle") && target != null && here == null) return StorageModule.fail(s, "Diese Kiste ist kein Lager.");
                TeamLog countTeam = here != null ? here.team() : team;
                Optional<String> m = mod.teams.member(countTeam, player, uuid);
                if (m.isEmpty() && uuid != null) m = mod.teams.join(countTeam, s, player, uuid);
                String countBy = m.orElse(countTeam.founder);
                if (here != null) { mod.check(here.team(), here.store(), true, s, countBy); return true; }
                mod.checkTeam(team, s, countBy);
                return true;
            }
            case "zeigen" -> { return show(s, team, v); }
            default -> { }
        }
        // Everything below works on one store.
        if (here == null) return StorageModule.fail(s, target == null ? "Schau auf ein Lager (höchstens 6 Blöcke) oder nenne es mit bei <x> <y> <z>." : "Diese Kiste ist kein Lager. /" + label + " lager markieren");
        StoreIndex.Store st = here.store();
        team = here.team(); v = mod.teams.view(team);
        me = mod.teams.member(team, player, uuid);
        by = me.orElse(admin ? team.founder : "");
        boolean manager = admin || me.isPresent() && StoreLedger.rank(v.role(me.get())) >= 2;
        switch (sub) {
            case "info" -> {
                StorageModule.say(s, ChatColor.BOLD + st.name + ChatColor.RESET + " · " + mod.statusLabel(st) + " · " + mod.sectionLabel(team, st.section) + " · Zweck " + st.purpose + " · Schutz " + st.protectionOr(mod.defaultProtection())
                        + " (" + StoreLedger.describe(st.protectionOr(mod.defaultProtection())) + ")");
                if (st.items != null) StorageModule.say(s, StoreLedger.total(st.items) + " Items: " + StoreLedger.diffText(st.items, 8).replace("+", "") + (st.partial ? " (gekürzt)" : ""));
                if (!st.deviation.isEmpty()) StorageModule.say(s, ChatColor.RED + "Offene Abweichung: " + StoreLedger.diffText(st.deviation, 8));
                if ("ertrag".equals(st.purpose)) {
                    StorageModule.Yield y = mod.yields.get(st.id);
                    long minutes = st.yieldMinutes + (y == null ? 0 : y.minutes), total = StoreLedger.total(st.yieldIn) + (y == null ? 0 : StoreLedger.total(y.items));
                    StorageModule.say(s, "Ertragskiste" + (st.farm != null ? " der Farm „" + mod.farmName(team, st.farm) + "“" : "") + ": " + total + " Items in " + minutes + " min geladen"
                            + (minutes >= 10 ? " · " + Math.round(total * 60.0 / minutes) + " je Stunde" : ""));
                }
                if (st.sealedBy != null) StorageModule.say(s, "Zuletzt gesiegelt von " + v.name(st.sealedBy) + " (" + st.sealedAt + ").");
                mod.needLine(team, st).ifPresent(line -> StorageModule.say(s, line));
                return true;
            }
            case "siegeln" -> {
                if (!manager) return StorageModule.fail(s, "Siegeln dürfen Baumeister und die Bauleitung.");
                mod.check(team, st, false, null);
                st = mod.teams.view(team).stores.get(st.id);
                JsonObject e = team.event(by, "store.seal");
                e.addProperty("chest", st.id); e.addProperty("sha256", st.items == null ? StoreLedger.sha256(new TreeMap<>()) : StoreLedger.sha256(st.items));
                if (!text.isEmpty()) e.addProperty("note", clip(text, 300));
                return mod.teams.submit(team, e, s, "Lager „" + st.name + "“ gesiegelt: der jetzige Inhalt gilt als richtig" + (!st.deviation.isEmpty() ? " (Abweichung " + StoreLedger.diffText(st.deviation, 4) + " angenommen)." : "."));
            }
            case "entmarkieren", "entfernen" -> {
                if (!manager) return StorageModule.fail(s, "Lager aufheben dürfen Baumeister und die Bauleitung.");
                JsonObject e = team.event(by, "store.chest");
                e.addProperty("chest", st.id); e.addProperty("name", st.name); e.add("pos", mod.xyz(st.pos)); e.addProperty("dimension", st.dimension); e.addProperty("remove", true);
                return mod.teams.submit(team, e, s, "Markierung von „" + st.name + "“ aufgehoben; die Kiste ist wieder eine normale Kiste. Der Verlauf bleibt im Teamprotokoll.");
            }
            case "name", "abschnitt", "zweck", "schutz", "farm" -> {
                if (!manager) return StorageModule.fail(s, "Das dürfen Baumeister und die Bauleitung.");
                if (text.isEmpty()) return StorageModule.fail(s, "/" + label + " lager " + sub + " <wert>");
                JsonObject e = team.event(by, "store.config");
                e.addProperty("chest", st.id);
                String ok;
                switch (sub) {
                    case "name" -> { e.addProperty("name", clip(text, 60)); ok = "Neuer Name: „" + clip(text, 60) + "“."; }
                    case "abschnitt" -> {
                        if (text.equalsIgnoreCase("projekt") || text.equalsIgnoreCase("alle")) { e.addProperty("section", ""); ok = "Lager gilt für das ganze Projekt."; }
                        else {
                            Optional<TeamLog.Section> sec = team.section(text);
                            if (sec.isEmpty()) return StorageModule.fail(s, "Abschnitt „" + text + "“ gibt es nicht.");
                            e.addProperty("section", sec.get().id()); ok = "Lager gehört jetzt zu Abschnitt " + sec.get().number() + " " + sec.get().name() + ".";
                        }
                    }
                    case "farm" -> {
                        if (text.equalsIgnoreCase("keine") || text.equals("-")) { e.addProperty("farm", ""); ok = "Keine Farm mehr verknüpft."; }
                        else {
                            String want = text.replace('_', ' ');
                            Optional<String[]> f = mod.farms(team).stream().filter(x -> x[0].equals(text) || x[1].equalsIgnoreCase(want)).findFirst();
                            if (f.isEmpty()) return StorageModule.fail(s, "Farm „" + text + "“ steht nicht in der Teamdatei (Planer: Reiter „Produktion“, dann Planstand neu an den Server).");
                            e.addProperty("farm", f.get()[0]);
                            if (!"ertrag".equals(st.purpose)) e.addProperty("purpose", "ertrag");
                            ok = "Ertragskiste der Farm „" + f.get()[1] + "“: alles, was hineinkommt, zählt als Ertrag.";
                        }
                    }
                    case "zweck" -> {
                        Optional<String> p = StoreLedger.purpose(text);
                        if (p.isEmpty()) return StorageModule.fail(s, "Zweck vorrat, eingang, ausgabe, rest oder ertrag.");
                        e.addProperty("purpose", p.get()); ok = "Zweck: " + p.get() + ".";
                        if (p.get().equals("eingang") && st.protection == null) e.addProperty("protection", "eingang");
                    }
                    default -> {
                        Optional<String> p = StoreLedger.protection(text);
                        if (p.isEmpty()) return StorageModule.fail(s, "Schutz offen, team, abschnitt, eingang oder gesperrt.");
                        e.addProperty("protection", p.get()); ok = "Schutz „" + p.get() + "“: " + StoreLedger.describe(p.get()) + ".";
                    }
                }
                return mod.teams.submit(team, e, s, ok);
            }
            case "verlauf" -> {
                int n = 8;
                try { if (!text.isEmpty()) n = Math.max(1, Math.min(StoreIndex.RECENT, Integer.parseInt(text))); } catch (NumberFormatException ex) { return StorageModule.fail(s, "/" + label + " lager verlauf [anzahl]"); }
                if (st.recent.isEmpty()) { StorageModule.say(s, "Noch keine Buchungen in „" + st.name + "“."); return true; }
                int i = 0;
                for (StoreIndex.Move m : st.recent) {
                    if (i++ == n) break;
                    TreeMap<String, Long> net = StoreLedger.plus(m.in(), m.out(), -1);
                    StorageModule.say(s, ChatColor.GRAY + m.at().replace('T', ' ').substring(0, Math.min(16, m.at().length())) + ChatColor.RESET + " "
                            + (m.via().equals("trichter") ? "Trichter" : v.name(m.by())) + ": " + StoreLedger.diffText(net, 5));
                }
                return true;
            }
            case "wer" -> {
                if (text.isEmpty()) return StorageModule.fail(s, "/" + label + " lager wer <item>");
                String item = text.toLowerCase(Locale.ROOT).contains(":") ? text.toLowerCase(Locale.ROOT) : "minecraft:" + text.toLowerCase(Locale.ROOT);
                Set<String> who = new HashSet<>(st.in.keySet()); who.addAll(st.out.keySet());
                List<String> lines = new ArrayList<>();
                for (String w : who) {
                    long in = st.in.getOrDefault(w, new TreeMap<>()).getOrDefault(item, 0L), out = st.out.getOrDefault(w, new TreeMap<>()).getOrDefault(item, 0L);
                    if (in != 0 || out != 0) lines.add((w.equals("trichter") ? "Trichter" : v.name(w)) + ": +" + StoreLedger.amount(in) + " / −" + StoreLedger.amount(out));
                }
                if (lines.isEmpty()) { StorageModule.say(s, "Niemand hat " + StoreLedger.shortItem(item) + " in „" + st.name + "“ bewegt."); return true; }
                lines.forEach(l -> StorageModule.say(s, l));
                return true;
            }
            default -> { return help(s, label); }
        }
    }

    private boolean needReport(CommandSender s, TeamLog team, TeamLog.View v, String text, String label) {
        String section = null;
        if (!text.isEmpty() && !text.equalsIgnoreCase("projekt")) {
            Optional<TeamLog.Section> sec = team.section(text);
            if (sec.isEmpty()) return StorageModule.fail(s, "Abschnitt „" + text + "“ gibt es nicht.");
            section = sec.get().id();
        }
        TreeMap<String, Long> need = mod.need(team, section);
        if (need.isEmpty()) return StorageModule.fail(s, "Die Serverdatei enthält keinen Materialbedarf für " + mod.sectionLabel(team, section) + " (im Planer neu als Serverdatei ausgeben).");
        TreeMap<String, Long> have = mod.stock(v, section);
        List<String[]> rows = new ArrayList<>();
        int full = 0;
        for (var e : need.entrySet()) {
            long h = have.getOrDefault(e.getKey(), 0L), miss = e.getValue() - h;
            if (miss <= 0) full++;
            rows.add(new String[] { e.getKey(), String.valueOf(e.getValue()), String.valueOf(h), String.valueOf(Math.max(0, miss)) });
        }
        rows.sort((a, b) -> Long.compare(Long.parseLong(b[3]), Long.parseLong(a[3])));
        StorageModule.say(s, ChatColor.BOLD + "Bedarf " + mod.sectionLabel(team, section) + ChatColor.RESET + ": " + full + " von " + need.size() + " Materialien liegen bereit (gezählte Lager).");
        int shown = 0;
        for (String[] r : rows) {
            if (shown++ == 12) { StorageModule.say(s, "… " + (rows.size() - 12) + " weitere."); break; }
            long miss = Long.parseLong(r[3]);
            StorageModule.say(s, (miss > 0 ? ChatColor.RED : ChatColor.GREEN) + StoreLedger.shortItem(r[0]) + ChatColor.RESET + ": Bedarf " + StoreLedger.amount(Long.parseLong(r[1]))
                    + " · im Lager " + StoreLedger.amount(Long.parseLong(r[2])) + (miss > 0 ? " · fehlt " + StoreLedger.amount(miss) : " · ✓"));
        }
        return true;
    }

    private boolean show(CommandSender s, TeamLog team, TeamLog.View v) {
        if (!(s instanceof Player p)) return StorageModule.fail(s, "Die Markierung ist nur im Spiel sichtbar.");
        String dim = PaperCompat.dimension(p.getWorld());
        Location l = p.getLocation();
        List<StoreIndex.Store> near = v.stores.stores.values().stream().filter(x -> !x.removed && x.dimension.equals(dim)
                && Math.abs(x.pos[0] - l.getBlockX()) <= 48 && Math.abs(x.pos[2] - l.getBlockZ()) <= 48).collect(Collectors.toList());
        if (near.isEmpty()) return StorageModule.fail(s, "Kein Lager in 48 Blöcken Umkreis.");
        StorageModule.say(s, near.size() + " Lager in der Nähe leuchten 20 s: " + near.stream().map(x -> x.name + " (" + ChatColor.stripColor(mod.statusLabel(x)) + ")").collect(Collectors.joining(", ")));
        int[] runs = { 0 };
        BukkitTask[] task = new BukkitTask[1];
        task[0] = Bukkit.getScheduler().runTaskTimer(mod.plugin, () -> {
            if (++runs[0] > 20 || !p.isOnline()) { task[0].cancel(); return; }
            for (StoreIndex.Store x : near) {
                Particle particle = x.deviating() || "fehlt".equals(x.status) ? Particle.FLAME : GOOD;
                try {
                    p.spawnParticle(particle, x.pos[0] + 0.5, x.pos[1] + 1.2, x.pos[2] + 0.5, 6, 0.3, 0.2, 0.3, 0);
                    if (x.pos2 != null) p.spawnParticle(particle, x.pos2[0] + 0.5, x.pos2[1] + 1.2, x.pos2[2] + 0.5, 6, 0.3, 0.2, 0.3, 0);
                } catch (Throwable ex) { task[0].cancel(); }
            }
        }, 0L, 20L);
        return true;
    }

    /** Green sparkle: {@code HAPPY_VILLAGER} since 1.20.5, {@code VILLAGER_HAPPY} before. */
    private static final Particle GOOD = particle("HAPPY_VILLAGER", "VILLAGER_HAPPY", "END_ROD");
    private static Particle particle(String... names) {
        for (String n : names) try { return Particle.valueOf(n); } catch (IllegalArgumentException e) { /* next */ }
        return Particle.FLAME;
    }

    private boolean help(CommandSender s, String label) {
        StorageModule.say(s, "Lager: /" + label + " lager markieren [name] · info · liste · pruefen [alle] · bedarf [nr|projekt] · verlauf [n] · wer <item> · zeigen");
        StorageModule.say(s, "Baumeister: siegeln [notiz] · name <name> · abschnitt <nr|projekt> · zweck <vorrat|eingang|ausgabe|rest|ertrag> · farm <name|keine> · schutz <offen|team|abschnitt|eingang|gesperrt> · entmarkieren");
        StorageModule.say(s, "Das Plugin zählt beim Schließen, bucht Ein- und Ausgaben je Spieler und meldet Abweichungen. Es verändert nie Kisteninhalte.");
        return true;
    }

    List<String> complete(String[] args) {
        // args[0] = "lager"
        if (args.length == 2) return StorageModule.SUBCOMMANDS.subList(0, 16);
        String sub = args[1].toLowerCase(Locale.ROOT);
        if (args.length == 3) return switch (sub) {
            case "zweck" -> StoreLedger.PURPOSES;
            case "schutz" -> StoreLedger.PROTECTIONS;
            case "pruefen" -> List.of("alle");
            case "farm" -> {
                List<String> out = new ArrayList<>(List.of("keine"));
                if (!mod.teams.teams().isEmpty()) mod.farms(mod.teams.teams().iterator().next()).forEach(x -> out.add(x[1].replace(' ', '_')));
                yield out;
            }
            case "abschnitt", "bedarf" -> {
                List<String> out = new ArrayList<>(List.of("projekt"));
                if (!mod.teams.teams().isEmpty()) mod.teams.teams().iterator().next().ordered().forEach(sec -> out.add(String.valueOf(sec.number())));
                yield out;
            }
            default -> List.of();
        };
        return List.of();
    }

    private static String clip(String t, int max) { return t.length() <= max ? t : t.substring(0, max); }
}
