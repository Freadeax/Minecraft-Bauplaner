package io.github.freadeax.bauplaner.mod.team;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.Filter;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import io.github.freadeax.bauplaner.mod.Materials;
import io.github.freadeax.bauplaner.mod.PlanModel;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Team state meets the placed plan: which hologram section (1-based number in the plan file) is which
 * team section, the progress of each section from the live check, the world box of each section, and
 * the material each member still has to place in their own sections.
 * <p>
 * Matching: by id (plan files from website 0.10+ carry {@code SectionIds}), else by unique name, else by
 * number when both lists have the same names in the same order. A plan of another team or another
 * planning state is reported ({@link #mismatch()}) instead of guessing.
 */
public final class TeamPlan {
    private final TeamState team;
    private final PlanModel plan;
    /** Team section id → plan section number (1-based). */
    private final Map<String, Integer> numberOf = new HashMap<>();
    private final Map<Integer, TeamState.Section> sectionOf = new HashMap<>();
    private final String mismatch;

    public TeamPlan(TeamState team, PlanModel plan) {
        this.team = team;
        this.plan = plan;
        List<String> ids = plan.sectionIds(), names = plan.sectionNames();
        String problem = null;
        if (plan.teamId() != null && !plan.teamId().equals(team.teamId())) problem = "Der eingeblendete Plan gehört zu einem anderen Team.";
        for (TeamState.Section s : team.sections()) {
            int k = ids.indexOf(s.id()) + 1;
            if (k == 0 && ids.isEmpty()) {
                int first = names.indexOf(s.name()), last = names.lastIndexOf(s.name());
                if (first >= 0 && first == last) k = first + 1;
            }
            if (k > 0) { numberOf.put(s.id(), k); sectionOf.put(k, s); }
        }
        if (problem == null && !team.sections().isEmpty() && !names.isEmpty() && numberOf.isEmpty())
            problem = "Die Abschnitte des Plans passen nicht zum Teamstand (anderer Planstand?).";
        mismatch = problem;
    }

    public TeamState team() { return team; }

    /** Why team and plan do not fit, or null. */
    public String mismatch() { return mismatch; }

    /** Plan section number of a team section, 0 when the plan does not have it. */
    public int number(String sectionId) { return numberOf.getOrDefault(sectionId, 0); }

    /** Team section of a plan section number, null when the team does not know it. */
    public TeamState.Section section(int number) { return sectionOf.get(number); }

    /** Plan section numbers of a member's open sections (not confirmed ones). */
    public Set<Integer> numbersOf(String memberId) {
        Set<Integer> out = new LinkedHashSet<>();
        for (TeamState.Section s : team.sections())
            if (memberId != null && memberId.equals(s.owner()) && !"bestaetigt".equals(s.status()) && number(s.id()) > 0) out.add(number(s.id()));
        return out;
    }

    /** Plan section numbers of free sections. */
    public Set<Integer> freeNumbers() {
        Set<Integer> out = new LinkedHashSet<>();
        for (TeamState.Section s : team.sections()) if (s.free() && number(s.id()) > 0) out.add(number(s.id()));
        return out;
    }

    /** Correct and total planned blocks of a section in the live check: {ok, total, open}. */
    public static int[] progress(LiveCheck check, int number) {
        int[] c = check.count(new Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, number));
        int total = 0;
        for (int v : c) total += v;
        int ok = c[Verdict.OK.ordinal()], unknown = c[Verdict.UNKNOWN.ordinal()];
        return new int[] { ok, total, total - ok - unknown };
    }

    /** Percent of a section, 100 when it has no blocks. */
    public static int percent(int[] progress) { return progress[1] == 0 ? 100 : (int) ((long) progress[0] * 100 / progress[1]); }

    /** World boxes of every plan section from the live check (index = section number; null when empty). */
    public static int[][] boxes(LiveCheck check) {
        int n = check.plan().sectionNames().size();
        int[][] out = new int[n + 1][];
        for (int i = 0; i < check.size(); i++) {
            int s = check.plan().section(i);
            if (s <= 0 || s > n) continue;
            int x = check.worldX(i), y = check.worldY(i), z = check.worldZ(i);
            int[] b = out[s];
            if (b == null) out[s] = new int[] { x, y, z, x, y, z };
            else { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.min(b[2], z); b[3] = Math.max(b[3], x); b[4] = Math.max(b[4], y); b[5] = Math.max(b[5], z); }
        }
        return out;
    }

    /** Material line of one member: open in their sections, carried, still to fetch, lying ready in chests. */
    public record Need(String id, int open, int carried, int fetch, int ready) {}

    /**
     * What a member still has to place in their own sections, minus what the player carries ({@code carried}
     * by block id, only for the own player) and with what lies in team chests ({@code ready} by item id).
     */
    public List<Need> needs(LiveCheck check, String memberId, Map<String, Integer> carried, Map<String, Integer> ready) {
        Set<Integer> mine = numbersOf(memberId);
        if (mine.isEmpty()) return List.of();
        List<Need> out = new ArrayList<>();
        for (Materials.Line l : Materials.of(check, Filter.sections(Integer.MIN_VALUE, Integer.MAX_VALUE, mine))) {
            if (l.open() == 0) continue;
            int have = carried.getOrDefault(l.id(), 0);
            out.add(new Need(l.id(), l.open(), have, Math.max(0, l.open() - have), ready.getOrDefault(l.id(), 0)));
        }
        return out;
    }

    /** Items in all checked team chests, by item id (stores of the plugin, COOP-04). */
    public static Map<String, Integer> ready(TeamState team) {
        Map<String, Integer> out = new HashMap<>();
        for (TeamState.Store s : team.stores()) {
            if ("fehlt".equals(s.status())) continue;
            for (TeamState.Item i : s.items()) out.merge(i.item(), i.count(), Integer::sum);
        }
        return out;
    }
}
