package io.github.freadeax.bauplaner.bridge.hologram;

import java.util.List;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;

/**
 * Plan list and placement controls (key J). Left: plan files from {@code bauplaner/plans/}; a click
 * places the plan on the block the player looked at. Right: move, turn, mirror, show/hide, remove.
 */
public final class PlanScreen extends Screen {
    private static final int PER_PAGE = 6, TOP = 36, STEP = 20, H = 18;

    private final Hologram hologram;
    private final BlockPos lookedAt;
    private int page;
    private String message = "";
    private LinkPrompt.Question prompt;
    /** „Später“ was clicked: show the normal menu even though a question is open (the banner stays). */
    private boolean later;
    /**
     * Small window or large GUI scale (e.g. 854×480 at GUI scale 2 = 240 px high): the right column would run into
     * „Befehle & Status“/„Fertig“. Then its rows get tighter and the footer moves under the plan list (left column).
     */
    private boolean compact;
    private int rStep = STEP, rH = H;

    PlanScreen(Hologram hologram, BlockPos lookedAt) {
        super(Component.literal("Bauplaner"));
        this.hologram = hologram;
        this.lookedAt = lookedAt;
    }

    @Override
    protected void init() {
        // LINK-03: an open question (planner wants to connect / server offers the plugin) comes first and alone,
        // centred, so it never overlaps the menu on a small window. After the answer the normal menu follows.
        prompt = later ? null : LinkPrompt.current(HologramClient.current());
        if (prompt != null) {
            LinkPrompt.Question q = prompt;
            int y = height / 2;
            addRenderableWidget(Button.builder(Component.literal(q.yes()), b -> { message = LinkPrompt.answer(HologramClient.current(), q.kind(), true); rebuildWidgets(); })
                    .bounds(width / 2 - 124, y, 140, 20).build());
            addRenderableWidget(Button.builder(Component.literal(q.no()), b -> { message = LinkPrompt.answer(HologramClient.current(), q.kind(), false); rebuildWidgets(); })
                    .bounds(width / 2 + 20, y, 104, 20).build());
            addRenderableWidget(Button.builder(Component.literal("Später"), b -> { later = true; rebuildWidgets(); }).bounds(width / 2 - 50, y + 28, 100, 20).build());
            return;
        }
        List<String> files = hologram.planFiles();
        int pages = Math.max(1, (files.size() + PER_PAGE - 1) / PER_PAGE);
        page = Math.min(page, pages - 1);
        int left = width / 2 - 210, top = TOP;
        for (int i = 0; i < PER_PAGE; i++) {
            int k = page * PER_PAGE + i;
            if (k >= files.size()) break;
            String file = files.get(k);
            String label = (file.equals(hologram.planFile()) ? "▶ " : "") + shorten(file, 30);
            addRenderableWidget(Button.builder(Component.literal(label), b -> place(file)).bounds(left, top + i * STEP, 200, H).build());
        }
        if (pages > 1) {
            addRenderableWidget(Button.builder(Component.literal("◀"), b -> { page = (page + pages - 1) % pages; rebuildWidgets(); }).bounds(left, top + PER_PAGE * STEP, 40, H).build());
            addRenderableWidget(Button.builder(Component.literal("▶"), b -> { page = (page + 1) % pages; rebuildWidgets(); }).bounds(left + 160, top + PER_PAGE * STEP, 40, H).build());
        }
        int rx = width / 2 + 10;
        int rows = 10 + (hologram.sectionNames().isEmpty() ? 0 : 1);
        compact = hologram.active() && TOP + rows * STEP > height - 32;
        rStep = compact ? Math.max(14, Math.min(STEP, (height - 4 - TOP) / rows)) : STEP;
        rH = rStep - 2;
        if (hologram.active()) {
            int y = top;
            addRenderableWidget(Button.builder(Component.literal("Hierher (angeschauter Block)"), b -> act(() -> hologram.moveTo(lookedAt), "Verschoben.")).bounds(rx, y, 200, rH).build());
            y += rStep;
            y = row(rx, y, "X", 1, 0, 0);
            y = row(rx, y, "Y", 0, 1, 0);
            y = row(rx, y, "Z", 0, 0, 1);
            addRenderableWidget(Button.builder(Component.literal("⟲ Links"), b -> act(() -> hologram.turn(-1), "Gedreht.")).bounds(rx, y, 64, rH).build());
            addRenderableWidget(Button.builder(Component.literal("Rechts ⟳"), b -> act(() -> hologram.turn(1), "Gedreht.")).bounds(rx + 68, y, 64, rH).build());
            addRenderableWidget(Button.builder(Component.literal("Spiegeln"), b -> act(hologram::mirror, "Gespiegelt.")).bounds(rx + 136, y, 64, rH).build());
            y += rStep;
            addRenderableWidget(Button.builder(Component.literal(hologram.visible() ? "Ausblenden" : "Einblenden"), b -> act(hologram::toggleVisible, "")).bounds(rx, y, 98, rH).build());
            addRenderableWidget(Button.builder(Component.literal("Plan entfernen"), b -> act(hologram::remove, "Plan entfernt.")).bounds(rx + 102, y, 98, rH).build());
            y += rStep;
            addRenderableWidget(Button.builder(Component.literal("Materialliste"), b -> MaterialScreen.open(minecraft, hologram)).bounds(rx, y, 98, rH).build());
            addRenderableWidget(Button.builder(Component.literal(hologram.textured() ? "Texturen: an" : "Texturen: aus"), b -> act(hologram::toggleTextured, "")).bounds(rx + 102, y, 98, rH).build());
            y += rStep;
            String mode = switch (hologram.layers()) { case ALL -> "Ebenen: alle"; case ONE -> "Ebene " + hologram.layerY() + " allein"; case BELOW -> "Bis Ebene " + hologram.layerY(); };
            addRenderableWidget(Button.builder(Component.literal(mode), b -> act(hologram::cycleLayers, "")).bounds(rx, y, 132, rH).build());
            addRenderableWidget(Button.builder(Component.literal("▼"), b -> act(() -> hologram.stepLayer(-1), "")).bounds(rx + 136, y, 30, rH).build());
            addRenderableWidget(Button.builder(Component.literal("▲"), b -> act(() -> hologram.stepLayer(1), "")).bounds(rx + 170, y, 30, rH).build());
            y += rStep;
            addRenderableWidget(Button.builder(Component.literal("Platzierhilfe: " + hologram.guard().label), b -> act(() -> hologram.setGuard(hologram.guard().next()), switch (hologram.guard().next()) {
                case ON -> "Falscher Block oder falsche Ausrichtung wird nicht gesetzt.";
                case WARN -> "Nur Hinweise, gesetzt wird trotzdem.";
                case OFF -> "Platzierhilfe aus.";
            })).bounds(rx, y, 200, rH).build());
            y += rStep;
            // Build sections from the website (only when the plan file has them) and X-ray.
            if (!hologram.sectionNames().isEmpty()) {
                String name = hologram.sectionName();
                String label = name == null ? "Abschnitt: alle" : hologram.section() + ". " + name;
                if (font.width(label) > 128) label = font.plainSubstrByWidth(label, 122) + "…";
                addRenderableWidget(Button.builder(Component.literal(label), b -> act(() -> hologram.stepSection(1), "")).bounds(rx, y, 132, rH).build());
                addRenderableWidget(Button.builder(Component.literal("◀"), b -> act(() -> hologram.stepSection(-1), "")).bounds(rx + 136, y, 30, rH).build());
                addRenderableWidget(Button.builder(Component.literal("▶"), b -> act(() -> hologram.stepSection(1), "")).bounds(rx + 170, y, 30, rH).build());
                y += rStep;
            }
            addRenderableWidget(Button.builder(Component.literal(hologram.xray() ? "Röntgensicht: an" : "Röntgensicht: aus"), b -> act(hologram::toggleXray, "")).bounds(rx, y, 200, rH).build());
        }
        // GAME-10: every client and server command by click, with status.
        if (HologramClient.current() != null)
            addRenderableWidget(Button.builder(Component.literal("Befehle & Status"), b -> HologramClient.current().openCommands(minecraft))
                    .bounds(compact ? left : width / 2 - 154, height - 26, 100, 20).build());
        addRenderableWidget(Button.builder(Component.literal("Fertig"), b -> onClose()).bounds(compact ? left + 104 : width / 2 - 50, height - 26, compact ? 96 : 100, 20).build());
    }

    /** One axis: −10, −1, +1, +10. */
    private int row(int rx, int y, String axis, int ax, int ay, int az) {
        int[] steps = { -10, -1, 1, 10 };
        for (int i = 0; i < steps.length; i++) {
            int s = steps[i];
            addRenderableWidget(Button.builder(Component.literal(axis + (s > 0 ? "+" : "") + s), b -> act(() -> hologram.move(ax * s, ay * s, az * s), ""))
                    .bounds(rx + i * 50, y, 48, rH).build());
        }
        return y + rStep;
    }

    private void act(Runnable r, String text) {
        r.run();
        message = text;
        rebuildWidgets();
    }

    private void place(String file) {
        try {
            message = hologram.place(minecraft, file, lookedAt);
        } catch (Exception e) {
            message = "Plan nicht lesbar: " + e.getMessage();
        }
        rebuildWidgets();
    }

    @Override
    public void extractRenderState(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta) {
        super.extractRenderState(g, mouseX, mouseY, delta);
        g.centeredText(font, title, width / 2, 10, 0xFFFFFFFF);
        if (prompt != null) {
            g.centeredText(font, "Frage", width / 2, height / 2 - 44, 0xFFB0B0B0);
            g.centeredText(font, prompt.text(), width / 2, height / 2 - 28, 0xFFFFD54A);
            g.centeredText(font, prompt.kind() == LinkPrompt.Kind.PLANER ? "Nur zulassen, wenn du das gerade selbst im Browser angestoßen hast."
                    : "Danach kann der Planer den Server koppeln und einstellen – ohne Befehle.", width / 2, height / 2 - 14, 0xFFB0B0B0);
            if (!message.isEmpty()) g.centeredText(font, message, width / 2, height / 2 + 58, 0xFF6BE07B);
            return;
        }
        int left = width / 2 - 210;
        if (hologram.planFiles().isEmpty()) {
            g.text(font, "Keine Pläne gefunden. Plan auf der Website", left, 44, 0xFFFFFFFF, true);
            g.text(font, "exportieren und hier ablegen:", left, 56, 0xFFFFFFFF, true);
            g.text(font, shorten(hologram.plansDir().toString(), 60), left, 70, 0xFFB0B0B0, true);
        } else {
            g.text(font, "Pläne", left, 25, 0xFFB0B0B0, true);
            g.text(font, "Klick: am angeschauten Block platzieren", left, TOP + PER_PAGE * STEP + 24, 0xFFB0B0B0, true);
        }
        int rx = width / 2 + 10;
        if (hologram.active()) {
            var p = hologram.check().placement();
            g.text(font, "Ursprung " + p.x() + " " + p.y() + " " + p.z() + " · " + p.turns() * 90 + "°" + (p.mirror() ? " · gespiegelt" : ""), rx, 25, 0xFFB0B0B0, true);
        } else {
            g.text(font, "Noch kein Plan platziert.", rx, 44, 0xFFB0B0B0, true);
            g.text(font, "Tasten: J Menü · , ein/aus · . Fehler", rx, 60, 0xFFB0B0B0, true);
            g.text(font, "Pfeile/Bild↑↓ schieben · Ende drehen", rx, 72, 0xFFB0B0B0, true);
            g.text(font, "Einfg spiegeln · Num 7 Material", rx, 84, 0xFFB0B0B0, true);
            g.text(font, "Num 6 Ebenen · Num 9/3 Ebene ▲▼", rx, 96, 0xFFB0B0B0, true);
            g.text(font, "Num 8 Planblock in die Hand", rx, 108, 0xFFB0B0B0, true);
        }
        if (!message.isEmpty()) {
            if (compact) g.text(font, font.width(message) > 200 ? font.plainSubstrByWidth(message, 194) + "…" : message, left, height - 38, 0xFF6BE07B, true);
            else g.centeredText(font, message, width / 2, height - 38, 0xFF6BE07B);
        }
    }

    @Override
    public boolean isPauseScreen() { return false; }

    private static String shorten(String s, int max) { return s.length() <= max ? s : "…" + s.substring(s.length() - max + 1); }

    static void open(Minecraft mc, Hologram hologram) {
        mc.gui.setScreen(new PlanScreen(hologram, McCompat.targetBlock(mc)));
    }
}
