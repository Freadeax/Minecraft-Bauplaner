package io.github.freadeax.bauplaner.bridge;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Records the plan box from a {@link BlockSource} in slices (a fixed cell budget per tick)
 * and writes the recording format {@code bauplaner-scan} v1 (docs/architecture/MOD_BRIDGE.md).
 * Cell order and index match Sponge v3: index = x + z·W + y·W·L.
 */
public final class ScanJob {
    public static final String UNLOADED = "bauplaner:unloaded";
    /** Same character rules as the website's state parser. */
    private static final Pattern STATE = Pattern.compile("^[a-z0-9_.-]+:[a-z0-9_./-]+(\\[[a-z0-9_]+=[a-z0-9_.+-]+(,[a-z0-9_]+=[a-z0-9_.+-]+)*])?$");

    /** Environment details written into the metadata. */
    public record Info(String gameVersion, String modVersion, String loader, String dimension, String source) {}

    private final Plan plan;
    private final int[] anchor;
    private final BlockSource source;
    private final int dataVersion;
    private final Info info;
    private final Map<String, Integer> palette = new LinkedHashMap<>();
    private final ByteArrayOutputStream data = new ByteArrayOutputStream();
    private long next = 0;
    private int unloaded = 0;

    /**
     * @param anchor world position of the project origin 0/0/0
     * @param dataVersion DataVersion of the running game
     */
    public ScanJob(Plan plan, int[] anchor, BlockSource source, int dataVersion, Info info) {
        if (anchor.length != 3) throw new IllegalArgumentException("anchor");
        this.plan = plan;
        this.anchor = anchor.clone();
        this.source = source;
        this.dataVersion = dataVersion;
        this.info = info;
    }

    public long total() { return plan.volume(); }
    public long done() { return next; }
    public boolean finished() { return next >= plan.volume(); }
    public int unloaded() { return unloaded; }

    /** World position of the recording's local 0/0/0 cell. */
    public int[] worldMin() {
        int[] m = plan.projectMin();
        return new int[] { anchor[0] + m[0], anchor[1] + m[1], anchor[2] + m[2] };
    }

    /** Reads up to {@code budget} cells; returns true when the box is complete. */
    public boolean step(int budget) {
        int w = plan.width(), l = plan.length();
        int[] min = worldMin();
        long end = Math.min(plan.volume(), next + Math.max(1, budget));
        for (; next < end; next++) {
            int x = (int) (next % w), z = (int) ((next / w) % l), y = (int) (next / ((long) w * l));
            String state = source.stateAt(min[0] + x, min[1] + y, min[2] + z);
            if (state == null) { state = UNLOADED; unloaded++; }
            else if (!STATE.matcher(state).matches()) throw new BridgeException("Blockzustand nicht im erwarteten Format: " + state);
            Integer id = palette.get(state);
            if (id == null) { id = palette.size(); palette.put(state, id); }
            writeVarInt(id);
        }
        return finished();
    }

    private void writeVarInt(int v) {
        while ((v & ~0x7f) != 0) { data.write((v & 0x7f) | 0x80); v >>>= 7; }
        data.write(v);
    }

    /** GZip-compressed recording; only after {@link #step} reported completion. */
    public byte[] toFile(Instant scannedAt) {
        if (!finished()) throw new IllegalStateException("Aufnahme ist noch nicht vollständig.");
        Map<String, Nbt.Tag> pal = new LinkedHashMap<>();
        palette.forEach((k, v) -> pal.put(k, Nbt.Tag.ofInt(v)));
        Map<String, Nbt.Tag> blocks = new LinkedHashMap<>();
        blocks.put("Palette", Nbt.Tag.ofCompound(pal));
        blocks.put("Data", Nbt.Tag.ofBytes(data.toByteArray()));
        blocks.put("BlockEntities", new Nbt.Tag(Nbt.LIST, new Nbt.NbtList(Nbt.COMPOUND, java.util.List.of())));
        Map<String, Nbt.Tag> b = new LinkedHashMap<>();
        b.put("Kind", Nbt.Tag.ofString("scan"));
        b.put("ScanVersion", Nbt.Tag.ofInt(1));
        b.put("ProjectId", Nbt.Tag.ofString(plan.projectId()));
        b.put("RevisionId", Nbt.Tag.ofString(plan.revisionId()));
        b.put("RevisionNumber", Nbt.Tag.ofInt(plan.revisionNumber()));
        b.put("PlanSha256", Nbt.Tag.ofString(plan.sha256()));
        b.put("ProjectMin", Nbt.Tag.ofIntArray(plan.projectMin().clone()));
        b.put("WorldAnchor", Nbt.Tag.ofIntArray(anchor.clone()));
        b.put("Dimension", Nbt.Tag.ofString(info.dimension()));
        b.put("ScannedAt", Nbt.Tag.ofString(scannedAt.toString()));
        b.put("Source", Nbt.Tag.ofString(info.source()));
        b.put("Unloaded", Nbt.Tag.ofInt(unloaded));
        b.put("GameVersion", Nbt.Tag.ofString(info.gameVersion()));
        b.put("ModVersion", Nbt.Tag.ofString(info.modVersion()));
        b.put("Loader", Nbt.Tag.ofString(info.loader()));
        Map<String, Nbt.Tag> meta = new LinkedHashMap<>();
        meta.put("Name", Nbt.Tag.ofString(plan.name() + " · Aufnahme"));
        meta.put("Date", new Nbt.Tag(Nbt.LONG, scannedAt.toEpochMilli()));
        meta.put("Bauplaner", Nbt.Tag.ofCompound(b));
        Map<String, Nbt.Tag> s = new LinkedHashMap<>();
        s.put("Version", Nbt.Tag.ofInt(3));
        s.put("DataVersion", Nbt.Tag.ofInt(dataVersion));
        s.put("Metadata", Nbt.Tag.ofCompound(meta));
        s.put("Width", Nbt.Tag.ofShort(plan.width()));
        s.put("Height", Nbt.Tag.ofShort(plan.height()));
        s.put("Length", Nbt.Tag.ofShort(plan.length()));
        s.put("Offset", Nbt.Tag.ofIntArray(worldMin()));
        s.put("Blocks", Nbt.Tag.ofCompound(blocks));
        Map<String, Nbt.Tag> root = new LinkedHashMap<>();
        root.put("Schematic", Nbt.Tag.ofCompound(s));
        return Nbt.writeGzip(new Nbt.Root("", Nbt.Tag.ofCompound(root)));
    }

    /** {@code <project>_r<N>_<yyyyMMdd-HHmmss>.schem}, safe on every file system. */
    public static String fileName(Plan plan, Instant at) {
        String base = plan.name().replaceAll(" · Revision \\d+$", "").toLowerCase(java.util.Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (base.isEmpty()) base = "projekt";
        if (base.length() > 40) base = base.substring(0, 40);
        String time = at.toString().substring(0, 19).replace("-", "").replace(":", "").replace("T", "-");
        return base + "_r" + plan.revisionNumber() + "_" + time + ".schem";
    }
}
