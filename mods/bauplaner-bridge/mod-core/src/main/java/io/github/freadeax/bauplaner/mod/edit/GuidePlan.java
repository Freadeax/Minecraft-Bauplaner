package io.github.freadeax.bauplaner.mod.edit;

import io.github.freadeax.bauplaner.bridge.Nbt;
import io.github.freadeax.bauplaner.mod.BlockState;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Turns the ghosts of the build guides into a plan file (Sponge schematic v3 with Build Studio metadata, like a
 * website export) so the hologram can take over: material list, placement helper, progress and recording. Project
 * coordinate 0/0/0 is the lowest corner of the box; the returned anchor is where it stands in the world.
 */
public final class GuidePlan {
    private GuidePlan() {}

    public record Result(String fileName, byte[] bytes, int[] anchor, int blocks) {}

    public static Result write(String name, Collection<BuildGuides.Target> cells, int dataVersion, Instant at) {
        if (cells.isEmpty()) throw new IllegalArgumentException("Keine Geisterblöcke für einen Plan.");
        int[] min = { Integer.MAX_VALUE, Integer.MAX_VALUE, Integer.MAX_VALUE }, max = { Integer.MIN_VALUE, Integer.MIN_VALUE, Integer.MIN_VALUE };
        for (BuildGuides.Target t : cells) {
            min[0] = Math.min(min[0], t.x()); min[1] = Math.min(min[1], t.y()); min[2] = Math.min(min[2], t.z());
            max[0] = Math.max(max[0], t.x()); max[1] = Math.max(max[1], t.y()); max[2] = Math.max(max[2], t.z());
        }
        int w = max[0] - min[0] + 1, h = max[1] - min[1] + 1, l = max[2] - min[2] + 1;
        long volume = (long) w * h * l;
        if (w > 65535 || h > 65535 || l > 65535 || volume > 16_777_216L) throw new IllegalArgumentException("Die Bauhilfe ist für einen Plan zu groß (" + w + "×" + h + "×" + l + ").");
        int[] cell = new int[(int) volume];
        Map<String, Integer> palette = new LinkedHashMap<>();
        palette.put("minecraft:air", 0);
        for (BuildGuides.Target t : cells) {
            String s = t.state().toString();
            Integer id = palette.get(s);
            if (id == null) { id = palette.size(); palette.put(s, id); }
            cell[(t.x() - min[0]) + (t.z() - min[2]) * w + (t.y() - min[1]) * w * l] = id;
        }
        ByteArrayOutputStream data = new ByteArrayOutputStream();
        for (int v : cell) { while ((v & ~0x7f) != 0) { data.write((v & 0x7f) | 0x80); v >>>= 7; } data.write(v); }
        Map<String, Nbt.Tag> pal = new LinkedHashMap<>();
        palette.forEach((k, v) -> pal.put(k, Nbt.Tag.ofInt(v)));
        Map<String, Nbt.Tag> blocks = new LinkedHashMap<>();
        blocks.put("Palette", Nbt.Tag.ofCompound(pal));
        blocks.put("Data", Nbt.Tag.ofBytes(data.toByteArray()));
        blocks.put("BlockEntities", new Nbt.Tag(Nbt.LIST, new Nbt.NbtList(Nbt.COMPOUND, java.util.List.of())));
        String stamp = Long.toString(at.toEpochMilli(), 36);
        Map<String, Nbt.Tag> b = new LinkedHashMap<>();
        b.put("ProjectId", Nbt.Tag.ofString("spiel-bauhilfe"));
        b.put("RevisionId", Nbt.Tag.ofString("bauhilfe-" + stamp));
        b.put("RevisionNumber", Nbt.Tag.ofInt(1));
        b.put("ProjectMin", Nbt.Tag.ofIntArray(0, 0, 0));
        Map<String, Nbt.Tag> meta = new LinkedHashMap<>();
        meta.put("Name", Nbt.Tag.ofString(name));
        meta.put("Date", new Nbt.Tag(Nbt.LONG, at.toEpochMilli()));
        meta.put("Bauplaner", Nbt.Tag.ofCompound(b));
        Map<String, Nbt.Tag> s = new LinkedHashMap<>();
        s.put("Version", Nbt.Tag.ofInt(3));
        s.put("DataVersion", Nbt.Tag.ofInt(dataVersion));
        s.put("Metadata", Nbt.Tag.ofCompound(meta));
        s.put("Width", Nbt.Tag.ofShort(w));
        s.put("Height", Nbt.Tag.ofShort(h));
        s.put("Length", Nbt.Tag.ofShort(l));
        s.put("Offset", Nbt.Tag.ofIntArray(min[0], min[1], min[2]));
        s.put("Blocks", Nbt.Tag.ofCompound(blocks));
        Map<String, Nbt.Tag> root = new LinkedHashMap<>();
        root.put("Schematic", Nbt.Tag.ofCompound(s));
        byte[] bytes = Nbt.writeGzip(new Nbt.Root("", Nbt.Tag.ofCompound(root)));
        String file = "bauhilfe-" + slug(name) + "-" + stamp + ".schem";
        return new Result(file, bytes, min, cells.size());
    }

    private static String slug(String name) {
        String s = name.toLowerCase(java.util.Locale.ROOT).replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss").replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return s.isEmpty() ? "plan" : s.length() > 30 ? s.substring(0, 30) : s;
    }

    /** Block state text the plan writes (for tests). */
    static String text(BlockState s) { return s.toString(); }
}
