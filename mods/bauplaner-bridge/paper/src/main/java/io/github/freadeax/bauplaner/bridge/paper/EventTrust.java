package io.github.freadeax.bauplaner.bridge.paper;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.team.EventSig;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * GAME-06 / TEAM-SEC-01 (docs/architecture/team/SIGNED_EVENTS.md, TEAM_IDENTITY.md): which room events go into the fold.
 * <p>
 * Since TEAM-SEC-01 the room derives the author from the key and checks the role ({@code checkedFrom} = first arrival
 * number it checked). Steps in the Bauleitung's name and kinds only the Bauleitung may write still need its signature:
 * Ed25519 with the public key ({@code p} in the server link) – the plugin can check it but never make one. The old HMAC
 * key ({@code l}) is only used while no public key is known. Taken are
 * <ul>
 *   <li>its own events (origin {@code server}, written with the server key only the plugin has),</li>
 *   <li>events with a valid signature of the Bauleitung,</li>
 *   <li>events that did not come from the room (team file put on the server by its admin),</li>
 *   <li>events covered by a signed {@code team.trust} of the Bauleitung (up to its arrival number, not in its {@code except}),</li>
 *   <li>other unsigned events, except: in the Bauleitung's name, kinds only the Bauleitung may write, Baumeister kinds
 *       that came before the room checked authors, and player names when the member or the name is bound already.</li>
 * </ul>
 * Without a key or before the first valid {@code team.trust} nothing is filtered (as up to 0.23.0); the status says so.
 * Pure: no Bukkit, tested in {@code EventTrustTest}. Also used by the mod (copied like TeamLog).
 */
final class EventTrust implements TeamLog.Filter {
    /** Arrival numbers of room events (id → seq), see RoomLink. */
    interface Seqs { Long of(String id); }

    private record Trust(long upTo, Set<String> except) { }

    private final String teamId, founder, signKey, leaderKey;
    private final Seqs seqs;
    private final long checkedFrom;
    private final List<Trust> trusts = new ArrayList<>();
    /** Highest arrival number the Bauleitung confirmed; -1 = none yet (no filtering). */
    final long upTo;

    EventTrust(TeamLog team, String signKey, Seqs seqs) { this(team, signKey, null, seqs, -1); }

    /**
     * @param leaderKey   Ed25519 public key of the Bauleitung (wins over {@code signKey})
     * @param checkedFrom first arrival number the room checked the author of (-1 = unknown, room from before TEAM-SEC-01)
     */
    EventTrust(TeamLog team, String signKey, String leaderKey, Seqs seqs, long checkedFrom) {
        this.teamId = team.teamId; this.founder = team.founder; this.leaderKey = leaderKey; this.signKey = leaderKey != null ? null : signKey;
        this.seqs = seqs; this.checkedFrom = checkedFrom;
        long best = -1;
        if (this.signKey != null || leaderKey != null) for (JsonObject e : team.events()) {
            if (!"team.trust".equals(TeamLog.str(e, "kind")) || !founder.equals(TeamLog.str(e, "by")) || !signed(e)) continue;
            String n = TeamLog.str(e, "upTo");
            if (n == null || !n.matches("\\d{1,15}")) continue;
            Set<String> except = new HashSet<>();
            if (e.has("except") && e.get("except").isJsonArray()) for (JsonElement x : e.getAsJsonArray("except")) if (x.isJsonPrimitive()) except.add(x.getAsString());
            trusts.add(new Trust(Long.parseLong(n), except));
            best = Math.max(best, Long.parseLong(n));
        }
        this.upTo = best;
    }

    /** Whether the server checks this team (key known and the Bauleitung confirmed the past). */
    boolean active() { return (signKey != null || leaderKey != null) && (upTo >= 0 || checkedFrom > 0); }
    /** TEAM-SEC-01: whether the Bauleitung's public key (Ed25519) is used. */
    boolean ed() { return leaderKey != null; }

    boolean signed(JsonObject e) {
        if (!e.has("sig")) return false;
        try {
            Map<String, Object> m = Json.obj(Json.parse(TeamLog.GSON.toJson(e)), "Ereignis");
            return leaderKey != null ? EventSig.verifyEd(leaderKey, teamId, m) : signKey != null && EventSig.verify(signKey, teamId, m);
        } catch (RuntimeException ex) { return false; }
    }

    private boolean covered(String id, long seq) {
        for (Trust t : trusts) if (seq <= t.upTo && !t.except.contains(id)) return true;
        return false;
    }

    @Override public String reject(TeamLog.View sofar, JsonObject e) {
        if (!active()) return null;
        if ("server".equals(TeamLog.str(e, "origin"))) return null;
        String id = TeamLog.str(e, "id"), by = TeamLog.str(e, "by"), kind = TeamLog.str(e, "kind");
        if (signed(e)) return null;
        Long seq = id == null ? null : seqs.of(id);
        if (seq == null) return e.has("sig") ? "Unterschrift der Bauleitung passt nicht" : null;
        if (covered(id, seq)) return null;
        if (seq <= upTo) return "von der Bauleitung ausdrücklich nicht bestätigt";
        if (e.has("sig")) return "Unterschrift der Bauleitung passt nicht";
        if (founder.equals(by)) return "im Namen der Bauleitung, aber ohne ihre Unterschrift";
        if ("leitung".equals(TeamLog.need(kind))) return "nur die Bauleitung darf das (ohne Unterschrift)";
        // Before the room checked authors, anyone with the invitation could write in a Baumeister's name.
        if (checkedFrom > 0 && seq < checkedFrom && "meister".equals(TeamLog.need(kind))) return "Baumeister-Schritt aus der Zeit, bevor der Raum Absender prüfte";
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
