package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonObject;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.team.EventSig;
import java.util.Map;
import java.util.Optional;

/**
 * GAME-06 (docs/architecture/team/SIGNED_EVENTS.md): which room events the server lets into its fold.
 * <p>
 * The room checks only the key: everyone with the invitation can write events in anybody's name. That is
 * fine for notes and claims, but the server enforces the section protection with it. So, once the Bauleitung
 * has handed over its signing key ({@code l} in the server link), the plugin takes
 * <ul>
 *   <li>its own events (origin {@code server}, written with the server key only the plugin has),</li>
 *   <li>events with a valid signature of the Bauleitung,</li>
 *   <li>events that did not come from the room (team file put on the server by its admin),</li>
 *   <li>events up to the arrival number the Bauleitung confirmed with a signed {@code team.trust} (the room's past),</li>
 *   <li>other unsigned events, except: in the Bauleitung's name, kinds only the Bauleitung may write
 *       (roles, protection, plan release), and player names when the member or the name is bound already
 *       (first binding wins, so nobody takes over another member's identity on the server).</li>
 * </ul>
 * Without a signing key or before the first {@code team.trust} nothing is filtered (as up to 0.23.0); the status says so.
 * Pure: no Bukkit, tested in {@code EventTrustTest}.
 */
final class EventTrust implements TeamLog.Filter {
    /** Arrival numbers of room events (id → seq), see RoomLink. */
    interface Seqs { Long of(String id); }

    private final String teamId, founder, signKey;
    private final Seqs seqs;
    /** Highest arrival number the Bauleitung confirmed; -1 = none yet (no filtering). */
    final long upTo;

    EventTrust(TeamLog team, String signKey, Seqs seqs) {
        this.teamId = team.teamId; this.founder = team.founder; this.signKey = signKey; this.seqs = seqs;
        long best = -1;
        if (signKey != null) for (JsonObject e : team.events()) {
            if (!"team.trust".equals(TeamLog.str(e, "kind")) || !founder.equals(TeamLog.str(e, "by")) || !signed(e)) continue;
            String n = TeamLog.str(e, "upTo");
            if (n != null && n.matches("\\d{1,15}")) best = Math.max(best, Long.parseLong(n));
        }
        this.upTo = best;
    }

    /** Whether the server checks signatures for this team (key known and the Bauleitung confirmed the past). */
    boolean active() { return signKey != null && upTo >= 0; }

    boolean signed(JsonObject e) {
        if (signKey == null || !e.has("sig")) return false;
        try { return EventSig.verify(signKey, teamId, Json.obj(Json.parse(TeamLog.GSON.toJson(e)), "Ereignis")); }
        catch (RuntimeException ex) { return false; }
    }

    @Override public String reject(TeamLog.View sofar, JsonObject e) {
        if (!active()) return null;
        if ("server".equals(TeamLog.str(e, "origin"))) return null;
        String id = TeamLog.str(e, "id"), by = TeamLog.str(e, "by"), kind = TeamLog.str(e, "kind");
        if (e.has("sig")) return signed(e) ? null : "Unterschrift der Bauleitung passt nicht";
        Long seq = id == null ? null : seqs.of(id);
        if (seq == null || seq <= upTo) return null;
        if (founder.equals(by)) return "im Namen der Bauleitung, aber ohne ihre Unterschrift";
        if ("leitung".equals(TeamLog.need(kind))) return "nur die Bauleitung darf das (ohne Unterschrift)";
        String player = TeamLog.str(e, "player"), member = TeamLog.str(e, "member");
        if (player != null && member != null && ("member.player".equals(kind) || "member.join".equals(kind))) {
            String bound = sofar.players.get(member);
            if (bound != null && !bound.equalsIgnoreCase(player)) return "Spielername von " + sofar.name(member) + " ist schon " + bound;
            Optional<String> other = sofar.memberOfPlayer(player);
            if (other.isPresent() && !other.get().equals(member)) return "Spieler " + player + " gehört schon zu " + sofar.name(other.get());
        }
        return null;
    }

    /** Seqs over a map (tests and RoomLink). */
    static Seqs of(Map<String, Long> m) { return m::get; }
}
