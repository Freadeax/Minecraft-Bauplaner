package io.github.freadeax.bauplaner.bridge.paper;

/**
 * GAME-06: who may change blocks in a section box (pure, tested in ProtectRulesTest). The mode (aus, hinweis, sperren)
 * only decides what happens with a "no"; the rules are the same in the planner text (TEAMBAU §6).
 */
final class ProtectRules {
    static final String OTHER = "fremd", DONE = "bestaetigt", TEAM_ONLY = "nur-team";

    private ProtectRules() { }

    /**
     * Null when allowed, else the reason: {@link #OTHER} (somebody else builds here), {@link #DONE} (confirmed, only
     * Baumeister and Bauleitung) or {@link #TEAM_ONLY} (free, but only team members from Helfer on).
     * @param member member id of the player in the trusted view, null for players outside the team
     * @param role the member's role (gast for players outside the team)
     */
    static String blocked(String status, String owner, String member, String role, String free) {
        if (TeamLog.rank(role) >= TeamLog.rank("meister")) return null;
        if ("bestaetigt".equals(status)) return DONE;
        boolean taken = owner != null && !"frei".equals(status);
        if (taken) return owner.equals(member) ? null : OTHER;
        if ("team".equals(free) && (member == null || TeamLog.rank(role) < TeamLog.rank("helfer"))) return TEAM_ONLY;
        return null;
    }

    static String text(String why, String owner) {
        return switch (why) {
            case DONE -> "ist bestätigt – ändern nur Baumeister und Bauleitung.";
            case TEAM_ONLY -> "ist noch frei, bauen dürfen hier nur Mitglieder des Teams ab Helfer.";
            default -> "baut " + (owner == null ? "jemand anderes" : owner) + ".";
        };
    }
}
