package io.github.freadeax.bauplaner.mod.commands;

import io.github.freadeax.bauplaner.mod.commands.CommandCatalog.Entry;
import io.github.freadeax.bauplaner.mod.commands.CommandCatalog.Need;
import io.github.freadeax.bauplaner.mod.commands.CommandCatalog.Side;

/**
 * What the game knows right now, for greying out buttons of the command page (GAME-10).
 *
 * @param plan       a plan is placed (hologram active)
 * @param team       a team state is known (from the planner or the server)
 * @param role       own role in that team (leitung, meister, helfer, gast) or null if unknown
 * @param plugin     the server offers {@code /bp} to this player (command tree from the server: plugin installed and bauplaner.use)
 * @param container  the player looks at a container block within reach (chest, barrel, shulker box …)
 */
public record CommandContext(boolean plan, boolean team, String role, boolean plugin, boolean container) {

    /** Null if the button can be used, otherwise why not (German, for the tooltip and the greyed label). */
    public String blocked(Entry e) {
        if (e.side() == Side.SERVER && !plugin) return Need.PLUGIN.reason;
        return switch (e.need()) {
            case NONE, PLUGIN -> null;
            case PLAN -> plan ? null : Need.PLAN.reason;
            case TEAM -> team ? null : Need.TEAM.reason;
            // Unknown role (no team state in the mod): let the server decide, it answers with its own reason.
            case LEAD -> role == null || role.equals("leitung") ? null : Need.LEAD.reason;
            case CHEST -> container ? null : Need.CHEST.reason;
        };
    }
}
