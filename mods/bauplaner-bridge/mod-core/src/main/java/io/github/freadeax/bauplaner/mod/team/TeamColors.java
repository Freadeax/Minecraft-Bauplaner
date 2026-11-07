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

    /**
     * TEAM-03: colours of the Mitbauer of a section, in the order they joined (the owner's colour is the outer
     * frame). Empty for free sections. A Mitbauer with the owner's colour gets the next palette colour, so every
     * frame stays visible.
     */
    public static int[] ofCrew(TeamState team, TeamState.Section s) {
        if (s.owner() == null || "frei".equals(s.status()) || s.crew().isEmpty()) return new int[0];
        int[] out = new int[s.crew().size()];
        int owner = team.colorOf(s.owner());
        for (int i = 0; i < out.length; i++) {
            int c = team.colorOf(s.crew().get(i));
            if (c == owner) c = next(c);
            out[i] = c;
        }
        return out;
    }

    private static int next(int c) {
        for (int i = 0; i < PALETTE.length; i++) if (PALETTE[i] == c) return PALETTE[(i + 1) % PALETTE.length];
        return PALETTE[0];
    }

    /** Gap between the owner frame and the first Mitbauer frame, and between two Mitbauer frames (blocks). */
    public static final float CREW_STEP = 0.16f;

    /**
     * Box of the {@code slot}-th Mitbauer frame (1 = first) inside a section box [x0,y0,z0,x1,y1,z1] (inclusive
     * blocks), as float corners {x0,y0,z0,x1,y1,z1}: each frame sits {@link #CREW_STEP} further inside. Null when
     * the box is too thin for that frame (it would turn inside out).
     */
    public static float[] crewInset(int[] b, int slot) {
        float d = slot * CREW_STEP - 0.08f;
        float[] q = { b[0] + d, b[1] + d, b[2] + d, b[3] + 1 - d, b[4] + 1 - d, b[5] + 1 - d };
        return q[3] - q[0] < 0.1f || q[4] - q[1] < 0.1f || q[5] - q[2] < 0.1f ? null : q;
    }

    /** Same colour with another alpha (0–255). */
    public static int alpha(int argb, int alpha) { return (alpha & 0xFF) << 24 | (argb & 0xFFFFFF); }
}
