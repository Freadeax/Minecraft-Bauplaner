package io.github.freadeax.bauplaner.mod;

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.Properties;

/**
 * Remembers per server or world which plan is placed where ({@code bauplaner/platzierung.properties}).
 * Only on this computer; the server never learns about it.
 */
public final class PlacementStore {
    public record Entry(String planFile, Placement placement, boolean visible) {}

    private final Path file;

    public PlacementStore(Path file) { this.file = file; }

    static String key(String world) { return world.replaceAll("[^A-Za-z0-9_.-]", "_"); }

    public Optional<Entry> get(String world) throws IOException {
        var props = load();
        String k = key(world), plan = props.getProperty(k + ".plan"), at = props.getProperty(k + ".at");
        if (plan == null || at == null) return Optional.empty();
        String[] p = at.split(" ");
        if (p.length != 6) return Optional.empty();
        try {
            var placement = new Placement(p[0], Integer.parseInt(p[1]), Integer.parseInt(p[2]), Integer.parseInt(p[3]), Integer.parseInt(p[4]), Boolean.parseBoolean(p[5]));
            return Optional.of(new Entry(plan, placement, !"false".equals(props.getProperty(k + ".visible"))));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    public void put(String world, Entry e) throws IOException {
        var props = load();
        String k = key(world);
        Placement p = e.placement();
        props.setProperty(k + ".plan", e.planFile());
        props.setProperty(k + ".at", p.dimension() + " " + p.x() + " " + p.y() + " " + p.z() + " " + p.turns() + " " + p.mirror());
        props.setProperty(k + ".visible", Boolean.toString(e.visible()));
        save(props);
    }

    public void remove(String world) throws IOException {
        var props = load();
        String k = key(world);
        props.remove(k + ".plan"); props.remove(k + ".at"); props.remove(k + ".visible");
        save(props);
    }

    private Properties load() throws IOException {
        var props = new Properties();
        if (Files.exists(file)) try (Reader r = Files.newBufferedReader(file, StandardCharsets.UTF_8)) { props.load(r); }
        return props;
    }

    private void save(Properties props) throws IOException {
        Files.createDirectories(file.getParent());
        Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
        try (Writer w = Files.newBufferedWriter(tmp, StandardCharsets.UTF_8)) { props.store(w, "Build-Studio-Mod: platzierte Pläne je Welt/Server"); }
        Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }
}
