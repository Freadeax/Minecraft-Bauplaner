package io.github.freadeax.bauplaner.mod.room;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import io.github.freadeax.bauplaner.mod.live.Json;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The folded team log in the mod's team-link format (same fields as the planner's POST /v1/team and the
 * plugin's channel state, TeamChannel.state). LINK-07: without a server plugin the mod folds the events from
 * the team room itself, with the same {@link TeamLog} as the plugin.
 */
final class RoomState {
    private RoomState() {}

    static Map<String, Object> of(TeamLog t, TeamLog.View v, String me) {
        JsonObject s = new JsonObject();
        s.addProperty("teamId", t.teamId);
        s.addProperty("name", t.name);
        String dim = TeamLog.str(t.header, "dimension");
        s.addProperty("dimension", dim == null ? "minecraft:overworld" : dim);
        if (v.releaseNumber >= 0) s.addProperty("revision", v.releaseNumber);
        if (v.releaseSummary != null) s.addProperty("revisionSummary", v.releaseSummary.length() > 300 ? v.releaseSummary.substring(0, 300) : v.releaseSummary);
        if (me != null) s.addProperty("me", me);
        JsonArray sections = new JsonArray();
        for (TeamLog.Section sec : t.ordered()) {
            if (sections.size() >= 1000) break;
            TeamLog.SectionState st = v.section(sec.id());
            JsonObject j = new JsonObject();
            j.addProperty("id", sec.id());
            j.addProperty("nr", sec.number());
            j.addProperty("name", sec.name());
            if (st.owner != null) j.addProperty("owner", st.owner);
            // TEAM-03: Mitbauer besides the owner (mod 0.27.0+ shows them; older mods ignore the field).
            if (st.owner != null && !st.crew.isEmpty()) { JsonArray c = new JsonArray(); st.crew.forEach(c::add); j.add("crew", c); }
            j.addProperty("status", st.status);
            JsonArray boxes = new JsonArray();
            for (TeamLog.Box b : sec.boxes()) {
                if (boxes.size() >= 64) break;
                JsonArray a = new JsonArray();
                a.add(b.minX()); a.add(b.minY()); a.add(b.minZ()); a.add(b.maxX()); a.add(b.maxY()); a.add(b.maxZ());
                boxes.add(a);
            }
            j.add("boxes", boxes);
            sections.add(j);
        }
        s.add("sections", sections);
        JsonArray members = new JsonArray();
        Map<String, String> ids = new LinkedHashMap<>(v.names);
        for (String id : v.known) ids.putIfAbsent(id, id);
        for (var e : ids.entrySet()) {
            if (members.size() >= 500) break;
            JsonObject j = new JsonObject();
            j.addProperty("id", e.getKey());
            j.addProperty("name", e.getValue().length() > 60 ? e.getValue().substring(0, 60) : e.getValue());
            String player = v.players.get(e.getKey());
            if (player != null) j.addProperty("player", player);
            j.addProperty("role", v.role(e.getKey()));
            if (v.away.containsKey(e.getKey())) j.addProperty("away", true);
            members.add(j);
        }
        s.add("members", members);
        JsonArray notes = new JsonArray();
        for (TeamLog.NoteState n : v.notes.values()) {
            if (n.resolvedBy != null || notes.size() >= 500) continue;
            JsonObject j = new JsonObject();
            j.addProperty("id", n.id);
            j.addProperty("tag", n.tag == null ? "info" : n.tag);
            j.addProperty("text", n.text == null ? "" : n.text.length() > 500 ? n.text.substring(0, 500) : n.text);
            if (n.by != null) j.addProperty("by", n.by);
            if (n.section != null) j.addProperty("section", n.section);
            if (n.pos != null) { JsonArray a = new JsonArray(); a.add(n.pos[0]); a.add(n.pos[1]); a.add(n.pos[2]); j.add("pos", a); }
            notes.add(j);
        }
        s.add("notes", notes);
        // COOP-05 S04: marked chests with their stock, as the plugin's team channel sends them (StorageModule.storeJson):
        // section, purpose, check status and the plugin's last count. Without a plugin nobody counts, so the newest
        // content a player's mod saw (store.seen, unverified) stands in; "origin" says which one it is.
        JsonArray stores = new JsonArray();
        for (StoreIndex.Store st : v.stores.stores.values()) {
            if (st.removed || st.pos == null) continue;
            if (stores.size() >= 200) break;
            stores.add(store(st, v));
        }
        s.add("stores", stores);
        s.addProperty("at", java.time.Instant.now().toString());
        return Json.obj(Json.parse(TeamLog.GSON.toJson(s)), "Teamstand");
    }

    /** One chest in the game format (TeamState.store): stock from the plugin's count, else from the newest sighting. */
    static JsonObject store(StoreIndex.Store st, TeamLog.View v) {
        JsonObject j = new JsonObject();
        j.addProperty("id", st.id);
        j.addProperty("name", st.name == null ? "Lager" : st.name.length() > 60 ? st.name.substring(0, 60) : st.name);
        if (st.dimension != null) j.addProperty("dimension", st.dimension);
        j.add("pos", xyz(st.pos));
        if (st.pos2 != null) j.add("pos2", xyz(st.pos2));
        if (st.section != null) j.addProperty("section", st.section);
        j.addProperty("purpose", st.purpose);
        j.addProperty("status", st.deviating() && !"fehlt".equals(st.status) ? "abweichend" : st.status);
        if (st.checkedAt != null) j.addProperty("checkedAt", st.checkedAt);
        boolean counted = st.items != null;
        java.util.Map<String, Long> items = counted ? st.items : st.seen != null ? st.seen : java.util.Map.of();
        j.add("items", StoreLedger.json(items));
        if (StoreLedger.truncated(items) || (counted ? st.partial : st.seenPartial)) j.addProperty("more", true);
        if (counted) {
            j.addProperty("origin", "server");
            if (st.countedAt != null) j.addProperty("stockAt", st.countedAt);
        } else if (st.seen != null) {
            j.addProperty("origin", "spiel");
            if (st.seenAt != null) j.addProperty("stockAt", st.seenAt);
            if (st.seenBy != null) { String n = v.name(st.seenBy); j.addProperty("stockBy", n.length() > 60 ? n.substring(0, 60) : n); }
        }
        return j;
    }

    private static JsonArray xyz(int[] p) { JsonArray a = new JsonArray(); a.add(p[0]); a.add(p[1]); a.add(p[2]); return a; }
}
