package io.github.freadeax.bauplaner.mod;

/**
 * What part of a placed plan the player works on: world heights {@code minY..maxY} (layer mode) and one
 * build section from the website (1-based, 0 = all sections). Hologram, progress, material list and
 * error finder all use the same filter, so they always agree.
 */
public record Filter(int minY, int maxY, int section) {
    public static final Filter ALL = new Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, 0);

    /** Whether planned block {@code i} of {@code check} is inside the filter. */
    public boolean test(LiveCheck check, int i) {
        int y = check.worldY(i);
        return y >= minY && y <= maxY && (section == 0 || check.plan().section(i) == section);
    }

    /** Heights only (section ignored), e.g. for hiding faces between ghost blocks of the same layer. */
    public boolean inHeight(int y) { return y >= minY && y <= maxY; }
}
