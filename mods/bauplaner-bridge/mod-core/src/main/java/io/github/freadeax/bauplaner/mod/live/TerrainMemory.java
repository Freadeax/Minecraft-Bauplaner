package io.github.freadeax.bauplaner.mod.live;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

/**
 * Geländegedächtnis (TERRAIN-04, mod 0.20.0): the surface of every chunk the client has seen, kept per
 * dimension of one world or server and saved on this computer only. The website reads it with
 * {@code GET /v1/terrain}, so a building site can be taken over as Geländeaufnahme even when the player
 * stands somewhere else, without region files. Columns are stored as {@link SurfaceRuns} (top-down runs of
 * equal blocks) plus the biome at the surface; the website classifies surface and ground itself.
 *
 * <p>Nothing here talks to the server or changes the world. Thread-safe: the game thread records, the link
 * thread answers.
 */
public final class TerrainMemory {
    /** Chunks kept per dimension; the oldest seen are dropped first (≈ 1 770 × 1 770 blocks). */
    public static final int MAX_CHUNKS = 12_288;
    /** Chunks answered per request, same bound as {@code /v1/chunks}. */
    public static final int MAX_PER_REQUEST = LiveLinkServer.MAX_CHUNKS;
    /** Chunk coordinates listed by {@link #knownJson}; a 512 × 512 area needs at most 33 × 33. */
    public static final int MAX_KNOWN = 4_096;
    static final int MAGIC = 0x42504744; // "BPGD"
    static final int FILE_VERSION = 1;

    /** One remembered chunk: runs per column ({@code offsets[c]..offsets[c+1]} pairs of y and block index) and biome index per column. */
    public record Chunk(int x, int z, long at, short[] offsets, int[] runs, short[] biomes) {
        public Chunk {
            if (offsets.length != 257 || biomes.length != 256 || runs.length != 2 * offsets[256]) throw new IllegalArgumentException("Chunk ungültig");
        }
    }

    /** Live read of a loaded chunk: per column the runs (top-down) and the biome id at the surface. */
    public record Columns(List<List<SurfaceRuns.Run>> runs, String[] biomes) {}

    private final List<String> blocks = new ArrayList<>();
    private final Map<String, Integer> blockIndex = new HashMap<>();
    private final List<String> biomes = new ArrayList<>();
    private final Map<String, Integer> biomeIndex = new HashMap<>();
    /** dimension → chunk key → chunk, in access order of recording (oldest first). */
    private final Map<String, LinkedHashMap<Long, Chunk>> dims = new HashMap<>();
    private boolean dirty;

    static long key(int x, int z) { return ((long) x << 32) | (z & 0xffffffffL); }

    private int block(String id) {
        Integer i = blockIndex.get(id);
        if (i == null) { i = blocks.size(); blocks.add(id); blockIndex.put(id, i); }
        return i;
    }

    private int biome(String id) {
        Integer i = biomeIndex.get(id);
        if (i == null) { i = biomes.size(); biomes.add(id); biomeIndex.put(id, i); }
        return i;
    }

    /** Stores what the client sees of a chunk now. */
    public synchronized Chunk put(String dimension, int x, int z, long at, Columns cols) {
        if (cols.runs().size() != 256 || cols.biomes().length != 256) throw new IllegalArgumentException("256 Spalten erwartet");
        short[] offsets = new short[257];
        int n = 0;
        for (int c = 0; c < 256; c++) { offsets[c] = (short) n; n += Math.min(SurfaceRuns.MAX_RUNS, cols.runs().get(c).size()); }
        offsets[256] = (short) n;
        int[] runs = new int[2 * n];
        short[] bio = new short[256];
        int k = 0;
        for (int c = 0; c < 256; c++) {
            List<SurfaceRuns.Run> col = cols.runs().get(c);
            for (int i = 0; i < col.size() && i < SurfaceRuns.MAX_RUNS; i++) { runs[k++] = col.get(i).y(); runs[k++] = block(col.get(i).id()); }
            String b = cols.biomes()[c];
            bio[c] = (short) biome(b == null ? "minecraft:plains" : b);
        }
        Chunk chunk = new Chunk(x, z, at, offsets, runs, bio);
        LinkedHashMap<Long, Chunk> m = dims.computeIfAbsent(dimension, d -> new LinkedHashMap<>());
        m.remove(key(x, z));
        m.put(key(x, z), chunk);
        while (m.size() > MAX_CHUNKS) m.remove(m.keySet().iterator().next());
        dirty = true;
        return chunk;
    }

    public synchronized Chunk get(String dimension, int x, int z) {
        var m = dims.get(dimension);
        return m == null ? null : m.get(key(x, z));
    }

    /** Time of the last recording of a chunk, or -1. */
    public synchronized long seenAt(String dimension, int x, int z) {
        Chunk c = get(dimension, x, z);
        return c == null ? -1 : c.at();
    }

    public synchronized int size(String dimension) { var m = dims.get(dimension); return m == null ? 0 : m.size(); }

    public synchronized int total() { int n = 0; for (var m : dims.values()) n += m.size(); return n; }

    public synchronized boolean dirty() { return dirty; }

    public synchronized void clear() { dims.clear(); blocks.clear(); blockIndex.clear(); biomes.clear(); biomeIndex.clear(); dirty = true; }

    public synchronized String blockId(int i) { return blocks.get(i); }

    public synchronized String biomeId(int i) { return biomes.get(i); }

    // ------------------------------------------------------------------ answers for the website

    /** Reads a loaded chunk; null when the client does not have it. Called on the game thread. */
    public interface LiveReader { Columns read(int x, int z); }

    /**
     * {@code GET /v1/terrain}: per wanted chunk the live surface when the client has it loaded (and remembers it),
     * else the remembered one, else listed as missing. Shape like {@code /v1/chunks} plus {@code at} (ms since
     * epoch), {@code live} and {@code biome} (256 indexes into {@code biomes}).
     */
    public String answer(String dimension, int[][] wanted, long now, LiveReader live) {
        if (wanted.length > MAX_PER_REQUEST) throw new LiveLinkServer.HttpError(400, "Höchstens " + MAX_PER_REQUEST + " Chunks je Anfrage.");
        List<Chunk> found = new ArrayList<>();
        List<Boolean> fresh = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        for (int[] c : wanted) {
            Columns cols = live == null ? null : live.read(c[0], c[1]);
            if (cols != null) { found.add(put(dimension, c[0], c[1], now, cols)); fresh.add(true); continue; }
            Chunk m = get(dimension, c[0], c[1]);
            if (m != null) { found.add(m); fresh.add(false); } else missing.add("[" + c[0] + "," + c[1] + "]");
        }
        synchronized (this) {
            Map<Integer, Integer> ids = new LinkedHashMap<>(), bios = new LinkedHashMap<>();
            StringBuilder out = new StringBuilder("{\"dimension\":").append(Json.quote(dimension)).append(",\"chunks\":[");
            for (int i = 0; i < found.size(); i++) {
                Chunk ch = found.get(i);
                if (i > 0) out.append(',');
                out.append("{\"x\":").append(ch.x()).append(",\"z\":").append(ch.z()).append(",\"at\":").append(ch.at()).append(",\"live\":").append(fresh.get(i)).append(",\"columns\":[");
                for (int c = 0; c < 256; c++) {
                    if (c > 0) out.append(',');
                    out.append('[');
                    for (int r = ch.offsets()[c]; r < ch.offsets()[c + 1]; r++) {
                        if (r > ch.offsets()[c]) out.append(',');
                        int global = ch.runs()[2 * r + 1];
                        Integer local = ids.get(global);
                        if (local == null) { local = ids.size(); ids.put(global, local); }
                        out.append(ch.runs()[2 * r]).append(',').append(local);
                    }
                    out.append(']');
                }
                out.append("],\"biome\":[");
                for (int c = 0; c < 256; c++) {
                    int global = ch.biomes()[c];
                    Integer local = bios.get(global);
                    if (local == null) { local = bios.size(); bios.put(global, local); }
                    if (c > 0) out.append(',');
                    out.append(local);
                }
                out.append("]}");
            }
            out.append("],\"ids\":[");
            boolean first = true;
            for (int g : ids.keySet()) { if (!first) out.append(','); first = false; out.append(Json.quote(blocks.get(g))); }
            out.append("],\"biomes\":[");
            first = true;
            for (int g : bios.keySet()) { if (!first) out.append(','); first = false; out.append(Json.quote(biomes.get(g))); }
            return out.append("],\"missing\":[").append(String.join(",", missing)).append("]}").toString();
        }
    }

    /**
     * {@code GET /v1/terrain/known}: remembered chunks inside a chunk rectangle (inclusive), as {@code [x, z, at]},
     * plus how many chunks the dimension holds. Lets the website show which part of a building site is still missing.
     */
    public synchronized String knownJson(String dimension, int x0, int z0, int x1, int z1) {
        if (x1 < x0 || z1 < z0 || (long) (x1 - x0 + 1) * (z1 - z0 + 1) > MAX_KNOWN)
            throw new LiveLinkServer.HttpError(400, "Bereich ungültig (höchstens " + MAX_KNOWN + " Chunks).");
        StringBuilder out = new StringBuilder("{\"dimension\":").append(Json.quote(dimension)).append(",\"total\":").append(size(dimension)).append(",\"chunks\":[");
        var m = dims.get(dimension);
        boolean first = true;
        if (m != null) for (int x = x0; x <= x1; x++) for (int z = z0; z <= z1; z++) {
            Chunk c = m.get(key(x, z));
            if (c == null) continue;
            if (!first) out.append(',');
            first = false;
            out.append('[').append(x).append(',').append(z).append(',').append(c.at()).append(']');
        }
        return out.append("]}").toString();
    }

    /** Parses {@code a=x0,z0,x1,z1} (chunk coordinates, inclusive). */
    public static int[] area(String value) {
        try {
            String[] p = value == null ? new String[0] : value.split(",");
            if (p.length != 4) throw new NumberFormatException();
            int[] a = new int[4];
            for (int i = 0; i < 4; i++) { a[i] = Integer.parseInt(p[i].trim()); if (Math.abs(a[i]) > 2_000_000) throw new NumberFormatException(); }
            return a;
        } catch (NumberFormatException e) {
            throw new LiveLinkServer.HttpError(400, "Bereich ungültig (a=x0,z0,x1,z1 in Chunks).");
        }
    }

    // ------------------------------------------------------------------ file

    /** Gzip file with both palettes and every dimension; written atomically. */
    public void save(Path file) throws IOException {
        byte[] bytes;
        synchronized (this) {
            ByteArrayOutputStream raw = new ByteArrayOutputStream();
            try (DataOutputStream out = new DataOutputStream(new GZIPOutputStream(raw))) {
                out.writeInt(MAGIC);
                out.writeInt(FILE_VERSION);
                out.writeInt(blocks.size());
                for (String s : blocks) out.writeUTF(s);
                out.writeInt(biomes.size());
                for (String s : biomes) out.writeUTF(s);
                out.writeInt(dims.size());
                for (var e : dims.entrySet()) {
                    out.writeUTF(e.getKey());
                    out.writeInt(e.getValue().size());
                    for (Chunk c : e.getValue().values()) {
                        out.writeInt(c.x()); out.writeInt(c.z()); out.writeLong(c.at());
                        for (short o : c.offsets()) out.writeShort(o);
                        for (int v : c.runs()) out.writeInt(v);
                        for (short b : c.biomes()) out.writeShort(b);
                    }
                }
            }
            bytes = raw.toByteArray();
            dirty = false;
        }
        Files.createDirectories(file.getParent());
        Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
        Files.write(tmp, bytes);
        Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    /** Reads a saved memory; a missing or damaged file gives an empty one (the game simply records anew). */
    public static TerrainMemory load(Path file) {
        TerrainMemory t = new TerrainMemory();
        if (!Files.isRegularFile(file)) return t;
        try (DataInputStream in = new DataInputStream(new GZIPInputStream(new ByteArrayInputStream(Files.readAllBytes(file))))) {
            if (in.readInt() != MAGIC || in.readInt() != FILE_VERSION) return new TerrainMemory();
            int nb = in.readInt();
            if (nb < 0 || nb > 65_535) return new TerrainMemory();
            for (int i = 0; i < nb; i++) t.block(in.readUTF());
            int nbio = in.readInt();
            if (nbio < 0 || nbio > 65_535) return new TerrainMemory();
            for (int i = 0; i < nbio; i++) t.biome(in.readUTF());
            int nd = in.readInt();
            if (nd < 0 || nd > 64) return new TerrainMemory();
            for (int d = 0; d < nd; d++) {
                String dim = in.readUTF();
                int n = in.readInt();
                if (n < 0 || n > MAX_CHUNKS) return new TerrainMemory();
                LinkedHashMap<Long, Chunk> m = new LinkedHashMap<>();
                for (int k = 0; k < n; k++) {
                    int x = in.readInt(), z = in.readInt();
                    long at = in.readLong();
                    short[] off = new short[257];
                    for (int i = 0; i < 257; i++) off[i] = in.readShort();
                    if (off[256] < 0 || off[256] > 256 * SurfaceRuns.MAX_RUNS) return new TerrainMemory();
                    int[] runs = new int[2 * off[256]];
                    for (int i = 0; i < runs.length; i++) runs[i] = in.readInt();
                    short[] bio = new short[256];
                    for (int i = 0; i < 256; i++) bio[i] = in.readShort();
                    for (int i = 1; i < runs.length; i += 2) if (runs[i] < 0 || runs[i] >= nb) return new TerrainMemory();
                    for (short b : bio) if (b < 0 || b >= nbio) return new TerrainMemory();
                    for (int i = 0; i < 256; i++) if (off[i] > off[i + 1] || off[i] < 0) return new TerrainMemory();
                    m.put(key(x, z), new Chunk(x, z, at, off, runs, bio));
                }
                t.dims.put(dim, m);
            }
        } catch (IOException | RuntimeException e) {
            return new TerrainMemory();
        }
        return t;
    }

    /** Safe file name for a world key ("server:host:port", "welt:Name"). */
    public static String fileName(String worldKey) {
        String base = worldKey.toLowerCase(java.util.Locale.ROOT).replaceAll("[^a-z0-9._-]+", "_").replaceAll("^_+|_+$", "");
        if (base.isEmpty()) base = "welt";
        if (base.length() > 80) base = base.substring(0, 80);
        return base + ".bpgd";
    }
}
