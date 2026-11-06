package io.github.freadeax.bauplaner.bridge.hologram;

import static io.github.freadeax.bauplaner.mod.Lang.t;

import io.github.freadeax.bauplaner.mod.live.SurfaceRuns;
import io.github.freadeax.bauplaner.mod.live.TerrainMemory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.level.levelgen.Heightmap;

/**
 * Geländegedächtnis im Spiel (TERRAIN-04, mod 0.20.0): while the player walks or flies around, the surface of the
 * loaded chunks is remembered a few chunks per second ({@link TerrainMemory}), per world or server, and saved under
 * {@code bauplaner/gelaende/}. The website takes a building site's terrain from it without region files. Only
 * on this computer; nothing goes to the server. {@code /bauplaner gelaende aus} switches it off.
 */
final class TerrainRecorder {
    /** Chunks recorded per run (every {@link #EVERY_TICKS} ticks). */
    static final int PER_RUN = 4;
    static final int EVERY_TICKS = 10;
    /** A remembered chunk is read again after this time when the player is near. */
    static final long REFRESH_MS = 3 * 60_000L;
    static final long SAVE_MS = 60_000L;

    private final Path dir;
    private volatile TerrainMemory memory = new TerrainMemory();
    private String worldKey;
    private boolean enabled;
    private int ticks;
    private long lastSave = System.currentTimeMillis();

    TerrainRecorder(Path root) {
        dir = root.resolve("gelaende");
        enabled = !"false".equals(settings().getProperty("aktiv"));
    }

    TerrainMemory memory() { return memory; }

    boolean enabled() { return enabled; }

    String worldKey() { return worldKey; }

    /** Reads one loaded chunk (game thread); null when the client does not have it. */
    static TerrainMemory.Columns read(ClientLevel level, int cx, int cz) {
        if (!McCompat.loaded(level, cx, cz)) return null;
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        int bottom = level.getMinY();
        List<List<SurfaceRuns.Run>> runs = new ArrayList<>(256);
        String[] biomes = new String[256];
        for (int i = 0; i < 256; i++) {
            int x = cx * 16 + (i & 15), z = cz * 16 + (i >> 4);
            int top = level.getHeight(Heightmap.Types.WORLD_SURFACE, x, z) - 1;
            final int fx = x, fz = z;
            runs.add(top < bottom ? List.of() : SurfaceRuns.scan(new SurfaceRuns.Column() {
                public String id(int y) { return BuiltInRegistries.BLOCK.getKey(level.getBlockState(pos.set(fx, y, fz)).getBlock()).toString(); }
                public boolean solid(int y) { return level.getBlockState(pos.set(fx, y, fz)).canOcclude(); }
            }, top, bottom));
            biomes[i] = level.getBiome(pos.set(x, Math.max(bottom, top), z)).unwrapKey().map(k -> k.identifier().toString()).orElse("minecraft:plains");
        }
        return new TerrainMemory.Columns(runs, biomes);
    }

    /** End of a client tick: switch worlds when needed, record a few chunks near the player, save now and then. */
    void tick(Minecraft mc) {
        ClientLevel level = mc.level;
        if (level == null || mc.player == null) { leave(); return; }
        String key = McCompat.worldKey(mc);
        if (!key.equals(worldKey)) { leave(); worldKey = key; memory = TerrainMemory.load(file()); }
        if (!enabled || ++ticks % EVERY_TICKS != 0) return;
        String dim = McCompat.dimension(level);
        int pcx = mc.player.blockPosition().getX() >> 4, pcz = mc.player.blockPosition().getZ() >> 4;
        int radius = Math.max(2, Math.min(32, mc.options.getEffectiveRenderDistance()));
        long now = System.currentTimeMillis();
        // Nearest never-seen chunks first, then the stalest; only chunks the client has fully loaded.
        List<long[]> todo = new ArrayList<>();
        for (int dx = -radius; dx <= radius; dx++) for (int dz = -radius; dz <= radius; dz++) {
            if (dx * dx + dz * dz > radius * radius) continue;
            long at = memory.seenAt(dim, pcx + dx, pcz + dz);
            if (at >= 0 && now - at < REFRESH_MS) continue;
            long score = (at < 0 ? 0 : 1_000_000L) + dx * dx + dz * dz;
            todo.add(new long[] { score, pcx + dx, pcz + dz });
        }
        todo.sort((a, b) -> Long.compare(a[0], b[0]));
        int done = 0;
        for (long[] t : todo) {
            if (done >= PER_RUN) break;
            TerrainMemory.Columns c = read(level, (int) t[1], (int) t[2]);
            if (c == null) continue;
            memory.put(dim, (int) t[1], (int) t[2], now, c);
            done++;
        }
        if (now - lastSave > SAVE_MS) save();
    }

    /** Leaving a world: save what was seen. */
    void leave() {
        if (worldKey == null) return;
        save();
        worldKey = null;
        memory = new TerrainMemory();
    }

    void save() {
        lastSave = System.currentTimeMillis();
        if (worldKey == null || !memory.dirty()) return;
        try { memory.save(file()); } catch (IOException ignored) { }
    }

    private Path file() { return dir.resolve(TerrainMemory.fileName(worldKey == null ? "welt" : worldKey)); }

    // ------------------------------------------------------------------ /bauplaner gelaende

    String status(Minecraft mc) {
        if (mc.level == null) return t("Keine Welt geladen.", "No world loaded.");
        String dim = McCompat.dimension(mc.level);
        int n = memory.size(dim);
        save();
        long size = 0;
        try { if (worldKey != null && Files.isRegularFile(file())) size = Files.size(file()); } catch (IOException ignored) { }
        return t("Geländegedächtnis " + (enabled ? "an" : "aus") + ": " + n + " Chunks in dieser Dimension (etwa " + (n * 256) + " Spalten), " + memory.total()
                + " insgesamt, Datei " + Math.max(1, (size + 1023) / 1024) + " KB. Die Website übernimmt daraus Gelände für Bauplätze (Reiter „Gelände“).",
                "Terrain memory " + (enabled ? "on" : "off") + ": " + n + " chunks in this dimension (about " + (n * 256) + " columns), " + memory.total()
                + " in total, file " + Math.max(1, (size + 1023) / 1024) + " KB. The website takes terrain for building sites from it (tab “Terrain”).");
    }

    String setEnabled(boolean on) {
        enabled = on;
        Properties p = settings();
        p.setProperty("aktiv", Boolean.toString(on));
        try {
            Files.createDirectories(dir);
            try (var out = Files.newOutputStream(dir.resolve("einstellung.properties"))) { p.store(out, "Build Studio Geländegedächtnis"); }
        } catch (IOException ignored) { }
        return on ? t("Geländegedächtnis an: Die Mod merkt sich das Gelände, das du siehst (nur auf diesem PC).", "Terrain memory on: the mod remembers the terrain you see (only on this PC).") : t("Geländegedächtnis aus. Gemerktes bleibt, bis du „/bauplaner gelaende vergessen“ eingibst.", "Terrain memory off. What is remembered stays until you type “/buildplanner terrain forget”.");
    }

    String forget() {
        memory.clear();
        save();
        return t("Gemerktes Gelände dieser Welt gelöscht.", "Remembered terrain of this world deleted.");
    }

    private Properties settings() {
        Properties p = new Properties();
        try (var in = Files.newInputStream(dir.resolve("einstellung.properties"))) { p.load(in); } catch (IOException ignored) { }
        return p;
    }
}
