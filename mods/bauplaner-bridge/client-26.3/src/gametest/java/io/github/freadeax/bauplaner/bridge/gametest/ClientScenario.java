package io.github.freadeax.bauplaner.bridge.gametest;

import java.io.IOException;
import java.io.UncheckedIOException;
import it.unimi.dsi.fastutil.booleans.BooleanConsumer;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.ConfirmScreen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.client.gui.screens.worldselection.CreateWorldScreen;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.levelgen.Heightmap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Real-client test of the NeoForge/Forge bridge (GAME-05), shared by both loaders because it only uses
 * vanilla classes. Driven once per client tick by a tiny test mod (not part of the shipped .jar):
 * creates a flat creative test world through the normal "Create World" screen, builds the plan from
 * setblocks.txt with one wrong and one missing block (only the test places blocks, as server commands),
 * looks at the origin block and sends the {@code /bauplaner} commands like the chat does
 * ({@code ClientPacketListener.sendCommand}, where the loader intercepts client commands). The mod writes
 * the recording; the test copies it to BAUPLANER_GAMETEST_DIR for scripts/bridge_gametest.mjs and quits.
 */
public final class ClientScenario {
    private static final Logger LOG = LoggerFactory.getLogger("BauplanerGameTest");
    private static final String PLAN = "spieltest.schem";
    private static final int TIMEOUT_TICKS = 20 * 60 * 5;

    private final Path io;
    private final Path root;
    private final Deque<String> commands = new ArrayDeque<>(List.of(
            "bauplaner plaene", "bauplaner plan " + PLAN, "bauplaner anker hier", "bauplaner status", "bauplaner scan"));
    private int phase = 0;
    private int wait = 0;
    private int ticks = 0;
    private int[] anchor;

    public ClientScenario(Path gameDir) {
        String dir = System.getenv("BAUPLANER_GAMETEST_DIR");
        this.io = dir == null ? null : Path.of(dir);
        this.root = gameDir.resolve("bauplaner");
        LOG.info("Spieltest {}", io == null ? "inaktiv (BAUPLANER_GAMETEST_DIR fehlt)" : "aktiv, Ordner " + io);
        if (io != null) {
            try {
                Files.createDirectories(root.resolve("plans"));
                Files.copy(io.resolve("plan.schem"), root.resolve("plans").resolve(PLAN), StandardCopyOption.REPLACE_EXISTING);
                for (Path p : scans()) Files.delete(p);
                Files.deleteIfExists(root.resolve("state.properties"));
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }
    }

    public void tick() {
        if (io == null || phase < 0) return;
        Minecraft mc = Minecraft.getInstance();
        if (ticks % 400 == 0) LOG.info("Tick {}, Phase {}, Bildschirm {}, Ladeanzeige {}", ticks, phase,
                mc.gui.screen() == null ? "-" : mc.gui.screen().getClass().getSimpleName(), mc.gui.overlay() != null);
        if (++ticks > TIMEOUT_TICKS) { finish(mc, "Zeitüberschreitung in Phase " + phase); return; }
        if (wait > 0) { wait--; return; }
        try {
            switch (phase) {
                case 0 -> { // start-up finished (title or first-start onboarding screen): open the vanilla test-world screen
                    if (mc.gui.overlay() == null && mc.gui.screen() != null) {
                        LOG.info("Startbildschirm: {}", mc.gui.screen().getClass().getSimpleName());
                        CreateWorldScreen.testWorld(mc, () -> mc.gui.setScreen(new TitleScreen()));
                        phase = 1;
                        wait = 10;
                    }
                }
                case 1 -> { // press "Create New World"
                    if (mc.gui.screen() instanceof CreateWorldScreen screen) {
                        Method onCreate = CreateWorldScreen.class.getDeclaredMethod("onCreate");
                        onCreate.setAccessible(true);
                        onCreate.invoke(screen);
                        phase = 2;
                    }
                }
                case 2 -> { // in the world: build the plan on the ground at x=8, z=8
                    if (mc.gui.screen() instanceof ConfirmScreen confirm) confirm(confirm); // experimental-settings warning
                    if (ticks % 200 == 0) LOG.info("Warte auf Welt, Bildschirm: {}", mc.gui.screen() == null ? "-" : mc.gui.screen().getClass().getSimpleName());
                    if (mc.level == null || mc.player == null || mc.getSingleplayerServer() == null) return;
                    MinecraftServer server = mc.getSingleplayerServer();
                    List<String> lines = new ArrayList<>();
                    for (String l : Files.readAllLines(io.resolve("setblocks.txt"))) if (!l.isBlank()) lines.add(l);
                    int[] a = new int[3];
                    server.submit(() -> {
                        var level = server.overworld();
                        a[0] = 8; a[1] = level.getHeight(Heightmap.Types.MOTION_BLOCKING, 8, 8); a[2] = 8;
                        run(server, "time set noon");
                        for (String line : lines) {
                            String[] p = line.split(" ", 4);
                            run(server, "setblock " + (a[0] + Integer.parseInt(p[0])) + " " + (a[1] + Integer.parseInt(p[1])) + " "
                                    + (a[2] + Integer.parseInt(p[2])) + " " + p[3]);
                        }
                        // Stand on the ground 3 blocks north of the origin block and look at its centre
                        // (eye height 1.62, so the pitch is atan(1.12 / 3)); yaw 0 faces +z.
                        double pitch = Math.toDegrees(Math.atan2(1.12, 3.0));
                        run(server, "tp @a " + (a[0] + 0.5) + " " + a[1] + " " + (a[2] - 2.5) + " 0 " + pitch);
                    }).join();
                    anchor = a;
                    Files.writeString(io.resolve("anchor.txt"), a[0] + " " + a[1] + " " + a[2] + "\n");
                    phase = 3;
                    wait = 60;
                }
                case 3 -> { // type the commands, a few ticks apart
                    if (commands.isEmpty()) { phase = 4; return; }
                    String cmd = commands.poll();
                    LOG.info("Befehl: /{}", cmd);
                    mc.player.connection.sendCommand(cmd);
                    wait = 5;
                }
                case 4 -> { // the mod writes the recording
                    List<Path> scans = scans();
                    if (scans.isEmpty()) return;
                    String state = Files.readString(root.resolve("state.properties"));
                    if (!state.contains(".anchor=" + anchor[0] + " " + anchor[1] + " " + anchor[2]))
                        throw new AssertionError("Anker nicht gespeichert oder falsch: " + state);
                    Files.copy(scans.get(0), io.resolve("scan.schem"), StandardCopyOption.REPLACE_EXISTING);
                    Files.writeString(io.resolve("state.properties"), state);
                    finish(mc, null);
                }
                default -> {}
            }
        } catch (Exception | AssertionError e) {
            LOG.error("Spieltest fehlgeschlagen", e);
            finish(mc, e.toString());
        }
    }

    /** Answers "yes" on a confirmation screen (the test world uses the IDE-only test data pack). */
    private static void confirm(ConfirmScreen screen) throws ReflectiveOperationException {
        for (Class<?> c = screen.getClass(); c != null; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                if (f.getType() == BooleanConsumer.class) {
                    f.setAccessible(true);
                    LOG.info("Bestätige: {}", screen.getTitle().getString());
                    ((BooleanConsumer) f.get(screen)).accept(true);
                    return;
                }
            }
        }
    }

    private static void run(MinecraftServer server, String command) {
        server.getCommands().performPrefixedCommand(server.createCommandSourceStack(), command);
    }

    private void finish(Minecraft mc, String error) {
        phase = -1;
        try {
            if (error != null) Files.writeString(io.resolve("error.txt"), error + "\n");
            Files.writeString(io.resolve("done.txt"), error == null ? "ok\n" : "fehler\n");
        } catch (IOException e) {
            LOG.error("Ergebnis nicht schreibbar", e);
        }
        LOG.info("Spieltest beendet: {}", error == null ? "ok" : error);
        mc.stop();
    }

    private List<Path> scans() throws IOException {
        Path dir = root.resolve("scans");
        if (!Files.isDirectory(dir)) return List.of();
        List<Path> out = new ArrayList<>();
        try (var files = Files.list(dir)) { files.filter(p -> p.toString().endsWith(".schem")).forEach(out::add); }
        return out;
    }
}
