package io.github.freadeax.bauplaner.bridge;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;

/**
 * A plan file exported by the website (Sponge Schem v3 with {@code Metadata.Bauplaner}).
 * Only identity and box are needed to record; block data stays in the file for later overlays.
 */
public record Plan(String fileName, String sha256, int dataVersion, String name,
                   String projectId, String revisionId, int revisionNumber,
                   int width, int height, int length, int[] projectMin) {

    /** Same bound as the website's recording reader (SCAN_LIMITS.maxVolume). */
    public static final long MAX_VOLUME = 4_000_000L;
    static final int MAX_UNCOMPRESSED = 64_000_000;

    public long volume() { return (long) width * height * length; }

    public static Plan read(Path file) throws IOException {
        return parse(file.getFileName().toString(), Files.readAllBytes(file));
    }

    public static Plan parse(String fileName, byte[] bytes) {
        var root = Nbt.readGzip(bytes, MAX_UNCOMPRESSED).tag().compound("Wurzel");
        var s = require(root, "Schematic").compound("Schematic");
        if (require(s, "Version").asInt("Version") != 3) throw new BridgeException("Nur Sponge Schematic Version 3 wird unterstützt.");
        int w = require(s, "Width").asUShort("Width"), h = require(s, "Height").asUShort("Height"), l = require(s, "Length").asUShort("Length");
        if (w < 1 || h < 1 || l < 1) throw new BridgeException("Leere Planbox.");
        var meta = s.get("Metadata");
        var b = meta == null ? null : meta.compound("Metadata").get("Bauplaner");
        if (b == null) throw new BridgeException(fileName + " ist keine Plan-Datei aus dem Bauplaner (Metadata.Bauplaner fehlt). Bitte im Tab „Export“ eine Revision exportieren.");
        var bp = b.compound("Bauplaner");
        if (bp.containsKey("Kind")) throw new BridgeException(fileName + " ist eine Spielaufnahme, keine Plan-Datei.");
        if (!bp.containsKey("ProjectMin")) throw new BridgeException(fileName + " stammt aus einer älteren Website-Version ohne ProjectMin. Bitte die Revision neu exportieren.");
        int[] min = bp.get("ProjectMin").asIntArray("Bauplaner.ProjectMin");
        if (min.length != 3) throw new BridgeException("Bauplaner.ProjectMin braucht drei Zahlen.");
        var plan = new Plan(fileName, sha256(bytes), require(s, "DataVersion").asInt("DataVersion"),
                meta.compound("Metadata").containsKey("Name") ? meta.compound("Metadata").get("Name").asString("Name") : fileName,
                require(bp, "ProjectId").asString("ProjectId"), require(bp, "RevisionId").asString("RevisionId"),
                require(bp, "RevisionNumber").asInt("RevisionNumber"), w, h, l, min.clone());
        if (plan.volume() > MAX_VOLUME) throw new BridgeException("Planbox mit " + plan.volume() + " Zellen ist größer als " + MAX_VOLUME + ".");
        return plan;
    }

    private static Nbt.Tag require(Map<String, Nbt.Tag> c, String key) {
        var t = c.get(key);
        if (t == null) throw new BridgeException("Feld " + key + " fehlt.");
        return t;
    }

    static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
