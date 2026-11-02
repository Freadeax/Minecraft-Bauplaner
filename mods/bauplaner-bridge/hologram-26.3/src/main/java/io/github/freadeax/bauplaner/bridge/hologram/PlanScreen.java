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

    PlanScreen(Hologram hologram, BlockPos lookedAt) {
        super(Component.literal("Bauplaner"));
        this.hologram = hologram;
        this.lookedAt = lookedAt;
    }

    @Override
    protected void init() {
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
        if (hologram.active()) {
            int y = top;
            addRenderableWidget(Button.builder(Component.literal("Hierher (angeschauter Block)"), b -> act(() -> hologram.moveTo(lookedAt), "Verschoben.")).bounds(rx, y, 200, H).build());
            y += STEP;
            y = row(rx, y, "X", 1, 0, 0);
            y = row(rx, y, "Y", 0, 1, 0);
            y = row(rx, y, "Z", 0, 0, 1);
            addRenderableWidget(Button.builder(Component.literal("⟲ Links"), b -> act(() -> hologram.turn(-1), "Gedreht.")).bounds(rx, y, 64, H).build());
            addRenderableWidget(Button.builder(Component.literal("Rechts ⟳"), b -> act(() -> hologram.turn(1), "Gedreht.")).bounds(rx + 68, y, 64, H).build());
            addRenderableWidget(Button.builder(Component.literal("Spiegeln"), b -> act(hologram::mirror, "Gespiegelt.")).bounds(rx + 136, y, 64, H).build());
            y += STEP;
            addRenderableWidget(Button.builder(Component.literal(hologram.visible() ? "Ausblenden" : "Einblenden"), b -> act(hologram::toggleVisible, "")).bounds(rx, y, 98, H).build());
            addRenderableWidget(Button.builder(Component.literal("Plan entfernen"), b -> act(hologram::remove, "Plan entfernt.")).bounds(rx + 102, y, 98, H).build());
            y += STEP;
            addRenderableWidget(Button.builder(Component.literal("Materialliste"), b -> MaterialScreen.open(minecraft, hologram)).bounds(rx, y, 98, H).build());
            addRenderableWidget(Button.builder(Component.literal(hologram.textured() ? "Texturen: an" : "Texturen: aus"), b -> act(hologram::toggleTextured, "")).bounds(rx + 102, y, 98, H).build());
            y += STEP;
            String mode = switch (hologram.layers()) { case ALL -> "Ebenen: alle"; case ONE -> "Ebene " + hologram.layerY() + " allein"; case BELOW -> "Bis Ebene " + hologram.layerY(); };
            addRenderableWidget(Button.builder(Component.literal(mode), b -> act(hologram::cycleLayers, "")).bounds(rx, y, 132, H).build());
            addRenderableWidget(Button.builder(Component.literal("▼"), b -> act(() -> hologram.stepLayer(-1), "")).bounds(rx + 136, y, 30, H).build());
            addRenderableWidget(Button.builder(Component.literal("▲"), b -> act(() -> hologram.stepLayer(1), "")).bounds(rx + 170, y, 30, H).build());
            y += STEP;
            addRenderableWidget(Button.builder(Component.literal("Platzierhilfe: " + hologram.guard().label), b -> act(() -> hologram.setGuard(hologram.guard().next()), switch (hologram.guard().next()) {
                case ON -> "Falscher Block oder falsche Ausrichtung wird nicht gesetzt.";
                case WARN -> "Nur Hinweise, gesetzt wird trotzdem.";
                case OFF -> "Platzierhilfe aus.";
            })).bounds(rx, y, 200, H).build());
        }
        addRenderableWidget(Button.builder(Component.literal("Fertig"), b -> onClose()).bounds(width / 2 - 50, height - 26, 100, 20).build());
    }

    /** One axis: −10, −1, +1, +10. */
    private int row(int rx, int y, String axis, int ax, int ay, int az) {
        int[] steps = { -10, -1, 1, 10 };
        for (int i = 0; i < steps.length; i++) {
            int s = steps[i];
            addRenderableWidget(Button.builder(Component.literal(axis + (s > 0 ? "+" : "") + s), b -> act(() -> hologram.move(ax * s, ay * s, az * s), ""))
                    .bounds(rx + i * 50, y, 48, H).build());
        }
        return y + STEP;
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
        if (!message.isEmpty()) g.centeredText(font, message, width / 2, height - 38, 0xFF6BE07B);
    }

    @Override
    public boolean isPauseScreen() { return false; }

    private static String shorten(String s, int max) { return s.length() <= max ? s : "…" + s.substring(s.length() - max + 1); }

    static void open(Minecraft mc, Hologram hologram) {
        mc.gui.setScreen(new PlanScreen(hologram, McCompat.targetBlock(mc)));
    }
}
