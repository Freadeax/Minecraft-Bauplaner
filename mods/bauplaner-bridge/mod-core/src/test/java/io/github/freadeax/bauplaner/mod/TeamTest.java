package io.github.freadeax.bauplaner.mod;

import static org.junit.jupiter.api.Assertions.*;

import io.github.freadeax.bauplaner.bridge.Nbt;
import io.github.freadeax.bauplaner.mod.live.Json;
import io.github.freadeax.bauplaner.mod.team.TeamColors;
import io.github.freadeax.bauplaner.mod.team.TeamOutbox;
import io.github.freadeax.bauplaner.mod.team.TeamPlan;
import io.github.freadeax.bauplaner.mod.team.TeamState;
import io.github.freadeax.bauplaner.mod.team.TeamSync;
import io.github.freadeax.bauplaner.mod.team.TeamWire;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Teambau in the mod (COOP-03): state, matching with the plan, outbox, channel rule, framing. */
class TeamTest {
    static final String STATE = """
            {"teamId":"team_burg","name":"Burgbau","dimension":"minecraft:overworld","revision":4,"me":"b_anna",
             "sections":[{"id":"sec_fund","nr":1,"name":"Fundament","owner":"b_anna","status":"vergeben","boxes":[[10,64,10,0,60,0]]},
                         {"id":"sec_wand","nr":2,"name":"Wände","status":"frei"},
                         {"id":"sec_dach","nr":3,"name":"Dach","owner":"b_ben","status":"zukunft"}],
             "members":[{"id":"b_anna","name":"Anna","player":"Anna_MC","role":"helfer"},{"id":"b_ben","name":"Ben","role":"meister","color":"#123456"}],
             "notes":[{"id":"n1","tag":"material","text":"Stein fehlt","by":"b_ben","pos":[1,64,2]}],
             "stores":[{"id":"k1","name":"Steinlager","pos":[5,64,5],"purpose":"vorrat","status":"geprueft","items":[{"item":"minecraft:stone","count":40}]}]}
            """;

    static TeamState state(TeamState.Source src) { return TeamState.parse(Json.obj(Json.parse(STATE), "x"), src); }

    @Test
    void stateParsesAndAnswersQuestions() {
        TeamState t = state(TeamState.Source.SERVER);
        assertEquals(3, t.sections().size());
        assertEquals("vergeben", t.section("sec_dach").orElseThrow().status(), "unbekannter Status mit Inhaber gilt als vergeben");
        assertArrayEquals(new int[] { 0, 60, 0, 10, 64, 10 }, t.sections().get(0).boxes().get(0), "Box wird geordnet");
        assertTrue(t.sectionAt("minecraft:overworld", 5, 62, 5).isPresent());
        assertTrue(t.sectionAt("minecraft:the_nether", 5, 62, 5).isEmpty());
        assertEquals("sec_wand", t.findSection("2").orElseThrow().id());
        assertEquals("sec_dach", t.findSection("da").orElseThrow().id());
        assertEquals(List.of("sec_fund"), t.mine().stream().map(TeamState.Section::id).toList());
        assertEquals("b_anna", t.memberOfPlayer("anna_mc").orElseThrow().id());
        assertEquals(0xFF123456, t.colorOf("b_ben"), "Planerfarbe gilt");
        assertEquals(TeamColors.of("b_anna"), t.colorOf("b_anna"));
        assertEquals(TeamColors.of("b_anna"), TeamColors.of("b_anna"), "stabil");
        assertNotEquals(TeamColors.FREE, TeamColors.of("b_anna"));
        assertTrue(t.summary().contains("Planstand 4"));
        assertThrows(Json.JsonException.class, () -> TeamState.parse(Json.obj(Json.parse("{\"teamId\":\"t\",\"name\":\"n\",\"sections\":[{\"id\":\"a\",\"name\":\"b\",\"boxes\":[[1,2,3]]}]}"), "x"), TeamState.Source.PLANER));
    }

    @Test
    void overlayShowsOwnWaitingActions(@TempDir Path dir) {
        TeamState t = state(TeamState.Source.PLANER);
        TeamOutbox box = new TeamOutbox(dir.resolve("o.json"));
        box.add(t.teamId(), "section.claim", Map.of("section", "sec_wand"));
        box.add(t.teamId(), "section.claim", Map.of("section", "sec_dach"));
        box.add(t.teamId(), "section.done", Map.of("section", "sec_fund"));
        TeamState o = t.overlay(box.pending());
        assertEquals("b_anna", o.section("sec_wand").orElseThrow().owner());
        assertTrue(o.section("sec_wand").orElseThrow().pending());
        assertEquals("b_ben", o.section("sec_dach").orElseThrow().owner(), "fremder Abschnitt bleibt fremd");
        assertEquals("gemeldet", o.section("sec_fund").orElseThrow().status());
        // Survives a restart, ids stay, removal by id.
        TeamOutbox again = new TeamOutbox(dir.resolve("o.json"));
        assertEquals(box.pending().stream().map(TeamOutbox.Action::id).toList(), again.pending().stream().map(TeamOutbox.Action::id).toList());
        assertEquals(1, again.remove(List.of(box.pending().get(0).id())));
        assertEquals(2, new TeamOutbox(dir.resolve("o.json")).pending().size());
        assertThrows(IllegalArgumentException.class, () -> again.add("t", "plan.release", Map.of()), "Planfreigabe nur im Planer");
        assertTrue(TeamOutbox.newId().matches("tev_m[0-9a-z]{15}"));
        Map<String, Object> e = again.pending().get(0).asEvent("b_anna");
        assertEquals("planer", e.get("origin"));
        assertEquals("b_anna", e.get("by"));
    }

    @Test
    void teamSectionsMeetPlanSections() {
        Map<String, Nbt.Tag> extra = new LinkedHashMap<>();
        extra.put("SectionIds", new Nbt.Tag(Nbt.LIST, new Nbt.NbtList(Nbt.STRING, List.of(Nbt.Tag.ofString("sec_fund"), Nbt.Tag.ofString("sec_wand")))));
        extra.put("TeamId", Nbt.Tag.ofString("team_burg"));
        PlanModel plan = PlanModel.parse("s.schem", ModCoreTest.schem(3, 1, 1, new int[] { 0, 0, 0 }, new String[] { "minecraft:stone" }, new int[] { 0, 0, 0 },
                List.of("Fundament", "Wände"), new byte[] { 1, 2, 2 }, extra));
        assertEquals(List.of("sec_fund", "sec_wand"), plan.sectionIds());
        assertEquals("team_burg", plan.teamId());
        TeamState t = state(TeamState.Source.SERVER);
        TeamPlan tp = new TeamPlan(t, plan);
        assertNull(tp.mismatch());
        assertEquals(1, tp.number("sec_fund"));
        assertEquals(0, tp.number("sec_dach"), "Dach ist nicht im Plan");
        assertEquals(Set.of(1), tp.numbersOf("b_anna"));
        assertEquals(Set.of(2), tp.freeNumbers());
        var check = new LiveCheck(plan, Placement.at("minecraft:overworld", 0, 64, 0));
        check.sweep((x, y, z) -> x == 1 ? BlockState.parse("minecraft:stone") : BlockState.AIR, 10);
        assertArrayEquals(new int[] { 1, 2, 1 }, TeamPlan.progress(check, 2));
        assertEquals(50, TeamPlan.percent(TeamPlan.progress(check, 2)));
        assertEquals(0, TeamPlan.percent(TeamPlan.progress(check, 1)));
        int[][] boxes = TeamPlan.boxes(check);
        assertArrayEquals(new int[] { 1, 64, 0, 2, 64, 0 }, boxes[2]);
        // Anna: one stone open, carries none, 40 lie in the checked chest.
        var needs = tp.needs(check, "b_anna", Map.of(), TeamPlan.ready(t));
        assertEquals(List.of(new TeamPlan.Need("minecraft:stone", 1, 0, 1, 40)), needs);
        assertEquals(List.of(), tp.needs(check, "b_ben", Map.of(), Map.of()), "Ben hat im Plan keinen Abschnitt");
        // Set filter: sections 1 and 2 together, nothing else.
        assertEquals(3, check.count(Filter.sections(Integer.MIN_VALUE, Integer.MAX_VALUE, Set.of(1, 2)))[BlockRules.Verdict.OK.ordinal()]
                + check.count(Filter.sections(Integer.MIN_VALUE, Integer.MAX_VALUE, Set.of(1, 2)))[BlockRules.Verdict.MISSING.ordinal()]);
        assertEquals(0, check.count(Filter.sections(Integer.MIN_VALUE, Integer.MAX_VALUE, Set.of()))[BlockRules.Verdict.MISSING.ordinal()]);
        // Old plan files without ids: unique names match; another team's plan is reported.
        PlanModel old = PlanModel.parse("o.schem", ModCoreTest.schem(1, 1, 1, new int[] { 0, 0, 0 }, new String[] { "minecraft:stone" }, new int[] { 0 }, List.of("Wände"), new byte[] { 1 }));
        assertEquals(1, new TeamPlan(t, old).number("sec_wand"));
        extra.put("TeamId", Nbt.Tag.ofString("team_anders"));
        PlanModel other = PlanModel.parse("x.schem", ModCoreTest.schem(1, 1, 1, new int[] { 0, 0, 0 }, new String[] { "minecraft:stone" }, new int[] { 0 }, List.of("A", "B"), new byte[] { 1 }, extra));
        assertNotNull(new TeamPlan(t, other).mismatch());
    }

    @Test
    void wireSplitsAndAssembles() {
        Map<String, Object> big = new LinkedHashMap<>();
        big.put("t", "state");
        List<Object> list = new ArrayList<>();
        for (int i = 0; i < 4000; i++) list.add("Abschnitt Nummer " + i + " mit Umlauten äöü");
        big.put("x", list);
        List<byte[]> frames = TeamWire.frames(big, "p1");
        assertTrue(frames.size() > 3);
        for (byte[] f : frames) assertTrue(f.length < 32_767, "unter der Vanilla-Grenze");
        TeamWire.Assembler a = new TeamWire.Assembler();
        Map<String, Object> out = null;
        // Out of order is fine.
        for (int i = frames.size() - 1; i >= 0; i--) { Map<String, Object> r = a.accept(frames.get(i)); if (r != null) out = r; }
        assertNotNull(out);
        assertEquals(4000, ((List<?>) out.get("x")).size());
        assertEquals(1.0, out.get("v"));
        Map<String, Object> small = a.accept(TeamWire.frames(Map.of("t", "ack", "id", "x"), "p2").get(0));
        assertEquals("ack", small.get("t"));
        assertThrows(Json.JsonException.class, () -> a.accept("{\"v\":7,\"t\":\"state\"}".getBytes(StandardCharsets.UTF_8)), "fremde Version");
    }

    /** Fake connection for the channel rule. */
    static final class Fake implements TeamSync.Transport {
        boolean channel, opened;
        final List<Map<String, Object>> sent = new ArrayList<>();
        @Override public boolean serverHasChannel() { return channel; }
        @Override public void open() { opened = true; }
        @Override public void send(byte[] frame) { sent.add(Json.obj(Json.parse(new String(frame, StandardCharsets.UTF_8)), "f")); }
    }

    static byte[] frame(String json) { return json.getBytes(StandardCharsets.UTF_8); }

    @Test
    void channelOnlyWithAnnouncementAndPermission(@TempDir Path dir) throws Exception {
        List<String> chat = new ArrayList<>();
        long[] now = { 1_000 };
        TeamSync sync = new TeamSync(dir, "0.10.0", () -> now[0], chat::add);
        Fake net = new Fake();
        sync.join("server/test", net);
        assertEquals(TeamSync.Link.NO_PLUGIN, sync.link());
        sync.tick();
        assertTrue(net.sent.isEmpty(), "ohne Plugin wird nie gesendet");
        assertFalse(net.opened);
        // Planner state, then an action: waits in the outbox, nothing is sent.
        sync.fromPlaner(Json.obj(Json.parse(STATE), "x"));
        assertTrue(sync.act("section.claim", Map.of("section", "sec_wand"), "Wände übernommen").contains("Ausgangskorb"));
        assertEquals(1, sync.outboxForPlaner().size());
        assertEquals("b_anna", sync.outboxForPlaner().get(0).get("by"));
        // Time exactly like the planner's toISOString (milliseconds, Z), so the planner's text order holds.
        assertTrue(((String) sync.outboxForPlaner().get(0).get("at")).matches("\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z"));
        assertEquals("2026-11-03T10:00:05.000Z", TeamWire.time(java.time.Instant.parse("2026-11-03T10:00:05Z")));
        assertEquals("2026-11-03T10:00:05.123Z", TeamWire.time(java.time.Instant.parse("2026-11-03T10:00:05.123456789Z")));
        assertEquals("b_anna", sync.state().section("sec_wand").orElseThrow().owner(), "sofort sichtbar");
        // Plugin appears: the mod asks, still sends nothing.
        net.channel = true;
        sync.tick();
        assertEquals(TeamSync.Link.ASK, sync.link());
        assertTrue(net.sent.isEmpty());
        assertTrue(chat.get(chat.size() - 1).contains("„Teambau erlauben“"));
        assertTrue(sync.request("pull", Map.of()).isCompletedExceptionally());
        // Allowed: register + hello, and the state answer sends the waiting action.
        sync.allow(true);
        assertTrue(net.opened);
        assertEquals("hello", net.sent.get(0).get("t"));
        sync.receive(frame("{\"v\":1,\"t\":\"state\",\"state\":" + STATE + "}"));
        assertEquals(TeamSync.Link.LIVE, sync.link());
        assertEquals(TeamState.Source.SERVER, sync.state().source());
        Map<String, Object> act = net.sent.get(1);
        assertEquals("act", act.get("t"));
        String id = (String) Json.obj(act.get("event"), "e").get("id");
        assertFalse(Json.obj(act.get("event"), "e").containsKey("by"), "Urheber setzt der Server");
        // Not answered: sent again after 15 s; then accepted.
        now[0] += 16_000;
        sync.tick();
        assertEquals(3, net.sent.size());
        sync.receive(frame("{\"v\":1,\"t\":\"ack\",\"id\":\"" + id + "\",\"ok\":true}"));
        assertTrue(sync.outbox().isEmpty());
        // A rejection with final=true leaves the outbox and tells the player why.
        sync.act("section.claim", Map.of("section", "sec_dach"), "Dach");
        String id2 = sync.outbox().pending().get(0).id();
        sync.receive(frame("{\"v\":1,\"t\":\"ack\",\"id\":\"" + id2 + "\",\"ok\":false,\"final\":true,\"reason\":\"Abschnitt 3 baut schon Ben.\"}"));
        assertTrue(sync.outbox().isEmpty());
        assertTrue(chat.get(chat.size() - 1).contains("baut schon Ben"));
        // Relay: the answer completes the website request.
        var f = sync.request("pull", Map.of("teamId", "team_burg"));
        Map<String, Object> pull = net.sent.get(net.sent.size() - 1);
        assertEquals("pull", pull.get("t"));
        sync.receive(frame("{\"v\":1,\"t\":\"answer\",\"req\":\"" + pull.get("req") + "\",\"events\":[]}"));
        assertTrue(f.isDone());
        // Permission is remembered per server; "verbieten" stops everything.
        TeamSync next = new TeamSync(dir, "0.10.0", () -> now[0], chat::add);
        Fake net2 = new Fake();
        net2.channel = true;
        next.join("server/test", net2);
        assertEquals("hello", net2.sent.get(0).get("t"), "erlaubt bleibt erlaubt");
        next.allow(false);
        int before = net2.sent.size();
        next.act("section.claim", Map.of("section", "sec_wand"), "x");
        next.tick();
        assertEquals(before, net2.sent.size());
        assertEquals(TeamSync.Link.OFF, next.link());
        // Frames from a server the player never allowed are ignored.
        TeamSync third = new TeamSync(dir, "0.10.0", () -> now[0], chat::add);
        third.join("server/fremd", new Fake());
        third.receive(frame("{\"v\":1,\"t\":\"state\",\"state\":" + STATE + "}"));
        assertNull(third.state());
    }
}
