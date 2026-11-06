package io.github.freadeax.bauplaner.mod.live;

import io.github.freadeax.bauplaner.bridge.BlockSource;
import io.github.freadeax.bauplaner.bridge.ScanJob;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Blockgenaue Geländeprüfung ohne Regionsdateien (TERRAIN-04, {@code GET /v1/box}): reads a world box from the
 * blocks the client has loaded, in slices on the game thread like the Baustand. The website feeds the result into
 * the same check as a region-file sample ({@code checkTerrain}). Cells of chunks the client has not loaded are
 * {@link ScanJob#UNLOADED}, never guessed. Read-only.
 *
 * <p>Answer: {@code {dimension, box:[x0,y0,z0,x1,y1,z1] (max exclusive), palette:[states], data: base64 of
 * uint16 LE palette indexes in order x + z·W + y·W·L, unloaded}}.
 */
public final class BoxRead {
    /** Largest box (2 million cells ≈ 4 MB data); the planner checks bigger projects in parts or with region files. */
    public static final long MAX_CELLS = 2_000_000;
    public static final int CELLS_PER_SLICE = PlanScan.CELLS_PER_SLICE;

    private final String dimension;
    private final int[] box;
    private final int w, l, h;
    private final long volume;
    private final BlockSource source;
    private final Map<String, Integer> palette = new LinkedHashMap<>();
    private final byte[] data;
    private long next;
    private int unloaded;

    public BoxRead(String dimension, int[] box, BlockSource source) {
        this.dimension = dimension;
        this.box = box.clone();
        w = box[3] - box[0]; h = box[4] - box[1]; l = box[5] - box[2];
        volume = (long) w * h * l;
        this.source = source;
        data = new byte[(int) (volume * 2)];
    }

    /** Parses {@code b=x0,y0,z0,x1,y1,z1} (max exclusive) and checks the size. */
    public static int[] parse(String value) {
        int[] b = new int[6];
        try {
            String[] p = value == null ? new String[0] : value.split(",");
            if (p.length != 6) throw new NumberFormatException();
            for (int i = 0; i < 6; i++) b[i] = Integer.parseInt(p[i].trim());
        } catch (NumberFormatException e) {
            throw new LiveLinkServer.HttpError(400, "Bereich ungültig (b=x0,y0,z0,x1,y1,z1).");
        }
        for (int i = 0; i < 3; i++) {
            if (b[i + 3] <= b[i]) throw new LiveLinkServer.HttpError(400, "Bereich ist leer.");
            if (Math.abs(b[i]) > 30_000_000 || Math.abs(b[i + 3]) > 30_000_000) throw new LiveLinkServer.HttpError(400, "Bereich liegt außerhalb der Welt.");
        }
        if (b[1] < -2048 || b[4] > 2048) throw new LiveLinkServer.HttpError(400, "Höhe außerhalb der Welt.");
        long v = (long) (b[3] - b[0]) * (b[4] - b[1]) * (b[5] - b[2]);
        if (v > MAX_CELLS) throw new LiveLinkServer.HttpError(413, "Bereich zu groß (" + v + " Zellen, höchstens " + MAX_CELLS + "). Die Website prüft große Projekte mit den Regionsdateien.");
        return b;
    }

    public boolean finished() { return next >= volume; }

    public int unloaded() { return unloaded; }

    /** Reads up to {@code budget} cells; true when the box is complete. */
    public boolean step(int budget) {
        long end = Math.min(volume, next + Math.max(1, budget));
        for (; next < end; next++) {
            int x = (int) (next % w), z = (int) ((next / w) % l), y = (int) (next / ((long) w * l));
            String state = source.stateAt(box[0] + x, box[1] + y, box[2] + z);
            if (state == null) { state = ScanJob.UNLOADED; unloaded++; }
            Integer id = palette.get(state);
            if (id == null) {
                if (palette.size() == 65_535) throw new LiveLinkServer.HttpError(413, "Zu viele verschiedene Blöcke im Bereich.");
                id = palette.size();
                palette.put(state, id);
            }
            int i = (int) next * 2;
            data[i] = (byte) id.intValue();
            data[i + 1] = (byte) (id >>> 8);
        }
        return finished();
    }

    public String json() {
        if (!finished()) throw new IllegalStateException("Bereich nicht fertig gelesen");
        StringBuilder b = new StringBuilder("{\"dimension\":").append(Json.quote(dimension)).append(",\"box\":[");
        for (int i = 0; i < 6; i++) b.append(i > 0 ? "," : "").append(box[i]);
        b.append("],\"palette\":[");
        boolean first = true;
        for (String s : palette.keySet()) { if (!first) b.append(','); first = false; b.append(Json.quote(s)); }
        return b.append("],\"data\":\"").append(Base64.getEncoder().encodeToString(data)).append("\",\"unloaded\":").append(unloaded).append('}').toString();
    }
}
