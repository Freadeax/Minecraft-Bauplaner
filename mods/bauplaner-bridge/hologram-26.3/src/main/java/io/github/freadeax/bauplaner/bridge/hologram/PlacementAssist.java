package io.github.freadeax.bauplaner.bridge.hologram;

import static io.github.freadeax.bauplaner.mod.Lang.t;

import io.github.freadeax.bauplaner.mod.BlockRules.Verdict;
import io.github.freadeax.bauplaner.mod.PlacementAdvice;
import io.github.freadeax.bauplaner.mod.PlacementAdvice.Guard;
import io.github.freadeax.bauplaner.mod.PlacementAdvice.Half;
import io.github.freadeax.bauplaner.mod.PlacementAdvice.Judgement;
import io.github.freadeax.bauplaner.mod.PlacementAdvice.Kind;
import io.github.freadeax.bauplaner.mod.PlacementAdvice.Pitch;
import io.github.freadeax.bauplaner.mod.PlacementAdvice.Way;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.client.Minecraft;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.BedBlock;
import net.minecraft.world.level.block.BellBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.ButtonBlock;
import net.minecraft.world.level.block.CakeBlock;
import net.minecraft.world.level.block.ComparatorBlock;
import net.minecraft.world.level.block.DaylightDetectorBlock;
import net.minecraft.world.level.block.DoorBlock;
import net.minecraft.world.level.block.FenceGateBlock;
import net.minecraft.world.level.block.LeverBlock;
import net.minecraft.world.level.block.NoteBlock;
import net.minecraft.world.level.block.RepeaterBlock;
import net.minecraft.world.level.block.TrapDoorBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;

/**
 * Placement helper (stage 3, like Litematica's Easy Place but server-conform): before a right click places
 * a block inside the plan, the game's own placement logic predicts the resulting state. A wrong block or a
 * wrong orientation is not placed (guard "an") and the player is told what to hold and how to click. The
 * click itself is never altered: no faked view direction, no faked hit position, nothing extra is sent.
 * Switching to the right block uses the normal hotbar selection, like pressing a number key.
 */
public final class PlacementAssist {
    /** What belongs where the player is aiming, for the crosshair line. */
    record Aim(BlockPos pos, io.github.freadeax.bauplaner.mod.BlockState planned, Verdict verdict, Kind kind, String advice, int color) {}

    private static final int GREEN = 0xFF6BE07B, YELLOW = 0xFFFFD54A, RED = 0xFFFF6A6A, GREY = 0xFFB0B0B0;
    private static final Method PLACEMENT_STATE = placementStateMethod();

    private final Hologram hologram;
    private Aim aim;
    /** Ways cache: target position + planned state → working ways. */
    private long waysKey = Long.MIN_VALUE;
    private io.github.freadeax.bauplaner.mod.BlockState waysPlanned;
    private Item waysItem;
    private long waysRevision = -1;
    private List<Way> ways = List.of();

    PlacementAssist(Hologram hologram) { this.hologram = hologram; }

    Aim aim() { return aim; }

    private boolean live(Minecraft mc) {
        return hologram.visible() && hologram.guard() != Guard.OFF && mc.level != null && mc.player != null
                && McCompat.dimension(mc.level).equals(hologram.check().placement().dimension());
    }

    // --- right click ---------------------------------------------------------------------------------

    InteractionResult onUse(Player player, Level level, InteractionHand hand, BlockHitResult hit) {
        Minecraft mc = Minecraft.getInstance();
        if (!level.isClientSide() || player != mc.player || !live(mc)) return InteractionResult.PASS;
        ItemStack stack = player.getItemInHand(hand);
        if (!(stack.getItem() instanceof BlockItem item)) return InteractionResult.PASS;
        if (!player.isSecondaryUseActive() && interactive(level, hit.getBlockPos())) return InteractionResult.PASS;
        BlockPlaceContext ctx = item.updatePlacementContext(new BlockPlaceContext(player, hand, stack, hit));
        if (ctx == null || !ctx.canPlace()) return InteractionResult.PASS;
        BlockPos pos = ctx.getClickedPos();
        int i = hologram.check().indexAt(pos.getX(), pos.getY(), pos.getZ());
        // GAME-07-S11: a locked Weltplan area is left alone – no help, no guard.
        if (i < 0 || hologram.lockedAt(pos.getX(), pos.getZ())) return InteractionResult.PASS;
        var planned = hologram.check().expected(i);
        BlockState predicted = predict(item, ctx);
        if (predicted == null) return InteractionResult.PASS;
        Judgement j = PlacementAdvice.judge(planned, McCompat.modState(predicted), item == plannedItem(planned));
        if (j.kind() == Kind.RIGHT || j.kind() == Kind.NOT_PLANNED) return InteractionResult.PASS;
        Guard guard = hologram.guard();
        String name = McCompat.blockName(planned);
        if (j.kind() == Kind.WRONG_BLOCK) {
            int slot = hotbarSlot(player, plannedItem(planned));
            if (guard == Guard.ON && slot >= 0) {
                player.getInventory().setSelectedSlot(slot);
                say(mc, t("Richtigen Block genommen: " + name + " – nochmal klicken", "Took the right block: " + name + " – click again"), GREEN);
                return InteractionResult.FAIL;
            }
            say(mc, t("Hier gehört " + name + " hin", name + " belongs here") + where(player, plannedItem(planned)), guard == Guard.ON ? RED : YELLOW);
            return guard == Guard.ON ? InteractionResult.FAIL : InteractionResult.PASS;
        }
        List<Way> found = ways(mc, pos, planned, item, hand);
        if (found.isEmpty()) {
            // The plan wants a state that no click produces here (yet): never lock the player out.
            say(mc, name + t(": Ausrichtung so nicht direkt setzbar – ", ": this facing cannot be placed directly – ") + String.join(", ", j.differences()), YELLOW);
            return InteractionResult.PASS;
        }
        String how = PlacementAdvice.advice(found, PlacementAdvice.yawOf(player.getYRot()), PlacementAdvice.pitchOf(player.getXRot()));
        say(mc, (guard == Guard.ON ? t("Nicht gesetzt – ", "Not placed – ") : t("Achtung – ", "Careful – ")) + how, guard == Guard.ON ? YELLOW : RED);
        return guard == Guard.ON ? InteractionResult.FAIL : InteractionResult.PASS;
    }

    // --- left click ----------------------------------------------------------------------------------

    /** Correct plan blocks are not broken while the guard is on (also not by accident while running). */
    InteractionResult onAttack(Player player, Level level, BlockPos pos) {
        Minecraft mc = Minecraft.getInstance();
        if (!level.isClientSide() || player != mc.player || !live(mc) || hologram.guard() != Guard.ON) return InteractionResult.PASS;
        int i = hologram.check().indexAt(pos.getX(), pos.getY(), pos.getZ());
        if (i < 0 || hologram.check().verdict(i) != Verdict.OK || hologram.lockedAt(pos.getX(), pos.getZ())) return InteractionResult.PASS;
        say(mc, t("Geschützt: richtig gesetzter Planblock (Platzierhilfe im Menü J auf „nur warnen“ stellen zum Abbauen)", "Protected: correctly placed plan block (set the placement helper in menu J to “warn only” to break it)"), GREY);
        return InteractionResult.FAIL;
    }

    // --- key: block from the plan into the hand ------------------------------------------------------

    void pick(Minecraft mc) {
        if (mc.player == null || !hologram.active()) return;
        Aim a = aim;
        if (a == null) { say(mc, t("Kein offener Planblock im Blick", "No open plan block in view"), GREY); return; }
        Item item = plannedItem(a.planned());
        String name = McCompat.blockName(a.planned());
        int slot = hotbarSlot(mc.player, item);
        if (slot >= 0) { mc.player.getInventory().setSelectedSlot(slot); say(mc, name + t(" in der Hand", " in hand"), GREEN); }
        else say(mc, name + where(mc.player, item), RED);
    }

    // --- per tick: what the player aims at ----------------------------------------------------------

    void tick(Minecraft mc) {
        aim = null;
        if (!hologram.visible() || mc.level == null || mc.player == null) return;
        if (!McCompat.dimension(mc.level).equals(hologram.check().placement().dimension())) return;
        Player player = mc.player;
        ItemStack stack = player.getMainHandItem();
        BlockPos pos = null;
        BlockPlaceContext ctx = null;
        if (mc.hitResult instanceof BlockHitResult hit && hit.getType() == HitResult.Type.BLOCK) {
            if (stack.getItem() instanceof BlockItem item) {
                ctx = item.updatePlacementContext(new BlockPlaceContext(player, InteractionHand.MAIN_HAND, stack, hit));
                if (ctx != null) pos = ctx.getClickedPos();
            } else {
                pos = mc.level.getBlockState(hit.getBlockPos()).canBeReplaced() ? hit.getBlockPos() : hit.getBlockPos().relative(hit.getDirection());
            }
        }
        var check = hologram.check();
        int i = pos == null ? -1 : check.indexAt(pos.getX(), pos.getY(), pos.getZ());
        if (i < 0 || check.verdict(i) == Verdict.OK) { ctx = null; i = rayTarget(mc); }
        if (i < 0) return;
        pos = new BlockPos(check.worldX(i), check.worldY(i), check.worldZ(i));
        var planned = check.expected(i);
        Verdict verdict = check.verdict(i);
        String name = McCompat.blockName(planned);
        Item want = plannedItem(planned);
        if (hologram.lockedAt(pos.getX(), pos.getZ())) { aim = new Aim(pos, planned, verdict, Kind.NOT_PLANNED, name + t(" – gesperrter Bereich im Weltplan, Platzierhilfe ruht", " – locked area in the world plan, placement helper pauses"), GREY); return; }
        if (verdict == Verdict.WRONG) { aim = new Aim(pos, planned, verdict, Kind.WRONG_BLOCK, name + t(" – falscher Block steht hier, erst abbauen", " – wrong block here, break it first"), RED); return; }
        if (!(stack.getItem() instanceof BlockItem item) || item != want) {
            String held = hotbarSlot(player, want) >= 0 ? t(" (Num 8 nimmt ihn in die Hand)", " (Num 8 puts it in your hand)") : where(player, want);
            aim = new Aim(pos, planned, verdict, Kind.WRONG_BLOCK, name + held, YELLOW);
            return;
        }
        List<Way> found = ways(mc, pos, planned, item, InteractionHand.MAIN_HAND);
        Kind kind = Kind.WRONG_STATE;
        if (ctx != null && ctx.getClickedPos().equals(pos)) {
            BlockState predicted = predict(item, ctx);
            if (predicted != null) kind = PlacementAdvice.judge(planned, McCompat.modState(predicted), true).kind();
        }
        if (kind == Kind.RIGHT) { aim = new Aim(pos, planned, verdict, kind, name + t(" ✓ so setzen", " ✓ place like this"), GREEN); return; }
        String how = PlacementAdvice.advice(found, PlacementAdvice.yawOf(player.getYRot()), PlacementAdvice.pitchOf(player.getXRot()));
        aim = new Aim(pos, planned, verdict, kind, name + " – " + (how == null ? t("frei setzen", "place freely") : how), how == null ? GREY : YELLOW);
    }

    /** First open plan position along the view ray within reach (the hologram itself is not solid). */
    private int rayTarget(Minecraft mc) {
        var check = hologram.check();
        Vec3 eye = mc.player.getEyePosition();
        Vec3 dir = mc.player.getViewVector(1f);
        double reach = mc.player.blockInteractionRange();
        BlockPos.MutableBlockPos p = new BlockPos.MutableBlockPos();
        for (double d = 0.3; d <= reach; d += 0.1) {
            p.set(eye.x + dir.x * d, eye.y + dir.y * d, eye.z + dir.z * d);
            int i = check.indexAt(p.getX(), p.getY(), p.getZ());
            if (i >= 0 && check.verdict(i) != Verdict.OK && check.verdict(i) != Verdict.UNKNOWN) return i;
            if (!mc.level.getBlockState(p).canBeReplaced()) return -1;
        }
        return -1;
    }

    // --- prediction ----------------------------------------------------------------------------------

    /** State the item would place, with the item's own logic (wall torches, signs, slabs into double slabs). */
    private static BlockState predict(BlockItem item, BlockPlaceContext ctx) {
        try {
            if (PLACEMENT_STATE != null) return (BlockState) PLACEMENT_STATE.invoke(item, ctx);
            return item.getBlock().getStateForPlacement(ctx);
        } catch (ReflectiveOperationException | RuntimeException e) {
            return null;
        }
    }

    private static Method placementStateMethod() {
        try {
            Method m = BlockItem.class.getDeclaredMethod("getPlacementState", BlockPlaceContext.class);
            m.setAccessible(true);
            return m;
        } catch (ReflectiveOperationException | RuntimeException e) {
            return null;
        }
    }

    /**
     * All ways of clicking that the game turns into the planned state here: 16 view directions × level/up/down ×
     * every solid neighbour face × lower/upper half. The player's rotation is set only for the calculation and
     * restored at once, inside one tick; it is never sent.
     */
    private List<Way> ways(Minecraft mc, BlockPos pos, io.github.freadeax.bauplaner.mod.BlockState planned, BlockItem item, InteractionHand hand) {
        long key = pos.asLong();
        long revision = hologram.check().revision();
        if (key == waysKey && planned.equals(waysPlanned) && item == waysItem && revision == waysRevision) return ways;
        waysKey = key; waysPlanned = planned; waysItem = item; waysRevision = revision;
        List<Way> out = new ArrayList<>();
        Player player = mc.player;
        Level level = mc.level;
        if (!level.getBlockState(pos).canBeReplaced()) return ways = out;
        ItemStack stack = new ItemStack(item);
        float yRot = player.getYRot(), xRot = player.getXRot();
        try {
            for (Direction side : Direction.values()) {
                BlockPos neighbour = pos.relative(side);
                if (level.getBlockState(neighbour).canBeReplaced()) continue;
                Direction face = side.getOpposite();
                Half[] halves = side.getAxis() == Direction.Axis.Y ? new Half[] { Half.ANY } : new Half[] { Half.LOWER, Half.UPPER };
                for (Half half : halves) {
                    double y = half == Half.LOWER ? 0.25 : half == Half.UPPER ? 0.75 : side == Direction.DOWN ? 0.0 : 1.0;
                    Vec3 at = new Vec3(pos.getX() + 0.5 + side.getStepX() * 0.5, pos.getY() + y, pos.getZ() + 0.5 + side.getStepZ() * 0.5);
                    BlockHitResult hit = new BlockHitResult(at, face, neighbour, false);
                    for (Pitch pitch : Pitch.values()) {
                        for (int yaw = 0; yaw < 16; yaw++) {
                            player.setYRot(PlacementAdvice.yawDegrees(yaw));
                            player.setXRot(PlacementAdvice.pitchDegrees(pitch));
                            BlockPlaceContext ctx = item.updatePlacementContext(new BlockPlaceContext(player, hand, stack, hit));
                            if (ctx == null || !ctx.getClickedPos().equals(pos)) continue;
                            BlockState st = predict(item, ctx);
                            if (st != null && PlacementAdvice.judge(planned, McCompat.modState(st), true).kind() == Kind.RIGHT)
                                out.add(new Way(yaw, pitch, side.getSerializedName(), half));
                        }
                    }
                }
            }
        } finally {
            player.setYRot(yRot);
            player.setXRot(xRot);
        }
        return ways = out;
    }

    // --- helpers -------------------------------------------------------------------------------------

    /** Blocks that react to a right click (doors, chests, buttons …): clicking them is not a placement. */
    private static boolean interactive(Level level, BlockPos pos) {
        BlockState s = level.getBlockState(pos);
        Block b = s.getBlock();
        return s.hasBlockEntity() || s.getMenuProvider(level, pos) != null || b instanceof DoorBlock || b instanceof TrapDoorBlock
                || b instanceof FenceGateBlock || b instanceof ButtonBlock || b instanceof LeverBlock || b instanceof BedBlock
                || b instanceof NoteBlock || b instanceof RepeaterBlock || b instanceof ComparatorBlock || b instanceof BellBlock
                || b instanceof CakeBlock || b instanceof DaylightDetectorBlock;
    }

    static Item plannedItem(io.github.freadeax.bauplaner.mod.BlockState planned) {
        var id = Identifier.tryParse(planned.id());
        if (id == null) return Items.AIR;
        return BuiltInRegistries.BLOCK.getOptional(id).map(Block::asItem).orElse(Items.AIR);
    }

    private static int hotbarSlot(Player player, Item item) {
        if (item == Items.AIR) return -1;
        var inv = player.getInventory();
        int sel = inv.getSelectedSlot();
        if (inv.getItem(sel).getItem() == item) return sel;
        for (int s = 0; s < 9; s++) if (inv.getItem(s).getItem() == item) return s;
        return -1;
    }

    private static String where(Player player, Item item) {
        if (item == Items.AIR) return "";
        var inv = player.getInventory();
        int n = 0;
        for (int s = 9; s < Math.min(36, inv.getContainerSize()); s++) if (inv.getItem(s).getItem() == item) n += inv.getItem(s).getCount();
        if (n > 0) return t(" (nicht in der Schnellleiste, " + n + " im Inventar)", " (not in the hotbar, " + n + " in inventory)");
        // Shulker boxes and bundles count too: the player only has to take it out.
        int packed = McCompat.carried(player).getOrDefault(item, 0);
        return packed > 0 ? t(" (" + packed + " in Shulkerkiste/Bündel)", " (" + packed + " in shulker box/bundle)") : t(" (nicht im Inventar)", " (not in inventory)");
    }

    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger("bauplaner");
    private String lastSaid = "";

    private void say(Minecraft mc, String text, int color) {
        McCompat.overlay(mc, Component.literal(text).withColor(color & 0xFFFFFF));
        // One log line per new message (not per tick while holding a key): game test and bug reports read it.
        if (!text.equals(lastSaid)) LOG.info("[Platzierhilfe] {}", text);
        lastSaid = text;
    }
}
