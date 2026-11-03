package io.github.freadeax.bauplaner.bridge.paper;

import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.block.Block;
import org.bukkit.block.BlockState;
import org.bukkit.block.Container;
import org.bukkit.block.DoubleChest;
import org.bukkit.block.ShulkerBox;
import org.bukkit.event.inventory.InventoryAction;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.BlockStateMeta;
import org.bukkit.inventory.meta.BundleMeta;
import org.bukkit.inventory.meta.ItemMeta;

/**
 * Read-only access to containers in the world for the checked storage chests (COOP-05). Never changes a
 * block, a block entity or an inventory. Calls whose API differs between Paper 1.18.2 and 26.x fall back
 * like {@link PaperCompat}; {@code InventoryView} (a class before 1.21, an interface since) is never used.
 */
final class StoreWorld {
    private StoreWorld() {}

    /** Position of a container block: dimension and block coordinates. */
    record Pos(String dimension, int x, int y, int z) {
        static Pos of(Location l) { return new Pos(PaperCompat.dimension(l.getWorld()), l.getBlockX(), l.getBlockY(), l.getBlockZ()); }
        static Pos of(Block b) { return new Pos(PaperCompat.dimension(b.getWorld()), b.getX(), b.getY(), b.getZ()); }
        String text() { return x + " " + y + " " + z; }
    }

    /** Block state without a snapshot on Paper (live, cheap); plain Spigot copies it. */
    static BlockState state(Block b) {
        try {
            return b.getState(false);
        } catch (Throwable e) {
            return b.getState();
        }
    }

    /** Whether the block keeps items that can belong to a store (chest, trapped chest, barrel, shulker box …). */
    static boolean isStoreBlock(Block b) {
        BlockState s = state(b);
        return s instanceof org.bukkit.block.Chest || s instanceof org.bukkit.block.Barrel || s instanceof ShulkerBox;
    }

    /** All blocks of the container at {@code b}: two for a double chest, otherwise one; empty if no container. */
    static List<Block> blocks(Block b) {
        List<Block> out = new ArrayList<>();
        if (!isStoreBlock(b)) return out;
        InventoryHolder h = holder(((Container) state(b)).getInventory());
        if (h instanceof DoubleChest dc) {
            for (InventoryHolder side : new InventoryHolder[] { dc.getLeftSide(), dc.getRightSide() })
                if (side instanceof BlockState bs) out.add(bs.getBlock());
        }
        if (out.isEmpty()) out.add(b);
        return out;
    }

    /** Block positions an inventory belongs to (both halves of a double chest); empty for non-block inventories. */
    static List<Pos> positions(Inventory inv) {
        List<Pos> out = new ArrayList<>();
        InventoryHolder h = holder(inv);
        if (h instanceof DoubleChest dc) {
            for (InventoryHolder side : new InventoryHolder[] { dc.getLeftSide(), dc.getRightSide() })
                if (side instanceof BlockState bs) out.add(Pos.of(bs.getLocation()));
        } else if (h instanceof BlockState bs) {
            out.add(Pos.of(bs.getLocation()));
        }
        return out;
    }

    /** Holder without a block state snapshot where Paper offers it (much cheaper), else the Bukkit call. */
    static InventoryHolder holder(Inventory inv) {
        try {
            return inv.getHolder(false);
        } catch (Throwable e) {
            return inv.getHolder();
        }
    }

    /** Live inventory of the container at {@code b}, null if it is none. */
    static Inventory inventory(Block b) {
        return isStoreBlock(b) ? ((Container) state(b)).getInventory() : null;
    }

    /**
     * Item counts of an inventory. Shulker boxes and bundles are opened one level deep (as a player could)
     * and counted with their content; the box itself counts too. Items with a name, enchantment or other
     * special data count as their type and are also listed in {@code special}, so nobody books a named tool
     * as building material without seeing it.
     */
    static TreeMap<String, Long> contents(Inventory inv, TreeMap<String, Long> special) {
        TreeMap<String, Long> out = new TreeMap<>();
        for (ItemStack s : inv.getContents()) add(out, special, s, true);
        return out;
    }

    private static void add(TreeMap<String, Long> out, TreeMap<String, Long> special, ItemStack s, boolean open) {
        if (s == null || s.getType() == Material.AIR || s.getAmount() <= 0) return;
        String id = s.getType().getKey().toString();
        StoreLedger.add(out, id, s.getAmount());
        if (!s.hasItemMeta()) return;
        ItemMeta meta = s.getItemMeta();
        if (special != null && (meta.hasDisplayName() || meta.hasEnchants() || meta.hasLore())) StoreLedger.add(special, id, s.getAmount());
        if (!open) return;
        try {
            if (meta instanceof BlockStateMeta bsm && bsm.hasBlockState() && bsm.getBlockState() instanceof ShulkerBox box)
                for (ItemStack inner : box.getInventory().getContents()) for (int i = 0; i < s.getAmount(); i++) add(out, special, inner, false);
            else if (meta instanceof BundleMeta bundle && bundle.hasItems())
                for (ItemStack inner : bundle.getItems()) for (int i = 0; i < s.getAmount(); i++) add(out, special, inner, false);
        } catch (Throwable e) {
            // Server without readable shulker/bundle content: the container counts as one item.
        }
    }

    /**
     * Whether a click in an inventory window may take items out of the top inventory (the store).
     * {@code inTop}: the clicked slot belongs to the store. Unknown actions count as taking.
     */
    static boolean mayTake(InventoryAction action, boolean inTop, boolean slotEmpty) {
        String a = action.name();
        if (!inTop) return a.equals("COLLECT_TO_CURSOR"); // double click may gather items from the store
        return switch (a) {
            case "NOTHING", "PLACE_ALL", "PLACE_ONE", "PLACE_SOME" -> false;
            case "HOTBAR_SWAP", "HOTBAR_MOVE_AND_READD", "SWAP_WITH_CURSOR" -> !slotEmpty;
            default -> true;
        };
    }

    /** Whether a click may put items into the store. */
    static boolean mayPut(InventoryAction action, boolean inTop) {
        String a = action.name();
        if (!inTop) return a.equals("MOVE_TO_OTHER_INVENTORY");
        return switch (a) {
            case "NOTHING", "PICKUP_ALL", "PICKUP_HALF", "PICKUP_ONE", "PICKUP_SOME", "DROP_ALL_SLOT", "DROP_ONE_SLOT", "MOVE_TO_OTHER_INVENTORY", "CLONE_STACK" -> false;
            default -> true;
        };
    }
}
