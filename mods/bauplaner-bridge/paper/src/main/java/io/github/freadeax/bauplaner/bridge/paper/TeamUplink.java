package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonObject;

/**
 * Hook for the live team room (TEAM_LIVE.md, in planning): every event the server writes – team
 * commands, team channel, storage chests – passes {@link #sent} once, after it is stored in the
 * {@code .events.jsonl} and folded. Events from the room come back through
 * {@link TeamModule#receive(String, JsonObject)} (main thread), which stores and folds them like local
 * ones but does not hand them to the uplink again. Default: no uplink, nothing leaves the server.
 */
interface TeamUplink {
    /** Called on the main thread; must not block (queue and send asynchronously). */
    void sent(TeamLog team, JsonObject event);

    TeamUplink NONE = (team, event) -> { };
}
