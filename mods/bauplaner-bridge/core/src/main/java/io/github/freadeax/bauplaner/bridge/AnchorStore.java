package io.github.freadeax.bauplaner.bridge;

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
 * Remembers the chosen plan and anchor per world/server ({@code bauplaner/state.properties}).
 * Plain text so a player can read and fix it.
 */
public final class AnchorStore {
    public record Entry(String planFile, String dimension, int[] anchor) {}

    private final Path file;
    private final Properties props = new Properties();

    public AnchorStore(Path file) throws IOException {
        this.file = file;
        if (Files.exists(file)) try (Reader r = Files.newBufferedReader(file, StandardCharsets.UTF_8)) { props.load(r); }
    }

    private static String key(String world) { return world.replaceAll("[^A-Za-z0-9_.-]", "_"); }

    public Optional<Entry> get(String world) {
        String k = key(world), plan = props.getProperty(k + ".plan"), anchor = props.getProperty(k + ".anchor");
        if (plan == null || anchor == null) return Optional.empty();
        String[] p = anchor.split(" ");
        if (p.length != 3) return Optional.empty();
        try {
            return Optional.of(new Entry(plan, props.getProperty(k + ".dimension", "minecraft:overworld"),
                    new int[] { Integer.parseInt(p[0]), Integer.parseInt(p[1]), Integer.parseInt(p[2]) }));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    public void put(String world, Entry e) throws IOException {
        String k = key(world);
        props.setProperty(k + ".plan", e.planFile());
        props.setProperty(k + ".dimension", e.dimension());
        props.setProperty(k + ".anchor", e.anchor()[0] + " " + e.anchor()[1] + " " + e.anchor()[2]);
        Files.createDirectories(file.getParent());
        Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
        try (Writer w = Files.newBufferedWriter(tmp, StandardCharsets.UTF_8)) { props.store(w, "Bauplaner-Brücke: Plan und Anker je Welt/Server"); }
        Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }
}
