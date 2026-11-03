package io.github.freadeax.bauplaner.mod.team;

/**
 * Colours of team members in the game (section frames, HUD). The planner has no colour per member, so
 * every client derives the same colour from the member id: everyone sees Anna in the same colour without
 * any setting. Green is left out of the palette because "frei" (free section) is green.
 */
public final class TeamColors {
    private TeamColors() {}

    /** Free sections. */
    public static final int FREE = 0xFF6BE07B;
    /** Reported, waiting for the check. */
    public static final int REPORTED = 0xFF40E0FF;
    /** Confirmed. */
    public static final int CONFIRMED = 0xFFB0B0B0;
    /** Needs rework. */
    public static final int REWORK = 0xFFFF5A5A;

    /** Well distinguishable, not green, readable on dark and light ground. */
    static final int[] PALETTE = {
            0xFFFF9F1C, 0xFFE056FD, 0xFF4D96FF, 0xFFFFD93D, 0xFFFF6B6B, 0xFF00C2D1, 0xFFB388FF, 0xFFFF8FAB,
            0xFFC0A060, 0xFF7FDBFF, 0xFFFF5E00, 0xFF9B5DE5,
    };

    /** Stable colour of a member id (FNV-1a, so it is the same in every Java version). */
    public static int of(String id) {
        if (id == null) return FREE;
        int h = 0x811C9DC5;
        for (int i = 0; i < id.length(); i++) { h ^= id.charAt(i); h *= 0x01000193; }
        return PALETTE[Math.floorMod(h, PALETTE.length)];
    }

    /** "#rrggbb" → ARGB, null when malformed. */
    public static Integer parse(String hex) {
        if (hex == null || !hex.matches("#[0-9a-fA-F]{6}")) return null;
        return 0xFF000000 | Integer.parseInt(hex.substring(1), 16);
    }

    /** Frame colour of a section: free green, else the owner colour; reported/confirmed/rework override. */
    public static int ofSection(TeamState team, TeamState.Section s) {
        return switch (s.status()) {
            case "frei" -> FREE;
            case "gemeldet" -> REPORTED;
            case "bestaetigt" -> CONFIRMED;
            case "nacharbeit" -> REWORK;
            default -> team.colorOf(s.owner());
        };
    }

    /** Same colour with another alpha (0–255). */
    public static int alpha(int argb, int alpha) { return (alpha & 0xFF) << 24 | (argb & 0xFFFFFF); }
}
