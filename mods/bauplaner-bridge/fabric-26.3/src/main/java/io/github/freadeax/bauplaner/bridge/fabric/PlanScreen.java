package io.github.freadeax.bauplaner.bridge.fabric;

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
final class PlanScreen extends Screen {
    private static final int PER_PAGE = 8;

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
        int left = width / 2 - 210, top = 40;
        for (int i = 0; i < PER_PAGE; i++) {
            int k = page * PER_PAGE + i;
            if (k >= files.size()) break;
            String file = files.get(k);
            String label = (file.equals(hologram.planFile()) ? "▶ " : "") + shorten(file, 30);
            addRenderableWidget(Button.builder(Component.literal(label), b -> place(file)).bounds(left, top + i * 22, 200, 20).build());
        }
        if (pages > 1) {
            addRenderableWidget(Button.builder(Component.literal("◀"), b -> { page = (page + pages - 1) % pages; rebuildWidgets(); }).bounds(left, top + PER_PAGE * 22, 40, 20).build());
            addRenderableWidget(Button.builder(Component.literal("▶"), b -> { page = (page + 1) % pages; rebuildWidgets(); }).bounds(left + 160, top + PER_PAGE * 22, 40, 20).build());
        }
        int rx = width / 2 + 10;
        if (hologram.active()) {
            int y = top;
            addRenderableWidget(Button.builder(Component.literal("Hierher (angeschauter Block)"), b -> act(() -> hologram.moveTo(lookedAt), "Verschoben.")).bounds(rx, y, 200, 20).build());
            y += 24;
            y = row(rx, y, "X", 1, 0, 0);
            y = row(rx, y, "Y", 0, 1, 0);
            y = row(rx, y, "Z", 0, 0, 1);
            addRenderableWidget(Button.builder(Component.literal("⟲ Links drehen"), b -> act(() -> hologram.turn(-1), "Gedreht.")).bounds(rx, y, 98, 20).build());
            addRenderableWidget(Button.builder(Component.literal("Rechts drehen ⟳"), b -> act(() -> hologram.turn(1), "Gedreht.")).bounds(rx + 102, y, 98, 20).build());
            y += 22;
            addRenderableWidget(Button.builder(Component.literal("Spiegeln"), b -> act(hologram::mirror, "Gespiegelt.")).bounds(rx, y, 98, 20).build());
            addRenderableWidget(Button.builder(Component.literal(hologram.visible() ? "Ausblenden" : "Einblenden"), b -> act(hologram::toggleVisible, "")).bounds(rx + 102, y, 98, 20).build());
            y += 22;
            addRenderableWidget(Button.builder(Component.literal("Plan entfernen"), b -> act(hologram::remove, "Plan entfernt.")).bounds(rx, y, 200, 20).build());
        }
        addRenderableWidget(Button.builder(Component.literal("Fertig"), b -> onClose()).bounds(width / 2 - 50, height - 28, 100, 20).build());
    }

    /** One axis: −10, −1, +1, +10. */
    private int row(int rx, int y, String axis, int ax, int ay, int az) {
        int[] steps = { -10, -1, 1, 10 };
        for (int i = 0; i < steps.length; i++) {
            int s = steps[i];
            addRenderableWidget(Button.builder(Component.literal(axis + (s > 0 ? "+" : "") + s), b -> act(() -> hologram.move(ax * s, ay * s, az * s), ""))
                    .bounds(rx + i * 50, y, 48, 20).build());
        }
        return y + 22;
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
        g.centeredText(font, title, width / 2, 12, 0xFFFFFFFF);
        int left = width / 2 - 210;
        if (hologram.planFiles().isEmpty()) {
            g.text(font, "Keine Pläne gefunden. Plan auf der Website", left, 44, 0xFFFFFFFF, true);
            g.text(font, "exportieren und hier ablegen:", left, 56, 0xFFFFFFFF, true);
            g.text(font, shorten(hologram.plansDir().toString(), 60), left, 70, 0xFFB0B0B0, true);
        } else {
            g.text(font, "Pläne", left, 28, 0xFFB0B0B0, true);
            g.text(font, "Klick: am angeschauten Block platzieren", left, 40 + PER_PAGE * 22 + 24, 0xFFB0B0B0, true);
        }
        int rx = width / 2 + 10;
        if (hologram.active()) {
            var p = hologram.check().placement();
            g.text(font, "Ursprung " + p.x() + " " + p.y() + " " + p.z() + " · " + p.turns() * 90 + "°" + (p.mirror() ? " · gespiegelt" : ""), rx, 28, 0xFFB0B0B0, true);
        } else {
            g.text(font, "Noch kein Plan platziert.", rx, 44, 0xFFB0B0B0, true);
            g.text(font, "Tasten: J Menü · , ein/aus · . Fehler", rx, 60, 0xFFB0B0B0, true);
            g.text(font, "Pfeile/Bild↑↓ schieben · Ende drehen · Einfg spiegeln", rx, 72, 0xFFB0B0B0, true);
        }
        if (!message.isEmpty()) g.centeredText(font, message, width / 2, height - 44, 0xFF6BE07B);
    }

    @Override
    public boolean isPauseScreen() { return false; }

    private static String shorten(String s, int max) { return s.length() <= max ? s : "…" + s.substring(s.length() - max + 1); }

    static void open(Minecraft mc, Hologram hologram) {
        mc.gui.setScreen(new PlanScreen(hologram, McCompat.targetBlock(mc)));
    }
}
