package io.github.freadeax.bauplaner.bridge.gametest;

import java.lang.reflect.Field;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import net.minecraft.client.multiplayer.chat.GuiMessage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.components.ChatComponent;

/**
 * Website link on NeoForge, same requests as the Fabric test (BridgeGameTest.liveLink): port command
 * starts the service and shows a code in the chat, pairing with that code, status with player and
 * hologram, live terrain, Weltplan marks and a plan sent directly. Requests run beside the game (the mod
 * answers on the game thread); each step waits until its answer is there. Answers go to live.json and
 * are checked by scripts/mod/bridge_gametest.mjs verify.
 */
final class LiveLinkScenario {
    private static final String BASE = "http://127.0.0.1:47615";
    private static final String SITE = "https://freadeax.github.io";
    private static final Pattern CODE = Pattern.compile("Code: (\\d{6})");

    private LiveLinkScenario() {}

    static List<ClientScenario.Step> steps(ClientScenario s) {
        int[] a = s.anchor();
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        StringBuilder out = new StringBuilder("{");
        String[] token = new String[1];
        String[] code = new String[1];
        List<ClientScenario.Step> steps = new ArrayList<>();
        steps.add(new ClientScenario.Step(10, mc -> s.command("bauplaner verbinden port 47615")));
        steps.add(new ClientScenario.Step(1, mc -> {
            code[0] = codeFromChat(mc);
            if (code[0] == null) throw new AssertionError("„/bauplaner verbinden port“ hat keinen Code im Chat gezeigt – Chat: " + lastChat(mc));
        }));
        request(steps, out, "hello", () -> get(http, "/v1/hello", null, SITE));
        request(steps, out, "foreign", () -> get(http, "/v1/hello", null, "https://example.com"));
        request(steps, out, "unpaired", () -> get(http, "/v1/status", null, SITE));
        request(steps, out, "pair", () -> post(http, "/v1/pair", "{\"code\":\"" + code[0] + "\"}", null));
        steps.add(new ClientScenario.Step(0, mc -> {
            Matcher m = Pattern.compile("\"token\":\"([A-Za-z0-9_-]+)\"").matcher(out);
            if (!m.find()) throw new AssertionError("Kopplung ohne Schlüssel: " + out);
            token[0] = m.group(1);
        }));
        request(steps, out, "status", () -> get(http, "/v1/status", token[0], SITE));
        int cx = Math.floorDiv(a[0], 16), cz = Math.floorDiv(a[2], 16);
        request(steps, out, "chunks", () -> get(http, "/v1/chunks?c=" + cx + "," + cz + ";4000,4000", token[0], SITE));
        String marks = "{\"dimension\":\"minecraft:overworld\",\"items\":[{\"kind\":\"point\",\"id\":\"point_test\",\"name\":\"Brunnen\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"type\":\"ziel\",\"x\":"
                + (a[0] + 12) + ",\"y\":" + a[1] + ",\"z\":" + (a[2] + 3) + "},{\"kind\":\"site\",\"id\":\"site_test\",\"name\":\"Platz\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"minX\":"
                + (a[0] - 4) + ",\"minZ\":" + (a[2] - 4) + ",\"width\":16,\"length\":12,\"y\":null,\"projectId\":null}"
                // Protocol 2 (GAME-08): a zone with layer and colour, a new point type on the same layer.
                + ",{\"kind\":\"zone\",\"id\":\"zone_test\",\"name\":\"Hofanlage\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"category\":\"wohnen\",\"layer\":\"Phase 2\",\"color\":\"#ff8800\",\"points\":[["
                + (a[0] - 10) + "," + (a[2] - 10) + "],[" + (a[0] + 2) + "," + (a[2] - 10) + "],[" + (a[0] + 2) + "," + (a[2] - 2) + "],[" + (a[0] - 4) + "," + (a[2] - 2) + "],[" + (a[0] - 10) + "," + (a[2] - 6) + "]]}"
                + ",{\"kind\":\"point\",\"id\":\"point_gefahr\",\"name\":\"Lava\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"type\":\"gefahr\",\"layer\":\"Phase 2\",\"x\":"
                + (a[0] - 8) + ",\"y\":" + a[1] + ",\"z\":" + (a[2] - 8) + "}]}";
        request(steps, out, "marks", () -> post(http, "/v1/marks", marks, token[0]));
        request(steps, out, "players", () -> get(http, "/v1/players", token[0], SITE));
        steps.add(new ClientScenario.Step(3, mc -> s.command("bauplaner ebenen")));
        String q = "name=website-plan.schem&dimension=minecraft%3Aoverworld&x=" + (a[0] + 20) + "&y=" + a[1] + "&z=" + a[2] + "&turns=0&mirror=false";
        request(steps, out, "plan", () -> {
            try {
                byte[] plan = Files.readAllBytes(s.io().resolve("plan.schem"));
                return send(http, HttpRequest.newBuilder(URI.create(BASE + "/v1/plan?" + q)).timeout(Duration.ofSeconds(20)).header("Origin", SITE)
                        .header("X-Bauplaner-Token", token[0]).header("Content-Type", "application/octet-stream")
                        .POST(HttpRequest.BodyPublishers.ofByteArray(plan)).build());
            } catch (java.io.IOException e) {
                throw new java.io.UncheckedIOException(e);
            }
        });
        steps.add(new ClientScenario.Step(40, mc -> {}));
        request(steps, out, "section", () -> post(http, "/v1/section", "{\"section\":2}", token[0]));
        request(steps, out, "after", () -> get(http, "/v1/status", token[0], SITE));
        // GAME-07-S11 (0.19.0), as in the Fabric test: a locked site of group „Markt“ over the whole plan, the
        // hologram limited to that group, then the original marks come back for the later steps.
        String grouped = "{\"dimension\":\"minecraft:overworld\",\"items\":[{\"kind\":\"site\",\"id\":\"site_markt\",\"name\":\"Marktplatz\",\"note\":\"\",\"dimension\":\"minecraft:overworld\",\"minX\":"
                + (a[0] - 80) + ",\"minZ\":" + (a[2] - 100) + ",\"width\":200,\"length\":200,\"y\":null,\"projectId\":null,\"group\":\"Markt\",\"locked\":true}]}";
        request(steps, out, "groupMarks", () -> post(http, "/v1/marks", grouped, token[0]));
        request(steps, out, "group", () -> post(http, "/v1/group", "{\"group\":\"Markt\"}", token[0]));
        request(steps, out, "groupUnknown", () -> post(http, "/v1/group", "{\"group\":\"Gibt es nicht\"}", token[0]));
        steps.add(new ClientScenario.Step(25, mc -> s.command("bauplaner gruppe")));
        steps.add(new ClientScenario.Step(30, mc -> {}));
        request(steps, out, "groupStatus", () -> get(http, "/v1/status", token[0], SITE));
        request(steps, out, "groupAll", () -> post(http, "/v1/group", "{\"group\":null}", token[0]));
        request(steps, out, "marksBack", () -> post(http, "/v1/marks", marks, token[0]));
        // MAP-05 Baustand, as in the Fabric test: back onto the built plan, then turned once on empty ground.
        request(steps, out, "back", () -> post(http, "/v1/placement", "{\"dimension\":\"minecraft:overworld\",\"x\":" + a[0] + ",\"y\":" + a[1] + ",\"z\":" + a[2] + ",\"turns\":0,\"mirror\":false}", token[0]));
        steps.add(new ClientScenario.Step(10, mc -> {}));
        request(steps, out, "scan", () -> download(http, token[0], s.io().resolve("live-scan.schem")));
        request(steps, out, "turned", () -> post(http, "/v1/placement", "{\"dimension\":\"minecraft:overworld\",\"x\":" + (a[0] + 20) + ",\"y\":" + a[1] + ",\"z\":" + (a[2] + 20) + ",\"turns\":1,\"mirror\":false}", token[0]));
        steps.add(new ClientScenario.Step(10, mc -> {}));
        request(steps, out, "scanTurned", () -> download(http, token[0], s.io().resolve("live-scan-gedreht.schem")));
        steps.add(new ClientScenario.Step(1, mc -> {
            Files.writeString(s.io().resolve("live.json"), out + "}");
            s.command("bauplaner verbinden status");
        }));
        return steps;
    }

    /** One request: started in its step, the scenario waits until the answer is in and appends it. */
    private static void request(List<ClientScenario.Step> steps, StringBuilder out, String key, Supplier<CompletableFuture<String>> call) {
        @SuppressWarnings("unchecked")
        CompletableFuture<String>[] f = new CompletableFuture[1];
        steps.add(new ClientScenario.Step(0, mc -> f[0] = call.get(), () -> f[0].isDone()));
        steps.add(new ClientScenario.Step(0, mc -> out.append(out.length() > 1 ? "," : "").append('"').append(key).append("\":").append(f[0].join())));
    }

    private static CompletableFuture<String> get(HttpClient http, String path, String token, String origin) {
        var b = HttpRequest.newBuilder(URI.create(BASE + path)).timeout(Duration.ofSeconds(10)).header("Origin", origin).GET();
        if (token != null) b.header("X-Bauplaner-Token", token);
        return send(http, b.build());
    }

    private static CompletableFuture<String> post(HttpClient http, String path, String body, String token) {
        var b = HttpRequest.newBuilder(URI.create(BASE + path)).timeout(Duration.ofSeconds(10)).header("Origin", SITE)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) b.header("X-Bauplaner-Token", token);
        return send(http, b.build());
    }

    /** Baustand file: saved to {@code to}; answered as {"status":n,"file":name,"expose":…,"bytes":n} or the error body. */
    private static CompletableFuture<String> download(HttpClient http, String token, java.nio.file.Path to) {
        var r = HttpRequest.newBuilder(URI.create(BASE + "/v1/scan")).timeout(Duration.ofSeconds(30)).header("Origin", SITE).header("X-Bauplaner-Token", token).GET().build();
        return http.sendAsync(r, HttpResponse.BodyHandlers.ofByteArray()).thenApply(res -> {
            if (res.statusCode() != 200) return "{\"status\":" + res.statusCode() + ",\"body\":" + new String(res.body(), java.nio.charset.StandardCharsets.UTF_8) + "}";
            try { Files.write(to, res.body()); } catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
            return "{\"status\":200,\"file\":\"" + res.headers().firstValue("X-Bauplaner-File").orElse("") + "\",\"expose\":\""
                    + res.headers().firstValue("Access-Control-Expose-Headers").orElse("") + "\",\"bytes\":" + res.body().length + "}";
        });
    }

    private static CompletableFuture<String> send(HttpClient http, HttpRequest r) {
        return http.sendAsync(r, HttpResponse.BodyHandlers.ofString())
                .thenApply(res -> "{\"status\":" + res.statusCode() + ",\"body\":" + (res.body().isBlank() ? "null" : res.body()) + "}");
    }

    /** The newest pairing code in the chat, as the player reads it. */
    private static String lastChat(Minecraft mc) {
        try {
            for (Field f : ChatComponent.class.getDeclaredFields()) {
                if (!f.getName().equals("allMessages")) continue;
                f.setAccessible(true);
                List<?> all = (List<?>) f.get(mc.gui.hud.getChat());
                return all.stream().limit(4).map(o -> ((GuiMessage) o).content().getString()).toList().toString();
            }
        } catch (ReflectiveOperationException e) { return e.toString(); }
        return "?";
    }

    private static String codeFromChat(Minecraft mc) throws ReflectiveOperationException {
        ChatComponent chat = mc.gui.hud.getChat();
        for (Field f : ChatComponent.class.getDeclaredFields()) {
            if (!f.getName().equals("allMessages")) continue;
            f.setAccessible(true);
            for (Object o : (List<?>) f.get(chat)) { // newest first
                Matcher m = CODE.matcher(((GuiMessage) o).content().getString());
                if (m.find()) return m.group(1);
            }
        }
        return null;
    }
}
