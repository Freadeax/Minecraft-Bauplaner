package io.github.freadeax.bauplaner.bridge.session;

import io.github.freadeax.bauplaner.bridge.AnchorStore;
import io.github.freadeax.bauplaner.bridge.BridgeException;
import io.github.freadeax.bauplaner.bridge.Plan;
import io.github.freadeax.bauplaner.bridge.ScanJob;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Stream;

/**
 * Loader-neutral logic of the {@code /bauplaner} commands: plan, anchor, scan in slices, status.
 * Each adapter only maps its command system onto these methods and calls {@link #tick} once per
 * game tick. Files live below {@code root}: {@code plans/} (exported plans), {@code scans/}
 * (recordings), {@code state.properties} (plan and anchor per world/server). Never changes the world.
 * Command methods return 1 on success and 0 on failure (Brigadier convention).
 */
public final class BridgeSession {
    /** Cells per tick; keeps the frame time low (about 0.4 s for 100 000 cells at 20 ticks/s). */
    public static final int CELLS_PER_TICK = 12_000;
    private static final String PREFIX = "[Bauplaner] ";

    private final Path root;
    private final BridgeHost host;
    private Plan plan;
    private int[] anchor;
    private String anchorDimension;
    private ScanJob job;
    private String jobDimension;
    private boolean prepared;

    public BridgeSession(Path root, BridgeHost host) {
        this.root = root;
        this.host = host;
    }

    public Path root() { return root; }
    public Plan plan() { return plan; }
    public int[] anchor() { return anchor == null ? null : anchor.clone(); }
    public String anchorDimension() { return anchorDimension; }
    public boolean scanning() { return job != null; }

    private void say(String text) { host.say(PREFIX + text); }
    private int fail(String text) { host.error(PREFIX + text); return 0; }

    public int help() {
        say("1) Plan im Tab „Export“ der Website exportieren und nach " + root.resolve("plans") + " legen.");
        say("2) /bauplaner plan <datei>  3) /bauplaner anker hier (angeschauter Block = Projektursprung 0/0/0)  4) /bauplaner scan");
        say("Die Aufnahme landet in " + root.resolve("scans") + " und wird im Tab „Bauen“ importiert. Die Welt wird nie verändert.");
        return 1;
    }

    /** Plan file names for tab completion, sorted; empty when the folder does not exist. */
    public List<String> planNames() {
        try (Stream<Path> files = Files.list(root.resolve("plans"))) {
            List<String> names = new ArrayList<>();
            files.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(".schem")).forEach(names::add);
            Collections.sort(names);
            return names;
        } catch (IOException e) {
            return List.of();
        }
    }

    public int listPlans() {
        try { Files.createDirectories(root.resolve("plans")); } catch (IOException e) { return fail("Ordner nicht anlegbar: " + e.getMessage()); }
        List<String> names = planNames();
        if (names.isEmpty()) return fail("Keine Pläne in " + root.resolve("plans") + ".");
        names.forEach(this::say);
        return names.size();
    }

    public int loadPlan(String name) {
        Path dir = root.resolve("plans").normalize();
        Path file = dir.resolve(name).normalize();
        if (!file.startsWith(dir) || file.equals(dir)) return fail("Ungültiger Dateiname.");
        if (job != null) return fail("Während einer Aufnahme kann kein anderer Plan geladen werden.");
        try {
            plan = Plan.read(file);
        } catch (IOException | BridgeException e) {
            return fail("Plan nicht lesbar: " + e.getMessage());
        }
        anchor = null;
        anchorDimension = null;
        say("Plan geladen: " + plan.name() + " · " + plan.width() + "×" + plan.height() + "×" + plan.length() + " (" + plan.volume() + " Zellen).");
        if (plan.dataVersion() != host.dataVersion()) say("Hinweis: Plan für DataVersion " + plan.dataVersion() + ", Spiel " + host.dataVersion() + ".");
        restoreAnchor();
        return 1;
    }

    private void restoreAnchor() {
        try {
            new AnchorStore(root.resolve("state.properties")).get(host.worldKey())
                    .filter(e -> e.planFile().equals(plan.fileName()))
                    .ifPresent(e -> {
                        anchor = e.anchor();
                        anchorDimension = e.dimension();
                        say("Gespeicherter Anker: " + anchor[0] + " " + anchor[1] + " " + anchor[2] + " (" + anchorDimension + ").");
                    });
        } catch (IOException e) {
            say("Gespeicherter Anker nicht lesbar: " + e.getMessage());
        }
    }

    /** Anchor on the block the person looks at. */
    public int setAnchorHere() {
        if (plan == null) return fail("Zuerst /bauplaner plan <datei>.");
        int[] target = host.targetBlock();
        if (target == null) return fail("Kein Block im Blick. Nutze /bauplaner anker <x> <y> <z>.");
        return setAnchor(target[0], target[1], target[2], null);
    }

    /** Anchor on explicit coordinates; {@code dimension} null means the person's current dimension. */
    public int setAnchor(int x, int y, int z, String dimension) {
        if (plan == null) return fail("Zuerst /bauplaner plan <datei>.");
        if (job != null) return fail("Während einer Aufnahme kann der Anker nicht geändert werden.");
        anchor = new int[] { x, y, z };
        anchorDimension = dimension != null ? dimension : host.dimension();
        int[] m = plan.projectMin();
        say("Projektursprung 0/0/0 = " + x + " " + y + " " + z + ". Planbox von "
                + (x + m[0]) + " " + (y + m[1]) + " " + (z + m[2]) + " bis "
                + (x + m[0] + plan.width() - 1) + " " + (y + m[1] + plan.height() - 1) + " " + (z + m[2] + plan.length() - 1) + ".");
        try {
            new AnchorStore(root.resolve("state.properties")).put(host.worldKey(), new AnchorStore.Entry(plan.fileName(), anchorDimension, anchor.clone()));
        } catch (IOException e) {
            say("Anker nicht gespeichert: " + e.getMessage());
        }
        return 1;
    }

    public int startScan() {
        if (plan == null) return fail("Zuerst /bauplaner plan <datei>.");
        if (anchor == null) return fail("Zuerst /bauplaner anker hier.");
        if (job != null) return fail("Es läuft bereits eine Aufnahme.");
        boolean client = "client".equals(host.source());
        String dim = host.dimension();
        // A client can only read the dimension it is in; a server reads any world.
        if (client && !anchorDimension.equals(dim)) return fail("Der Anker liegt in " + anchorDimension + ", du bist in " + dim + ".");
        job = new ScanJob(plan, anchor, host.blocks(anchorDimension), host.dataVersion(),
                new ScanJob.Info(host.gameVersion(), host.modVersion(), host.loader(), anchorDimension, host.source()));
        jobDimension = anchorDimension;
        prepared = false;
        say("Aufnahme gestartet: " + plan.volume() + " Zellen." + (client ? " Bitte in der Nähe bleiben; nur geladene Chunks werden gelesen." : ""));
        return 1;
    }

    public int cancel() {
        if (job == null) return fail("Keine Aufnahme aktiv.");
        end();
        say("Aufnahme abgebrochen, keine Datei geschrieben.");
        return 1;
    }

    public int status() {
        say(plan == null ? "Kein Plan geladen." : "Plan: " + plan.fileName() + " (Revision " + plan.revisionNumber() + ")");
        say(anchor == null ? "Kein Anker." : "Anker: " + anchor[0] + " " + anchor[1] + " " + anchor[2] + " (" + anchorDimension + ")");
        if (job != null) say("Aufnahme: " + job.done() + " / " + job.total() + " Zellen");
        return 1;
    }

    private void end() {
        job = null;
        host.scanEnded();
    }

    /**
     * Advances a running scan by up to {@code budget} cells; writes the recording when complete.
     * @return the written file once the scan finished in this tick, otherwise {@code null}
     */
    public Path tick(int budget) {
        if (job == null) return null;
        if (!host.inWorld() || ("client".equals(host.source()) && !host.dimension().equals(jobDimension))) {
            end();
            if (host.inWorld()) say("Aufnahme abgebrochen: Welt oder Dimension gewechselt.");
            return null;
        }
        try {
            if (!prepared) {
                int[] min = job.worldMin();
                if (!host.prepareScan(jobDimension, min, new int[] { plan.width(), plan.height(), plan.length() })) {
                    host.status("Bauplaner-Aufnahme: Bereich wird vorbereitet …");
                    return null;
                }
                prepared = true;
            }
            boolean done = job.step(budget);
            host.status("Bauplaner-Aufnahme " + (job.done() * 100 / job.total()) + " %");
            if (!done) return null;
            Instant now = Instant.now();
            Path out = root.resolve("scans").resolve(ScanJob.fileName(plan, now));
            Files.createDirectories(out.getParent());
            Path tmp = out.resolveSibling(out.getFileName() + ".tmp");
            Files.write(tmp, job.toFile(now));
            Files.move(tmp, out, StandardCopyOption.ATOMIC_MOVE);
            String unloaded = job.unloaded() > 0 ? " " + job.unloaded() + " Zellen lagen in nicht geladenen Chunks (gelten als „nicht aufgenommen“)." : "";
            end();
            say("Aufnahme gespeichert: " + out + "." + unloaded + " Jetzt im Tab „Bauen“ importieren.");
            return out;
        } catch (IOException | RuntimeException e) {
            end();
            fail("Aufnahme fehlgeschlagen: " + e.getMessage());
            return null;
        }
    }
}
