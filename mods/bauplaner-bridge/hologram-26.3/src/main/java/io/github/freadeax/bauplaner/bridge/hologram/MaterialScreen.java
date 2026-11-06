package io.github.freadeax.bauplaner.bridge.hologram;

import static io.github.freadeax.bauplaner.mod.Lang.t;

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
public final class MaterialScreen extends Screen {
    private static final int ROWS = 12;
    private final Hologram hologram;
    private final Screen parent;
    private List<Materials.Line> lines = List.of();
    private int page;
    private boolean onlyOpen = true;
    /** Carried items incl. shulker boxes and bundles, refreshed once a second. */
    private java.util.Map<Item, Integer> carried = java.util.Map.of();
    /** COOP-05 S04: stock in the team's storage chests (plugin count or, via the team room, last seen), per block id. */
    private java.util.Map<String, io.github.freadeax.bauplaner.mod.team.StoreStock.Amount> stock = java.util.Map.of();
    private int ticks;

    MaterialScreen(Hologram hologram, Screen parent) {
        super(Component.literal(t("Build Studio – Materialliste", "Build Studio – material list")));
        this.hologram = hologram;
        this.parent = parent;
    }

    @Override
    protected void init() {
        lines = hologram.active() ? Materials.of(hologram.check(), hologram.filter()) : List.of();
        if (minecraft.player != null) carried = McCompat.carried(minecraft.player);
        refreshStock();
        if (onlyOpen) lines = lines.stream().filter(l -> l.open() > 0).toList();
        int pages = Math.max(1, (lines.size() + ROWS - 1) / ROWS);
        page = Math.min(page, pages - 1);
        int y = height - 28;
        addRenderableWidget(Button.builder(Component.literal("◀"), b -> { page = (page + pages - 1) % pages; rebuildWidgets(); }).bounds(width / 2 - 160, y, 30, 20).build());
        addRenderableWidget(Button.builder(Component.literal("▶"), b -> { page = (page + 1) % pages; rebuildWidgets(); }).bounds(width / 2 - 126, y, 30, 20).build());
        addRenderableWidget(Button.builder(Component.literal(onlyOpen ? t("Alle zeigen", "Show all") : t("Nur offene", "Only open")), b -> { onlyOpen = !onlyOpen; page = 0; rebuildWidgets(); })
                .bounds(width / 2 - 90, y, 90, 20).build());
        addRenderableWidget(Button.builder(Component.literal(t("Zurück", "Back")), b -> onClose()).bounds(width / 2 + 6, y, 90, 20).build());
    }

    @Override
    public void onClose() { minecraft.gui.setScreen(parent); }

    @Override
    public void tick() {
        super.tick();
        if (++ticks % 20 == 0 && minecraft.player != null) { carried = McCompat.carried(minecraft.player); refreshStock(); }
    }

    private void refreshStock() {
        var client = HologramClient.current();
        var team = client == null ? null : client.team().state();
        stock = team == null || !hologram.active() ? java.util.Map.of()
                : io.github.freadeax.bauplaner.mod.team.StoreStock.totals(team.stores(), hologram.check().placement().dimension());
    }

    @Override
    public boolean isPauseScreen() { return false; }

    @Override
    public void extractRenderState(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta) {
        super.extractRenderState(g, mouseX, mouseY, delta);
        g.centeredText(font, title, width / 2, 10, HudCard.TEXT);
        if (!hologram.active()) { g.centeredText(font, t("Kein Plan platziert.", "No plan placed."), width / 2, 40, HudCard.MUTED); return; }
        String scope = switch (hologram.layers()) {
            case ALL -> t("ganzer Plan", "whole plan");
            case ONE -> t("nur Ebene ", "only layer ") + hologram.layerY();
            case BELOW -> t("bis Ebene ", "up to layer ") + hologram.layerY();
        };
        if (hologram.sectionName() != null) scope = t("Abschnitt „", "Section “") + hologram.sectionName() + t("“ · ", "” · ") + scope;
        if (hologram.sectionSetLabel() != null) scope = hologram.sectionSetLabel() + " · " + scope;
        int open = 0, fetch = 0;
        for (var l : lines) { open += l.open(); fetch += Math.max(0, l.open() - inInventory(l.id())); }
        g.centeredText(font, hologram.plan().name() + " · " + scope + " · " + open + t(" Blöcke offen, ", " blocks open, ") + fetch + t(" noch holen", " still to fetch"), width / 2, 22, HudCard.MUTED);
        int left = width / 2 - 170, top = 40, row = 18;
        g.text(font, "Block", left + 22, top, HudCard.MUTED, true);
        g.text(font, "offen", left + 210, top, HudCard.MUTED, true);
        g.text(font, "Inventar", left + 250, top, HudCard.MUTED, true);
        g.text(font, "holen", left + 305, top, HudCard.MUTED, true);
        if (!stock.isEmpty()) g.text(font, "Lager", left + 345, top, HudCard.MUTED, true);
        if (lines.isEmpty()) g.text(font, onlyOpen ? t("Alles gebaut – nichts mehr offen.", "All built – nothing open any more.") : t("Keine Blöcke.", "No blocks."), left + 22, top + row, HudCard.ACCENT, true);
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
            int done = l.open() == 0 ? HudCard.ACCENT : HudCard.TEXT;
            g.text(font, name, left + 22, y, done, true);
            g.text(font, Integer.toString(l.open()), left + 210, y, done, true);
            g.text(font, Integer.toString(have), left + 250, y, HudCard.MUTED, true);
            g.text(font, need == 0 ? "✓" : Integer.toString(need), left + 305, y, need == 0 ? HudCard.ACCENT : HudCard.GOLD, true);
            if (!stock.isEmpty()) {
                var a = stock.getOrDefault(l.id(), io.github.freadeax.bauplaner.mod.team.StoreStock.Amount.NONE);
                g.text(font, a.label(), left + 345, y, a.count() == 0 ? HudCard.DIM : a.count() >= need ? HudCard.ACCENT : HudCard.GOLD, true);
            }
        }
        int pages = Math.max(1, (lines.size() + ROWS - 1) / ROWS);
        boolean seen = stock.values().stream().anyMatch(io.github.freadeax.bauplaner.mod.team.StoreStock.Amount::unverified);
        g.text(font, t("Seite ", "Page ") + (page + 1) + " / " + pages + t("  ·  Inventar zählt Shulkerkisten und Bündel mit", "  ·  inventory counts shulker boxes and bundles") + (stock.isEmpty() ? "" : t("  ·  Lager = Team-Lagerkisten", "  ·  storage = team storage chests") + (seen ? t(", * nur im Spiel gesehen", ", * only seen in game") : "")), left, height - 44, HudCard.DIM, true);
    }

    static Item item(String id) {
        var key = Identifier.tryParse(id);
        if (key == null) return Items.AIR;
        return BuiltInRegistries.BLOCK.getOptional(key).map(b -> b.asItem()).orElse(Items.AIR);
    }

    private int inInventory(String id) {
        Item item = item(id);
        return item == Items.AIR ? 0 : carried.getOrDefault(item, 0);
    }

    static void open(Minecraft mc, Hologram hologram) { mc.gui.setScreen(new MaterialScreen(hologram, mc.gui.screen())); }
}
