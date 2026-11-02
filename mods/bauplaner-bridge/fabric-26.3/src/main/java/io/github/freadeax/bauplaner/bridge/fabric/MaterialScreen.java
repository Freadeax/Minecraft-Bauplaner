package io.github.freadeax.bauplaner.bridge.fabric;

import io.github.freadeax.bauplaner.mod.Materials;
import java.util.List;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;

/**
 * Material list of the placed plan (or the shown layers): per block how many are still open, how many
 * are in the player's inventory and how many still have to be fetched. Only reads the own inventory.
 */
final class MaterialScreen extends Screen {
    private static final int ROWS = 12;
    private final Hologram hologram;
    private final Screen parent;
    private List<Materials.Line> lines = List.of();
    private int page;
    private boolean onlyOpen = true;

    MaterialScreen(Hologram hologram, Screen parent) {
        super(Component.literal("Bauplaner – Materialliste"));
        this.hologram = hologram;
        this.parent = parent;
    }

    @Override
    protected void init() {
        lines = hologram.active() ? Materials.of(hologram.check(), hologram.minY(), hologram.maxY()) : List.of();
        if (onlyOpen) lines = lines.stream().filter(l -> l.open() > 0).toList();
        int pages = Math.max(1, (lines.size() + ROWS - 1) / ROWS);
        page = Math.min(page, pages - 1);
        int y = height - 28;
        addRenderableWidget(Button.builder(Component.literal("◀"), b -> { page = (page + pages - 1) % pages; rebuildWidgets(); }).bounds(width / 2 - 160, y, 30, 20).build());
        addRenderableWidget(Button.builder(Component.literal("▶"), b -> { page = (page + 1) % pages; rebuildWidgets(); }).bounds(width / 2 - 126, y, 30, 20).build());
        addRenderableWidget(Button.builder(Component.literal(onlyOpen ? "Alle zeigen" : "Nur offene"), b -> { onlyOpen = !onlyOpen; page = 0; rebuildWidgets(); })
                .bounds(width / 2 - 90, y, 90, 20).build());
        addRenderableWidget(Button.builder(Component.literal("Zurück"), b -> onClose()).bounds(width / 2 + 6, y, 90, 20).build());
    }

    @Override
    public void onClose() { minecraft.gui.setScreen(parent); }

    @Override
    public boolean isPauseScreen() { return false; }

    @Override
    public void extractRenderState(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta) {
        super.extractRenderState(g, mouseX, mouseY, delta);
        g.centeredText(font, title, width / 2, 10, 0xFFFFFFFF);
        if (!hologram.active()) { g.centeredText(font, "Kein Plan platziert.", width / 2, 40, 0xFFB0B0B0); return; }
        String scope = switch (hologram.layers()) {
            case ALL -> "ganzer Plan";
            case ONE -> "nur Ebene " + hologram.layerY();
            case BELOW -> "bis Ebene " + hologram.layerY();
        };
        int open = 0, fetch = 0;
        for (var l : lines) { open += l.open(); fetch += Math.max(0, l.open() - inInventory(l.id())); }
        g.centeredText(font, hologram.plan().name() + " · " + scope + " · " + open + " Blöcke offen, " + fetch + " noch holen", width / 2, 22, 0xFFB0B0B0);
        int left = width / 2 - 170, top = 40, row = 18;
        g.text(font, "Block", left + 22, top, 0xFFB0B0B0, true);
        g.text(font, "offen", left + 210, top, 0xFFB0B0B0, true);
        g.text(font, "Inventar", left + 250, top, 0xFFB0B0B0, true);
        g.text(font, "holen", left + 305, top, 0xFFB0B0B0, true);
        if (lines.isEmpty()) g.text(font, onlyOpen ? "Alles gebaut – nichts mehr offen." : "Keine Blöcke.", left + 22, top + row, 0xFF6BE07B, true);
        for (int k = 0; k < ROWS; k++) {
            int i = page * ROWS + k;
            if (i >= lines.size()) break;
            var l = lines.get(i);
            int y = top + row * (k + 1);
            Item item = item(l.id());
            if (item != Items.AIR) g.item(new ItemStack(item), left, y - 4);
            String name = McCompat.blockName(io.github.freadeax.bauplaner.mod.BlockState.parse(l.id()));
            if (font.width(name) > 180) name = font.plainSubstrByWidth(name, 176) + "…";
            int have = inInventory(l.id()), need = Math.max(0, l.open() - have);
            int done = l.open() == 0 ? 0xFF6BE07B : 0xFFFFFFFF;
            g.text(font, name, left + 22, y, done, true);
            g.text(font, Integer.toString(l.open()), left + 210, y, done, true);
            g.text(font, Integer.toString(have), left + 250, y, 0xFFB0B0B0, true);
            g.text(font, need == 0 ? "✓" : Integer.toString(need), left + 305, y, need == 0 ? 0xFF6BE07B : 0xFFFFD54A, true);
        }
        int pages = Math.max(1, (lines.size() + ROWS - 1) / ROWS);
        g.text(font, "Seite " + (page + 1) + " / " + pages + "  ·  Shulkerkisten im Inventar werden nicht mitgezählt", left, height - 44, 0xFF808080, true);
    }

    private static Item item(String id) {
        var key = Identifier.tryParse(id);
        if (key == null) return Items.AIR;
        return BuiltInRegistries.BLOCK.getOptional(key).map(b -> b.asItem()).orElse(Items.AIR);
    }

    private int inInventory(String id) {
        Item item = item(id);
        if (item == Items.AIR || minecraft.player == null) return 0;
        var inv = minecraft.player.getInventory();
        int n = 0;
        for (int i = 0; i < inv.getContainerSize(); i++) {
            ItemStack s = inv.getItem(i);
            if (s.getItem() == item) n += s.getCount();
        }
        return n;
    }

    static void open(Minecraft mc, Hologram hologram) { mc.gui.setScreen(new MaterialScreen(hologram, mc.gui.screen())); }
}
