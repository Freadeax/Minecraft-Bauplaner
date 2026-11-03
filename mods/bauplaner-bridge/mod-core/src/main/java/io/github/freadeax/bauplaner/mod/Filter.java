package io.github.freadeax.bauplaner.mod;

import java.util.Collection;

/**
 * What part of a placed plan the player works on: world heights {@code minY..maxY} (layer mode) and one
 * build section from the website (1-based, 0 = all sections), or a set of sections (Teambau, COOP-03:
 * "meine Abschnitte"). Hologram, progress, material list and error finder all use the same filter, so
 * they always agree.
 *
 * @param mask when not null: the sections (bit k = section k, 0–255) the filter keeps; {@code section} is then 0
 */
public record Filter(int minY, int maxY, int section, long[] mask) {
    public static final Filter ALL = new Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, 0);

    public Filter(int minY, int maxY, int section) { this(minY, maxY, section, null); }

    /** Heights plus a set of sections (empty set = nothing). */
    public static Filter sections(int minY, int maxY, Collection<Integer> sections) {
        long[] mask = new long[4];
        for (int s : sections) if (s >= 0 && s <= 255) mask[s >> 6] |= 1L << (s & 63);
        return new Filter(minY, maxY, 0, mask);
    }

    /** Whether cells of section {@code s} (0 = in no section) pass. */
    public boolean keeps(int s) {
        if (mask != null) return s >= 0 && s <= 255 && (mask[s >> 6] >>> (s & 63) & 1) != 0;
        return section == 0 || s == section;
    }

    /** Whether the filter keeps every section (no single section, no set). */
    public boolean allSections() { return mask == null && section == 0; }

    /** Whether planned block {@code i} of {@code check} is inside the filter. */
    public boolean test(LiveCheck check, int i) {
        int y = check.worldY(i);
        return y >= minY && y <= maxY && keeps(check.plan().section(i));
    }

    /** Heights only (section ignored), e.g. for hiding faces between ghost blocks of the same layer. */
    public boolean inHeight(int y) { return y >= minY && y <= maxY; }
}
