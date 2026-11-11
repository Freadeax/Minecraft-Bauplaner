package io.github.freadeax.bauplaner.bridge.hologram;

import static io.github.freadeax.bauplaner.mod.Lang.t;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.LiveCheck;
import io.github.freadeax.bauplaner.mod.Placement;
import io.github.freadeax.bauplaner.mod.PlacementStore;
import io.github.freadeax.bauplaner.mod.PlanModel;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import net.minecraft.client.Minecraft;
import net.minecraft.core.BlockPos;

/**
 * The placed plan of this world/server: which plan, where, turned/mirrored, visible or not, and the
 * running comparison with the world. Lives only on this computer (see {@link PlacementStore}); nothing
 * is ever sent to the server and the world is never changed.
 */
public final class Hologram {
    /** Planned blocks re-read per client tick (about 160 000 per second). */
    public static final int SWEEP_PER_TICK = 8_000;
    /**
     * Big builds (SIZE-01): from this many planned blocks the live check for a new placement is built on a
     * background thread, and plan files from this size on are read there too. The old hologram stays until the
     * new one is ready, so arrow keys and plan changes never freeze the game.
     */
    public static final int ASYNC_BLOCKS = 250_000;
    public static final long ASYNC_FILE_BYTES = 512 * 1024;
    private static final java.util.concurrent.ExecutorService LOADER = java.util.concurrent.Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "Build-Studio-Planlader");
        t.setDaemon(true);
        t.setPriority(Thread.MIN_PRIORITY);
        return t;
    });

    /** Result of a background load, installed by {@link #tick} when it is still the newest request. */
    private record Pending(long generation, String file, PlanModel plan, LiveCheck check, String message, String error) {}
    private volatile Pending pending;
    /** Counts placement and plan requests; only the newest background result is installed. */
    private long generation;
    /** Placement the newest request asks for (equals the check's placement when nothing is loading). */
    private Placement wanted;
    /** File name of a plan that is being read in the background, for the HUD; null when none. */
    private volatile String loadingFile;

    private final Path root;
    private final PlacementStore store;
    private String worldKey;
    private String planFile;
    private PlanModel plan;
    private LiveCheck check;
    private boolean visible = true;
    /** Error finder: index of the highlighted block, -1 when off. */
    private int target = -1;
    /** Layer mode: all layers, only one layer, or everything up to a layer (world height {@link #layerY}). */
    public enum Layers { ALL, ONE, BELOW }
    private Layers layers = Layers.ALL;
    private int layerY;
    /** Build section from the website (1-based), 0 = all sections. */
    private int section;
    /** Section whose completion was already announced in the chat, so the message comes once. */
    private int announced;
    /** X-ray: frames of wrong and missing blocks also through walls (finder beam always). */
    private boolean xray;
    /** Missing blocks as see-through textured blocks (true) or as blue boxes. */
    private boolean textured = true;
    /**
     * Render budget (SIZE-01): how many open blocks the hologram draws at most per frame. The nearest come
     * first, so a big build only shows its surroundings in detail. "niedrig" for shader packs on weak
     * graphics cards, "hoch" for strong ones.
     */
    public enum Budget {
        /** Adapts to the frame rate (mod 0.29.0, default): starts at "normal" and draws fewer blocks while the game is slow. */
        AUTO("auto", 1), NIEDRIG("niedrig", 0.5), NORMAL("normal", 1), HOCH("hoch", 2);
        public final String label;
        public final double factor;
        Budget(String label, double factor) { this.label = label; this.factor = factor; }
        /** Label in the mod's language (GAME-12); {@link #label} stays the saved German key. */
        public String text() { return switch (this) { case AUTO -> "auto"; case NIEDRIG -> io.github.freadeax.bauplaner.mod.Lang.t("niedrig", "low"); case NORMAL -> "normal"; case HOCH -> io.github.freadeax.bauplaner.mod.Lang.t("hoch", "high"); }; }
        public static Budget parse(String s, Budget fallback) {
            for (Budget b : values()) if (b.label.equals(s) || b.name().equals(s)) return b;
            return fallback;
        }
    }
    private Budget budget = Budget.AUTO;
    /** What the renderer drew last: blocks shown and whether the budget cut farther ones off (HUD line). */
    private volatile int shown;
    private volatile boolean capped;
    /** Placement helper strictness, persisted with the other settings. */
    private io.github.freadeax.bauplaner.mod.PlacementAdvice.Guard guard = io.github.freadeax.bauplaner.mod.PlacementAdvice.Guard.ON;

    Hologram(Path root) {
        this.root = root;
        this.store = new PlacementStore(root.resolve("platzierung.properties"));
        loadSettings();
    }

    public Path plansDir() { return root.resolve("plans"); }
    public LiveCheck check() { return check; }
    public PlanModel plan() { return plan; }
    public String planFile() { return planFile; }
    public boolean active() { return check != null; }
    /** True while a plan or a new placement is prepared in the background (HUD shows it). */
    public boolean loading() { return loadingFile != null || (check != null && wanted != null && !wanted.equals(check.placement())); }
    public String loadingFile() { return loadingFile; }
    /** Placement as last asked for (moves, turns), even while the check for it is still being built. */
    private Placement current() { return wanted != null ? wanted : check == null ? null : check.placement(); }
    public boolean visible() { return visible && check != null; }
    public int target() { return check == null || target >= check.size() ? -1 : target; }
    public Layers layers() { return layers; }
    public int layerY() { return layerY; }
    public boolean textured() { return textured; }
    public io.github.freadeax.bauplaner.mod.PlacementAdvice.Guard guard() { return guard; }
    public void setGuard(io.github.freadeax.bauplaner.mod.PlacementAdvice.Guard g) { guard = g; saveSettings(); }
    public Budget budget() { return budget; }
    public void setBudget(Budget b) { budget = b; frames.reset(); saveSettings(); }
    void reportShown(int count, boolean cut) { shown = count; capped = cut; }
    /** Automatic budget (shared with the renderer): share of "normal" and the smoothed frame rate. */
    final io.github.freadeax.bauplaner.mod.FrameBudget frames = new io.github.freadeax.bauplaner.mod.FrameBudget();
    /** Share of the normal block budget drawn now (the fixed factor, or the automatic step). */
    public double budgetScale() { return budget == Budget.AUTO ? frames.scale() : budget.factor; }
    public int fps() { return frames.fps(); }
    public int shown() { return shown; }
    /** True when the render budget left out open blocks farther away. */
    public boolean capped() { return capped; }
    /** Lowest and highest world height currently shown. */
    public int minY() { return layers == Layers.ONE ? layerY : Integer.MIN_VALUE; }
    public int maxY() { return layers == Layers.ALL ? Integer.MAX_VALUE : layerY; }

    /** Layer mode, build section and Weltplan group together: what hologram, HUD, material list and finder look at. */
    public io.github.freadeax.bauplaner.mod.Filter filter() {
        var f = sectionSet != null ? io.github.freadeax.bauplaner.mod.Filter.sections(minY(), maxY(), sectionSet)
                : new io.github.freadeax.bauplaner.mod.Filter(minY(), maxY(), section);
        return areasApply() ? f.within(showArea) : f;
    }

    // ------------------------------------------------------------ Weltplan groups and locks (GAME-07-S11, 0.19.0)

    /** Dimension of the marks the areas come from; they only apply to a plan placed there. */
    private volatile String areasDimension = "";
    /** Locked Weltplan areas (greyed out, no placement help, skipped by the finder); null = none. */
    private volatile io.github.freadeax.bauplaner.mod.live.MarkAreas.Area lockedArea;
    /** Shown part: the chosen group without hidden groups; null = everything. */
    private volatile io.github.freadeax.bauplaner.mod.live.MarkAreas.Area showArea;
    /** Chosen group, null = all. */
    private volatile String group;
    private volatile long areasVersion;
    private LiveCheck lockedFor;
    private long lockedForVersion = -1;
    private int lockedBlocks;

    /** Set by the website link whenever marks, the chosen group or hidden groups change. */
    void setAreas(String dimension, io.github.freadeax.bauplaner.mod.live.MarkAreas.Area locked, io.github.freadeax.bauplaner.mod.live.MarkAreas.Area show, String chosenGroup) {
        areasDimension = dimension == null ? "" : dimension;
        lockedArea = locked;
        showArea = show;
        group = chosenGroup;
        areasVersion++;
        target = -1;
    }

    private boolean areasApply() { return check != null && areasDimension.equals(check.placement().dimension()); }

    /** Chosen Weltplan group (null = all). */
    public String group() { return group; }

    /** Changes whenever the areas change (render cache key). */
    public long areasVersion() { return areasVersion; }

    /** Whether a column lies in a locked Weltplan area of the plan's dimension. */
    public boolean lockedAt(int x, int z) { return lockedArea != null && areasApply() && lockedArea.contains(x, z); }

    /** Whether any locked area applies to this plan. */
    public boolean hasLocked() { return lockedArea != null && areasApply(); }

    /** Planned blocks of the shown part inside locked areas (cached per check and areas). */
    public int lockedBlocks() {
        if (!hasLocked()) return 0;
        if (lockedFor != check || lockedForVersion != areasVersion) {
            var f = filter();
            int n = 0;
            for (int i = 0; i < check.size(); i++) if (f.test(check, i) && lockedArea.contains(check.worldX(i), check.worldZ(i))) n++;
            lockedBlocks = n;
            lockedFor = check;
            lockedForVersion = areasVersion;
        }
        return lockedBlocks;
    }

    /** What the error finder looks at: the shown part without locked areas. */
    public io.github.freadeax.bauplaner.mod.Filter finderFilter() {
        var f = filter();
        if (!hasLocked()) return f;
        var locked = lockedArea;
        return f.within((x, z) -> !locked.contains(x, z));
    }

    /**
     * Teambau (COOP-03): several sections at once, e.g. "meine Abschnitte" or "freie Abschnitte". Null = off
     * (single section or all). Set by the team client, which keeps it up to date while the team state moves.
     */
    private java.util.Set<Integer> sectionSet;
    private String sectionSetLabel;

    public String sectionSetLabel() { return sectionSet == null ? null : sectionSetLabel; }
    public java.util.Set<Integer> sectionSet() { return sectionSet; }

    /** Shows only these sections (label for HUD and menu); null switches back to all. */
    public void setSectionSet(java.util.Set<Integer> sections, String label) {
        java.util.Set<Integer> next = sections == null ? null : java.util.Set.copyOf(sections);
        if (java.util.Objects.equals(next, sectionSet) && java.util.Objects.equals(label, sectionSetLabel)) return;
        sectionSet = next;
        sectionSetLabel = label;
        section = 0;
        target = -1;
    }

    public List<String> sectionNames() { return plan == null ? List.of() : plan.sectionNames(); }
    public int section() { return section; }
    /** Name of the active section, or null for all. */
    public String sectionName() { return section == 0 || section > sectionNames().size() ? null : sectionNames().get(section - 1); }

    /** Choose a build section (0 = all). Returns a message for the player. */
    public String setSection(int n) {
        if (check == null) return t("Kein Plan eingeblendet.", "No plan shown.");
        var names = sectionNames();
        if (names.isEmpty()) return t("Dieser Plan hat keine Bauabschnitte. Auf der Website im Tab „Baustelle“ Abschnitte anlegen und neu exportieren.", "This plan has no build sections. Add sections in the website tab “Site” and export again.");
        if (n < 0 || n > names.size()) return t("Abschnitt " + n + " gibt es nicht (1–" + names.size() + ").", "There is no section " + n + " (1–" + names.size() + ").");
        section = n;
        sectionSet = null;
        announced = 0;
        target = -1;
        if (layers != Layers.ALL) layerY = firstOpenLayer();
        return n == 0 ? t("Alle Bauabschnitte.", "All build sections.") : t("Abschnitt ", "Section ") + n + "/" + names.size() + ": „" + names.get(n - 1) + "“ – " + sectionLine(n);
    }

    /** Next or previous section, cycling through "all". */
    public String stepSection(int d) {
        int count = sectionNames().size();
        if (check == null || count == 0) return setSection(section);
        return setSection(Math.floorMod(section + d, count + 1));
    }

    /** First section in build order that still has work, or 0 when all are done. */
    public int firstOpenSection() {
        int count = sectionNames().size();
        for (int k = 1; k <= count; k++) if (open(k) > 0) return k;
        return 0;
    }

    /** Open (missing, wrong, misaligned) blocks of a section. */
    public int open(int k) {
        int[] c = check.count(new io.github.freadeax.bauplaner.mod.Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, k));
        return c[Verdict.MISSING.ordinal()] + c[Verdict.WRONG.ordinal()] + c[Verdict.STATE.ordinal()];
    }

    /** "73 % · 12 offen" for one section. */
    public String sectionLine(int k) {
        int[] c = check.count(new io.github.freadeax.bauplaner.mod.Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, k));
        int total = 0;
        for (int v : c) total += v;
        int ok = c[Verdict.OK.ordinal()], open = c[Verdict.MISSING.ordinal()] + c[Verdict.WRONG.ordinal()] + c[Verdict.STATE.ordinal()];
        return (total == 0 ? 100 : ok * 100 / total) + " % · " + open + t(" offen", " open") + (c[Verdict.UNKNOWN.ordinal()] > 0 ? " · " + c[Verdict.UNKNOWN.ordinal()] + t(" nicht geladen", " not loaded") : "");
    }

    public boolean xray() { return xray; }
    public void toggleXray() { xray = !xray; saveSettings(); }

    /** Next layer mode: all → one layer → up to the layer → all. Starts at the lowest layer that still has work. */
    public void cycleLayers() {
        if (check == null) return;
        layers = Layers.values()[(layers.ordinal() + 1) % Layers.values().length];
        if (layers == Layers.ONE) layerY = firstOpenLayer();
        target = -1;
        saveSettings();
    }

    public void setLayers(Layers mode, int y) { layers = mode; layerY = y; target = -1; saveSettings(); }

    /** One layer up or down, inside the plan box. */
    public void stepLayer(int dy) {
        if (check == null) return;
        if (layers == Layers.ALL) { layers = Layers.ONE; layerY = firstOpenLayer(); }
        else {
            int[] box = check.worldBox();
            layerY = Math.max(box[1], Math.min(box[4], layerY + dy));
        }
        target = -1;
        saveSettings();
    }

    public void toggleTextured() { textured = !textured; saveSettings(); }

    /** Lowest world height with missing, wrong or misaligned blocks; the bottom of the box when everything is done. */
    private int firstOpenLayer() {
        int best = Integer.MAX_VALUE;
        var f = filter();
        for (int i = 0; i < check.size(); i++) {
            var v = check.verdict(i);
            if (!f.keeps(check.plan().section(i)) || f.area() != null && !f.area().contains(check.worldX(i), check.worldZ(i))) continue;
            if (v != Verdict.OK && v != Verdict.UNKNOWN) best = Math.min(best, check.worldY(i));
        }
        return best == Integer.MAX_VALUE ? check.worldBox()[1] : best;
    }

    private Path settingsFile() { return root.resolve("einstellungen.properties"); }

    private void loadSettings() {
        var props = new java.util.Properties();
        try (var r = Files.newBufferedReader(settingsFile())) { props.load(r); } catch (IOException | RuntimeException ignored) { return; }
        textured = !"false".equals(props.getProperty("texturen"));
        guard = io.github.freadeax.bauplaner.mod.PlacementAdvice.Guard.parse(props.getProperty("platzierhilfe"), guard);
        xray = "true".equals(props.getProperty("roentgen"));
        // Before 0.29.0 there was no "auto": everyone moves to it once, a choice made afterwards is kept.
        budget = props.getProperty("leistung.auto") == null ? Budget.AUTO : Budget.parse(props.getProperty("leistung"), Budget.AUTO);
    }

    private void saveSettings() {
        var props = new java.util.Properties();
        props.setProperty("texturen", Boolean.toString(textured));
        props.setProperty("platzierhilfe", guard.name());
        props.setProperty("roentgen", Boolean.toString(xray));
        props.setProperty("leistung", budget.label);
        props.setProperty("leistung.auto", "1");
        try {
            Files.createDirectories(root);
            try (var w = Files.newBufferedWriter(settingsFile())) { props.store(w, "Build-Studio-Mod: Einstellungen"); }
        } catch (IOException ignored) { }
    }

    public List<String> planFiles() {
        try (Stream<Path> files = Files.list(plansDir())) {
            return files.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(".schem")).sorted(String.CASE_INSENSITIVE_ORDER).toList();
        } catch (IOException e) {
            return List.of();
        }
    }

    /** World joined: restore what was placed here last time. Returns a message for the player or null. */
    public String join(Minecraft mc) {
        clearState();
        worldKey = McCompat.worldKey(mc);
        try {
            var entry = store.get(worldKey);
            if (entry.isEmpty()) return null;
            var e = entry.get();
            Path file = plansDir().resolve(e.planFile());
            visible = e.visible();
            if (Files.size(file) >= ASYNC_FILE_BYTES) {
                loadInBackground(e.planFile(), e.placement(), t("wieder eingeblendet", "shown again"));
                return t("Großer Plan „" + e.planFile() + "“ wird im Hintergrund geladen …", "Large plan “" + e.planFile() + "” is loading in the background …");
            }
            plan = PlanModel.read(file);
            planFile = e.planFile();
            check = new LiveCheck(plan, e.placement());
            wanted = check.placement();
            return t("Plan „" + plan.name() + "“ wieder eingeblendet (" + planFile + ").", "Plan “" + plan.name() + "” shown again (" + planFile + ").");
        } catch (IOException | RuntimeException ex) {
            clearState();
            return t("Gespeicherte Platzierung konnte nicht geladen werden: ", "Saved placement could not be loaded: ") + ex.getMessage();
        }
    }

    public void leave() { clearState(); worldKey = null; }

    private void clearState() { plan = null; planFile = null; check = null; target = -1; visible = true; layers = Layers.ALL; section = 0; sectionSet = null; announced = 0; wanted = null; generation++; pending = null; loadingFile = null; }

    /** Builds the check of an already read plan on the loader thread; {@link #tick} installs it. */
    private void checkInBackground(String file, PlanModel p, Placement at, String message) {
        long gen = ++generation;
        wanted = at;
        loadingFile = file;
        LOADER.execute(() -> {
            try { pending = new Pending(gen, file, p, new LiveCheck(p, at), message, null); }
            catch (RuntimeException | OutOfMemoryError ex) { pending = new Pending(gen, file, null, null, null, t("Plan „" + file + "“ konnte nicht platziert werden: ", "Plan “" + file + "” could not be placed: ") + ex.getMessage()); }
        });
    }

    /** Reads a plan file and builds its check on the loader thread; {@link #tick} installs it. */
    private void loadInBackground(String file, Placement at, String verb) {
        long gen = ++generation;
        wanted = at;
        loadingFile = file;
        Path path = plansDir().resolve(file);
        LOADER.execute(() -> {
            try {
                PlanModel p = PlanModel.read(path);
                LiveCheck c = new LiveCheck(p, at);
                pending = new Pending(gen, file, p, c, "„" + p.name() + "“ " + verb + " (" + p.blockCount() + t(" Blöcke).", " blocks)."), null);
            } catch (IOException | RuntimeException | OutOfMemoryError ex) {
                pending = new Pending(gen, file, null, null, null, t("Plan „" + file + "“ konnte nicht geladen werden: ", "Plan “" + file + "” could not be loaded: ") + ex.getMessage());
            }
        });
    }

    /**
     * Installs a plan that was read and checked elsewhere (live link: on the web request's thread), so the
     * game thread only swaps references. Returns the chat message.
     */
    public String install(String file, PlanModel p, LiveCheck c) {
        generation++;
        pending = null;
        loadingFile = null;
        if (!file.equals(planFile)) { section = 0; sectionSet = null; announced = 0; }
        plan = p;
        planFile = file;
        visible = true;
        check = c;
        wanted = c.placement();
        target = -1;
        save();
        Placement at = c.placement();
        return t("„" + p.name() + "“ von der Website platziert bei ", "“" + p.name() + "” placed from the website at ") + at.x() + " " + at.y() + " " + at.z() + " (" + p.blockCount() + t(" Blöcke).", " blocks).");
    }

    /** Load a plan and place its project origin on {@code anchor} (keeps turn and mirror of the current placement). */
    public String place(Minecraft mc, String file, BlockPos anchor) throws IOException {
        Placement old = current();
        Placement at = new Placement(McCompat.dimension(mc.level), anchor.getX(), anchor.getY(), anchor.getZ(),
                old == null ? 0 : old.turns(), old != null && old.mirror());
        if (Files.size(plansDir().resolve(file)) >= ASYNC_FILE_BYTES) {
            if (!file.equals(planFile)) { section = 0; sectionSet = null; announced = 0; }
            visible = true;
            loadInBackground(file, at, t("platziert bei ", "placed at ") + anchor.getX() + " " + anchor.getY() + " " + anchor.getZ());
            return t("Großer Plan „" + file + "“ wird im Hintergrund geladen – das Hologramm erscheint gleich.", "Large plan “" + file + "” is loading in the background – the hologram appears shortly.");
        }
        PlanModel p = PlanModel.read(plansDir().resolve(file));
        if (!file.equals(planFile)) { section = 0; sectionSet = null; announced = 0; }
        visible = true;
        String msg = t("„" + p.name() + "“ platziert bei ", "“" + p.name() + "” placed at ") + anchor.getX() + " " + anchor.getY() + " " + anchor.getZ() + " (" + p.blockCount() + t(" Blöcke).", " blocks).");
        if (p.blockCount() >= ASYNC_BLOCKS) { checkInBackground(file, p, at, msg); return t("Großer Plan (" + p.blockCount() + " Blöcke) wird vorbereitet – das Hologramm erscheint gleich.", "Large plan (" + p.blockCount() + " blocks) is being prepared – the hologram appears shortly."); }
        plan = p;
        planFile = file;
        apply(at);
        return msg;
    }

    /** Live link: move the current plan to an exact placement. */
    public boolean setPlacement(Placement at) {
        if (check == null) return false;
        if (at.equals(current())) return true;
        apply(at);
        return true;
    }

    public String worldKey() { return worldKey; }

    public void move(int dx, int dy, int dz) { if (check != null) { layerY += dy; apply(current().moved(dx, dy, dz)); } }
    public void moveTo(BlockPos pos) { if (check != null) { Placement p = current(); apply(new Placement(p.dimension(), pos.getX(), pos.getY(), pos.getZ(), p.turns(), p.mirror())); } }
    public void turn(int quarterTurns) { if (check != null) apply(current().turned(quarterTurns)); }
    public void mirror() { if (check != null) apply(current().mirrored()); }

    public void toggleVisible() {
        if (check == null) return;
        visible = !visible;
        save();
    }

    /** Remove the plan from this world (the plan file stays). */
    public void remove() {
        clearState();
        if (worldKey != null) try { store.remove(worldKey); } catch (IOException ignored) { }
    }

    private void apply(Placement p) {
        long gen = ++generation;
        pending = null;
        wanted = p;
        target = -1;
        if (plan.blockCount() < ASYNC_BLOCKS || check == null || check.plan() != plan) {
            check = new LiveCheck(plan, p);
            save();
            return;
        }
        // Big plan: build the check for the new place in the background; the old one stays visible meanwhile.
        PlanModel pm = plan;
        String file = planFile;
        LOADER.execute(() -> {
            try { pending = new Pending(gen, file, pm, new LiveCheck(pm, p), null, null); }
            catch (RuntimeException | OutOfMemoryError ex) { pending = new Pending(gen, file, null, null, null, t("Hologramm konnte nicht verschoben werden: ", "Hologram could not be moved: ") + ex.getMessage()); }
        });
    }

    /** Installs a finished background result (game thread). Older results than the newest request are dropped. */
    private void installPending(Minecraft mc) {
        Pending p = pending;
        if (p == null) return;
        pending = null;
        if (p.generation() != generation) return;
        loadingFile = null;
        if (p.error() != null) {
            if (check == null) wanted = null;
            else wanted = check.placement();
            McCompat.chat(mc, net.minecraft.network.chat.Component.literal("[Build Studio] " + p.error()));
            return;
        }
        plan = p.plan();
        planFile = p.file();
        check = p.check();
        wanted = check.placement();
        target = -1;
        save();
        if (p.message() != null) McCompat.chat(mc, net.minecraft.network.chat.Component.literal("[Build Studio] " + p.message()));
    }

    private void save() {
        if (worldKey == null || check == null) return;
        try {
            store.put(worldKey, new PlacementStore.Entry(planFile, check.placement(), visible));
        } catch (IOException ignored) {
            // Saving is a convenience; the hologram keeps working.
        }
    }

    /** Compare a slice of the planned blocks with the world. Only in the plan's dimension. */
    public void tick(Minecraft mc) {
        installPending(mc);
        if (check == null || mc.level == null) return;
        if (!McCompat.dimension(mc.level).equals(check.placement().dimension())) return;
        check.sweep(McCompat.liveReader(mc.level), SWEEP_PER_TICK);
        if (target >= 0 && check.verdict(target) == Verdict.OK) target = -1;
        // Section finished: say so once and name the next one (the player switches, nothing jumps by itself).
        if (section > 0 && announced != section && mc.level.getGameTime() % 20 == 0 && open(section) == 0
                && check.count(new io.github.freadeax.bauplaner.mod.Filter(Integer.MIN_VALUE, Integer.MAX_VALUE, section))[Verdict.UNKNOWN.ordinal()] == 0) {
            announced = section;
            int next = firstOpenSection();
            McCompat.chat(mc, net.minecraft.network.chat.Component.literal("[Build Studio] " + t("Abschnitt „" + sectionName() + "“ fertig.", "Section “" + sectionName() + "” done.")
                    + (next == 0 ? t(" Alle Abschnitte sind fertig.", " All sections are done.") : t(" Weiter mit „" + sectionNames().get(next - 1) + "“: /bauplaner abschnitt " + next + " oder Num /.", " Next: “" + sectionNames().get(next - 1) + "”: /buildplanner section " + next + " or Num /."))));
        }
    }

    public void chunkUnloaded(int cx, int cz) { if (check != null) check.forgetChunk(cx, cz); }

    /** Error finder: highlight the nearest wrong/missing block. Returns the index or -1. */
    public int findNext(double x, double y, double z) {
        if (check == null) return -1;
        target = check.nearestProblem(x, y, z, finderFilter());
        return target;
    }

    public void clearTarget() { target = -1; }

    /** Highlight one cell like the error finder (scaffold hints); -1 switches it off. */
    public void setTarget(int i) { target = check == null || i >= check.size() ? -1 : i; }
}
