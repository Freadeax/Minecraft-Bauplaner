package io.github.freadeax.bauplaner.mod;

import io.github.freadeax.bauplaner.mod.live.MarkAreas;
import java.util.Collection;

/**
 * What part of a placed plan the player works on: world heights {@code minY..maxY} (layer mode) and one
 * build section from the website (1-based, 0 = all sections), or a set of sections (Teambau, COOP-03:
 * "meine Abschnitte"), and since 0.19.0 (GAME-07-S11) an area of world columns (a Weltplan group, without
 * hidden groups). Hologram, progress, material list and error finder all use the same filter, so they
 * always agree.
 *
 * @param mask when not null: the sections (bit k = section k, 0–255) the filter keeps; {@code section} is then 0
 * @param area when not null: only planned blocks whose column lies inside
 */
public record Filter(int minY, int maxY, int section, long[] mask, MarkAreas.Area area) {
    public static final Filter ALL = new Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, 0);

    public Filter(int minY, int maxY, int section) { this(minY, maxY, section, null, null); }

    public Filter(int minY, int maxY, int section, long[] mask) { this(minY, maxY, section, mask, null); }

    /** Heights plus a set of sections (empty set = nothing). */
    public static Filter sections(int minY, int maxY, Collection<Integer> sections) {
        long[] mask = new long[4];
        for (int s : sections) if (s >= 0 && s <= 255) mask[s >> 6] |= 1L << (s & 63);
        return new Filter(minY, maxY, 0, mask, null);
    }

    /** The same filter, limited to an area of world columns (null = no limit). */
    public Filter within(MarkAreas.Area a) { return a == null ? this : new Filter(minY, maxY, section, mask, area == null ? a : area.and(a)); }

    /** Whether cells of section {@code s} (0 = in no section) pass. */
    public boolean keeps(int s) {
        if (mask != null) return s >= 0 && s <= 255 && (mask[s >> 6] >>> (s & 63) & 1) != 0;
        return section == 0 || s == section;
    }

    /** Whether the filter keeps every section (no single section, no set). */
    public boolean allSections() { return mask == null && section == 0; }

    /** Whether the filter keeps the whole plan: all sections, all heights, no area. */
    public boolean whole() { return allSections() && area == null && minY == Integer.MIN_VALUE && maxY == Integer.MAX_VALUE; }

    /** Whether planned block {@code i} of {@code check} is inside the filter. */
    public boolean test(LiveCheck check, int i) {
        int y = check.worldY(i);
        return y >= minY && y <= maxY && keeps(check.plan().section(i)) && (area == null || area.contains(check.worldX(i), check.worldZ(i)));
    }

    /** Heights only (section ignored), e.g. for hiding faces between ghost blocks of the same layer. */
    public boolean inHeight(int y) { return y >= minY && y <= maxY; }
}
