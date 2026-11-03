package io.github.freadeax.bauplaner.mod;

import io.github.freadeax.bauplaner.bridge.BridgeException;
import io.github.freadeax.bauplaner.bridge.Nbt;
import io.github.freadeax.bauplaner.bridge.Plan;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * A plan exported by the website with all its blocks. Air cells are "nothing to build"; the
 * hologram and the live check only look at planned blocks. Positions are project coordinates
 * (Bauplaner.ProjectMin + index), the same as in the website's editor.
 *
 * <p>Big builds (SIZE-01, mod 0.9.0): a plan box may hold 16.7 million cells and up to
 * {@link #MAX_BLOCKS} planned blocks. A block costs 6 bytes here (box index + palette index) plus one
 * byte for its build section when the plan has sections; the file is unpacked only once.
 */
public final class PlanModel {
    /** Most planned blocks (non-air cells) one plan may have; same as the website's model limit. */
    public static final int MAX_BLOCKS = 4_000_000;

    private final Plan plan;
    private final BlockState[] palette;
    /** Per planned block: linear box index x + z·W + y·W·L (Sponge order, box ≤ 2^24 so it fits an int). */
    private final int[] index;
    /** Per planned block: palette index. */
    private final char[] state;
    /** Build section names from the website, in build order (empty when the plan has none). */
    private final List<String> sectionNames;
    /** Per planned block: 1-based section number, 0 = in no section; null when the plan has no sections. */
    private final byte[] sections;
    /** Website ids of the sections (site.sections[].id, same order as the names; COOP-03), empty when the file has none. */
    private List<String> sectionIds = List.of();
    /** Team of the project (site.team.teamId) when the plan was exported from a team project; null otherwise. */
    private String teamId;

    private PlanModel(Plan plan, BlockState[] palette, int[] index, char[] state, List<String> sectionNames, byte[] sections) {
        this.plan = plan;
        this.palette = palette;
        this.index = index;
        this.state = state;
        this.sectionNames = sectionNames;
        this.sections = sections;
    }

    public static PlanModel read(Path file) throws IOException {
        return parse(file.getFileName().toString(), Files.readAllBytes(file));
    }

    public static PlanModel parse(String fileName, byte[] bytes) {
        Nbt.Root decoded = Nbt.readGzip(bytes, Plan.MAX_UNCOMPRESSED);
        Plan plan = Plan.parse(fileName, bytes, decoded);
        var s = decoded.tag().compound("Wurzel").get("Schematic").compound("Schematic");
        var blocks = s.get("Blocks");
        if (blocks == null) throw new BridgeException("Blocks fehlt.");
        var b = blocks.compound("Blocks");
        var paletteTag = b.get("Palette");
        var dataTag = b.get("Data");
        if (paletteTag == null || dataTag == null) throw new BridgeException("Blocks.Palette oder Blocks.Data fehlt.");
        var paletteMap = paletteTag.compound("Palette");
        if (paletteMap.size() > 65_536) throw new BridgeException("Blocks.Palette hat mehr als 65 536 Einträge.");
        BlockState[] palette = new BlockState[paletteMap.size()];
        paletteMap.forEach((k, v) -> {
            int i = v.asInt("Palette." + k);
            if (i < 0 || i >= palette.length || palette[i] != null) throw new BridgeException("Palette-Index " + i + " ungültig.");
            palette[i] = BlockState.parse(k);
        });
        boolean[] air = new boolean[palette.length];
        for (int i = 0; i < palette.length; i++) air[i] = palette[i].isAir();
        byte[] data = dataTag.asBytes("Blocks.Data");
        long volume = plan.volume();
        // Optional build sections: website 0.7.0+ writes one byte per box cell (SectionCells), SIZE-01 adds
        // run lengths (SectionRuns: count, section, count, section …), which stay small for any box size.
        List<String> names = List.of();
        byte[] sectionOf = null;
        int[] runs = null;
        var meta = s.get("Metadata");
        var bp = meta == null ? null : meta.compound("Metadata").get("Bauplaner");
        var b2 = bp == null ? null : bp.compound("Bauplaner");
        if (b2 != null && b2.containsKey("SectionNames") && (b2.containsKey("SectionRuns") || b2.containsKey("SectionCells"))) {
            var list = b2.get("SectionNames");
            if (list.type() != Nbt.LIST) throw new BridgeException("Bauplaner.SectionNames ist keine Liste.");
            List<String> n = new ArrayList<>();
            for (var t : ((Nbt.NbtList) list.value()).values()) n.add(t.asString("Bauplaner.SectionNames"));
            if (n.size() > 255) throw new BridgeException("Bauplaner.SectionNames nennt mehr als 255 Abschnitte.");
            if (b2.containsKey("SectionRuns")) {
                runs = b2.get("SectionRuns").asIntArray("Bauplaner.SectionRuns");
                if (runs.length % 2 != 0) throw new BridgeException("Bauplaner.SectionRuns braucht Paare aus Anzahl und Abschnitt.");
                long total = 0;
                for (int k = 0; k < runs.length; k += 2) {
                    if (runs[k] < 1 || runs[k + 1] < 0 || runs[k + 1] > n.size()) throw new BridgeException("Bauplaner.SectionRuns enthält einen ungültigen Lauf.");
                    total += runs[k];
                }
                if (total != volume) throw new BridgeException("Bauplaner.SectionRuns passt nicht zur Planbox.");
            } else {
                sectionOf = b2.get("SectionCells").asBytes("Bauplaner.SectionCells");
                if (sectionOf.length != volume) throw new BridgeException("Bauplaner.SectionCells passt nicht zur Planbox.");
                for (byte v : sectionOf) if ((v & 0xff) > n.size()) throw new BridgeException("Bauplaner.SectionCells nennt einen unbekannten Abschnitt.");
            }
            names = List.copyOf(n);
        }
        boolean withSections = !names.isEmpty();
        int cap = (int) Math.min(MAX_BLOCKS, Math.max(1024, Math.min(volume, data.length)));
        int[] idx = new int[Math.min(cap, 1 << 16)];
        char[] st = new char[idx.length];
        byte[] sec = withSections ? new byte[idx.length] : null;
        int count = 0, pos = 0, run = 0, runLeft = runs == null ? Integer.MAX_VALUE : 0, runValue = 0;
        for (int n = 0; n < volume; n++) {
            int value = 0, shift = 0, b8;
            do {
                if (pos >= data.length) throw new BridgeException("Blocks.Data ist zu kurz.");
                b8 = data[pos++] & 0xff;
                value |= (b8 & 0x7f) << shift;
                shift += 7;
                if (shift > 35) throw new BridgeException("Blocks.Data enthält eine zu lange Zahl.");
            } while ((b8 & 0x80) != 0);
            if (runs != null && runLeft == 0) { runLeft = runs[run]; runValue = runs[run + 1]; run += 2; }
            runLeft--;
            if (value < 0 || value >= palette.length) throw new BridgeException("Palette-Index " + value + " außerhalb der Palette.");
            if (air[value]) continue;
            if (count >= MAX_BLOCKS) throw new BridgeException("Der Plan hat mehr als " + MAX_BLOCKS + " Blöcke. Bitte auf der Website in Teilprojekte oder Bauabschnitte teilen.");
            if (count >= idx.length) {
                int next = (int) Math.min(MAX_BLOCKS, (long) idx.length * 2);
                idx = Arrays.copyOf(idx, next);
                st = Arrays.copyOf(st, next);
                if (sec != null) sec = Arrays.copyOf(sec, next);
            }
            idx[count] = n;
            st[count] = (char) value;
            if (sec != null) sec[count] = runs != null ? (byte) runValue : sectionOf[n];
            count++;
        }
        if (pos != data.length) throw new BridgeException("Blocks.Data ist länger als die Planbox.");
        PlanModel model = new PlanModel(plan, palette, Arrays.copyOf(idx, count), Arrays.copyOf(st, count), names, sec == null ? null : Arrays.copyOf(sec, count));
        // Teambau (COOP-03, website 0.10+): section ids and team id, so team sections match hologram sections by id.
        if (b2 != null && b2.containsKey("SectionIds") && b2.get("SectionIds").type() == Nbt.LIST) {
            List<String> ids = new ArrayList<>();
            for (var t : ((Nbt.NbtList) b2.get("SectionIds").value()).values()) ids.add(t.asString("Bauplaner.SectionIds"));
            if (ids.size() == names.size()) model.sectionIds = List.copyOf(ids);
        }
        if (b2 != null && b2.containsKey("TeamId")) {
            String t = b2.get("TeamId").asString("Bauplaner.TeamId");
            if (!t.isBlank() && t.length() <= 64) model.teamId = t;
        }
        return model;
    }

    public Plan identity() { return plan; }
    public String name() { return plan.name(); }
    public int blockCount() { return index.length; }
    public int x(int i) { return plan.projectMin()[0] + index[i] % plan.width(); }
    public int y(int i) { return plan.projectMin()[1] + index[i] / (plan.width() * plan.length()); }
    public int z(int i) { return plan.projectMin()[2] + (index[i] / plan.width()) % plan.length(); }
    public BlockState state(int i) { return palette[state[i]]; }
    /** Palette index of a planned block (for caches per block state). */
    public int stateIndex(int i) { return state[i]; }
    /** All entries of the file palette, air included; index = {@link #stateIndex}. */
    public BlockState paletteEntry(int k) { return palette[k]; }
    public int paletteSize() { return palette.length; }

    /** Build sections of the plan in build order (from the website's Baustelle tab); empty when none. */
    public List<String> sectionNames() { return sectionNames; }
    /** Website section ids in the order of {@link #sectionNames()}; empty for plans exported before COOP-03. */
    public List<String> sectionIds() { return sectionIds; }
    /** Team id of the project, null when the plan is not from a team project. */
    public String teamId() { return teamId; }
    /** 1-based build section of a planned block, 0 when it is in none. */
    public int section(int i) { return sections == null ? 0 : sections[i] & 0xff; }

    /** Project box of the plan file: min corner and size. */
    public int[] min() { return plan.projectMin().clone(); }
    public int[] size() { return new int[] { plan.width(), plan.height(), plan.length() }; }

    /** Distinct planned states (without air), for material lists and render caches. */
    public List<BlockState> palette() {
        var list = new ArrayList<BlockState>();
        for (BlockState s : palette) if (!s.isAir()) list.add(s);
        return list;
    }
}
