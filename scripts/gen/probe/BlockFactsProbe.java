// BLOCK-01: liest Blockfakten direkt aus dem offiziellen Minecraft-Server (keine Dateien von Mojang
// im Repo). Läuft gegen den entpackten server-<version>.jar samt Bibliotheken:
//
//   java -DbundlerMainClass=net.minecraft.data.Main -jar server.jar --reports --output out   (entpackt versions/ und libraries/)
//   javac -cp "versions/26.3/server-26.3.jar:libraries/..." -d probe scripts/gen/probe/BlockFactsProbe.java
//   java -cp "probe:versions/26.3/server-26.3.jar:libraries/..." BlockFactsProbe out/probe 300
//
// Ausgabe (JSON-Zeilen, nur Fakten): states.jsonl (je Zustand Stützflächen, Halt, Ersetzbarkeit,
// Licht), blocks.jsonl (je Block Klasse, Item, Härte, Schwerkraft), tags.jsonl, grounds.json und
// vectors.jsonl (Prüfvektoren: Zufallsnachbarschaften mit dem Zustand, den das Spiel daraus macht).
// Weiter mit: node scripts/gen/gen_block_facts.mjs out 26.3 5023 <server.jar sha1>  (docs/architecture/formate/BLOCK_LOGIC.md)
import java.io.*;
import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;

import net.minecraft.SharedConstants;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.RegistryAccess;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.Bootstrap;
import net.minecraft.server.packs.repository.ServerPacksSource;
import net.minecraft.tags.TagLoader;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.ScheduledTickAccess;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.Fallable;
import net.minecraft.world.level.block.SupportType;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.Property;
import net.minecraft.world.level.border.WorldBorder;
import net.minecraft.world.level.material.FluidState;
import net.minecraft.world.item.Item;

public final class BlockFactsProbe {
  static final Direction[] DIRS = { Direction.DOWN, Direction.UP, Direction.NORTH, Direction.SOUTH, Direction.WEST, Direction.EAST };
  static final BlockPos O = BlockPos.ZERO;
  static final boolean DEBUG = System.getenv("PROBE_DEBUG") != null;
  static final Set<String> ERRORS = new HashSet<>();

  /** Minimal world: a map of block states, everything else air, full daylight. */
  static final class World implements InvocationHandler {
    final Map<BlockPos, BlockState> blocks = new HashMap<>();
    final WorldBorder border = new WorldBorder();
    int light = 15;
    BlockState at(BlockPos p) { return blocks.getOrDefault(p, Blocks.AIR.defaultBlockState()); }
    public Object invoke(Object proxy, Method m, Object[] a) throws Throwable {
      switch (m.getName()) {
        case "getBlockState": return at((BlockPos) a[0]);
        case "getFluidState": return at((BlockPos) a[0]).getFluidState();
        case "getBlockEntity": return null;
        case "getMinY": return -64;
        case "getHeight": return a == null || a.length == 0 ? 384 : 64;
        case "getRawBrightness": case "getMaxLocalRawBrightness": return light;
        case "getBrightness": return light;
        case "canSeeSky": return light == 15;
        case "getSkyDarken": return 0;
        case "isClientSide": return false;
        case "getSeaLevel": return 63;
        case "hasChunk": case "hasChunkAt": case "isLoaded": return true;
        case "getWorldBorder": return border;
        case "registryAccess": return RegistryAccess.EMPTY;
        case "enabledFeatures": return net.minecraft.world.flag.FeatureFlags.REGISTRY.allFlags();
        case "getEntityCollisions": return List.of();
        case "hashCode": return System.identityHashCode(proxy);
        case "equals": return proxy == a[0];
        case "toString": return "ProbeWorld";
      }
      if (m.isDefault()) return InvocationHandler.invokeDefault(proxy, m, a);
      Class<?> r = m.getReturnType();
      if (r == boolean.class) return false;
      if (r == int.class) return 0;
      if (r == float.class) return 0f;
      if (r == double.class) return 0d;
      if (r == long.class) return 0L;
      return null;
    }
    LevelReader reader() { return (LevelReader) Proxy.newProxyInstance(BlockFactsProbe.class.getClassLoader(), new Class<?>[] { LevelReader.class }, this); }
  }

  static final ScheduledTickAccess TICKS = (ScheduledTickAccess) Proxy.newProxyInstance(BlockFactsProbe.class.getClassLoader(), new Class<?>[] { ScheduledTickAccess.class },
    (p, m, a) -> m.isDefault() ? null : m.getReturnType() == boolean.class ? false : null);

  static String id(Block b) { return BuiltInRegistries.BLOCK.getKey(b).toString(); }
  @SuppressWarnings({ "unchecked", "rawtypes" })
  static String str(BlockState s) {
    StringBuilder sb = new StringBuilder(id(s.getBlock()));
    List<Property<?>> props = new ArrayList<>(s.getProperties());
    props.sort(Comparator.comparing(Property::getName));
    if (!props.isEmpty()) {
      sb.append('[');
      for (int i = 0; i < props.size(); i++) { Property p = props.get(i); if (i > 0) sb.append(','); sb.append(p.getName()).append('=').append(p.getName(s.getValue(p))); }
      sb.append(']');
    }
    return sb.toString();
  }
  static String q(String s) { return '"' + s.replace("\\", "\\\\").replace("\"", "\\\"") + '"'; }

  static int sturdyMask(BlockState s, LevelReader r) {
    int m = 0, bit = 0;
    for (SupportType t : new SupportType[] { SupportType.FULL, SupportType.CENTER, SupportType.RIGID })
      for (Direction d : DIRS) { if (s.isFaceSturdy(r, O, d, t)) m |= 1 << bit; bit++; }
    return m;
  }

  static boolean survives(World w, BlockState s) {
    w.blocks.put(O, s);
    try { return s.canSurvive(w.reader(), O); } catch (Throwable t) { if (DEBUG && ERRORS.add(t.toString())) t.printStackTrace(); return false; } finally { w.blocks.remove(O); }
  }

  /** Below-candidates tested for blocks that do not stand on plain stone (plants, crops, …). */
  static String[] GROUNDS = { "stone", "dirt", "grass_block", "coarse_dirt", "rooted_dirt", "podzol", "mycelium", "moss_block", "mud", "muddy_mangrove_roots", "farmland", "sand", "red_sand",
    "suspicious_sand", "gravel", "clay", "soul_sand", "soul_soil", "netherrack", "crimson_nylium", "warped_nylium", "end_stone", "obsidian", "water", "lava", "ice", "packed_ice", "snow_block",
    "oak_log", "jungle_log", "oak_leaves", "glass", "oak_planks", "oak_fence", "cobblestone_wall", "oak_slab", "magma_block", "pale_moss_block", "basalt", "blackstone", "deepslate",
    "dripstone_block", "terracotta", "cactus", "sugar_cane", "bamboo", "kelp", "chorus_plant", "big_dripleaf_stem", "sculk" };


  /** Reads data/minecraft/tags/<dir>/*.json from the server jar on the class path and binds them like a data load. */
  static <T> void bindTags(net.minecraft.core.Registry<T> reg, net.minecraft.resources.ResourceKey<? extends net.minecraft.core.Registry<T>> key, String dir) throws Exception {
    Map<String, List<String>> raw = new HashMap<>();
    java.net.URL any = Blocks.class.getProtectionDomain().getCodeSource().getLocation();
    try (var zf = new java.util.zip.ZipFile(new File(any.toURI()))) {
      String prefix = "data/minecraft/tags/" + dir + "/";
      for (var e : Collections.list(zf.entries())) {
        String n = e.getName();
        if (!n.startsWith(prefix) || !n.endsWith(".json")) continue;
        var json = com.google.gson.JsonParser.parseReader(new InputStreamReader(zf.getInputStream(e))).getAsJsonObject();
        List<String> vals = new ArrayList<>();
        for (var v : json.getAsJsonArray("values")) vals.add(v.isJsonObject() ? v.getAsJsonObject().get("id").getAsString() : v.getAsString());
        raw.put(n.substring(prefix.length(), n.length() - 5), vals);
      }
    }
    Map<String, Set<String>> resolved = new HashMap<>();
    for (String t : raw.keySet()) resolveTag(t, raw, resolved, new HashSet<>());
    Map<net.minecraft.tags.TagKey<T>, List<net.minecraft.core.Holder<T>>> map = new HashMap<>();
    for (var e : resolved.entrySet()) {
      List<net.minecraft.core.Holder<T>> hs = new ArrayList<>();
      for (String id : e.getValue()) reg.get(net.minecraft.resources.Identifier.parse(id)).ifPresent(hs::add);
      map.put(net.minecraft.tags.TagKey.create(key, net.minecraft.resources.Identifier.withDefaultNamespace(e.getKey())), hs);
    }
    reg.prepareTagReload(new TagLoader.LoadResult<>(key, map)).apply();
    TAGS.put(dir, resolved);
  }
  static final Map<String, Map<String, Set<String>>> TAGS = new HashMap<>();
  static Set<String> resolveTag(String t, Map<String, List<String>> raw, Map<String, Set<String>> done, Set<String> stack) {
    if (done.containsKey(t)) return done.get(t);
    Set<String> out = new TreeSet<>();
    if (!stack.add(t)) return out;
    for (String v : raw.getOrDefault(t, List.of())) {
      if (v.startsWith("#")) out.addAll(resolveTag(v.substring(1).replace("minecraft:", ""), raw, done, stack));
      else out.add(v.contains(":") ? v : "minecraft:" + v);
    }
    done.put(t, out);
    return out;
  }


  static final String[] PREDICATES = { "full", "center", "rigid", "nonair", "solid" };
  static final Map<String, BitSet> PRED_CACHE = new HashMap<>();
  /** Neighbour states (of the pool) that satisfy a support predicate on the face that touches the probed block. */
  static BitSet predicateSet(String pred, List<BlockState> pool, Direction d, LevelReader r) {
    return PRED_CACHE.computeIfAbsent(pred + d, k -> {
      BitSet b = new BitSet();
      for (int i = 0; i < pool.size(); i++) {
        BlockState n = pool.get(i); Direction face = d.getOpposite(); boolean ok;
        switch (pred) {
          case "full": ok = n.isFaceSturdy(r, O, face, SupportType.FULL); break;
          case "center": ok = n.isFaceSturdy(r, O, face, SupportType.CENTER); break;
          case "rigid": ok = n.isFaceSturdy(r, O, face, SupportType.RIGID); break;
          case "nonair": ok = !n.isAir(); break;
          default: ok = n.isSolid(); break;
        }
        if (ok) b.set(i);
      }
      return b;
    });
  }
  static Method IS_COVERED; static Object POST_TEST; static Map<Direction, Object> WALL_TESTS;
  @SuppressWarnings("unchecked")
  static void wallReflection() throws Exception {
    Class<?> wb = net.minecraft.world.level.block.WallBlock.class;
    IS_COVERED = wb.getDeclaredMethod("isCovered", net.minecraft.world.phys.shapes.VoxelShape.class, net.minecraft.world.phys.shapes.VoxelShape.class); IS_COVERED.setAccessible(true);
    Field fp = wb.getDeclaredField("TEST_SHAPE_POST"); fp.setAccessible(true); POST_TEST = fp.get(null);
    Field fw = wb.getDeclaredField("TEST_SHAPES_WALL"); fw.setAccessible(true); WALL_TESTS = (Map<Direction, Object>) fw.get(null);
  }

  public static void main(String[] args) throws Exception {
    Path out = Paths.get(args[0]);
    int vectorsPerFamily = args.length > 1 ? Integer.parseInt(args[1]) : 300;
    Files.createDirectories(out);
    SharedConstants.tryDetectVersion();
    Bootstrap.bootStrap();
    // Bind vanilla block tags (supports_*, fences, walls, …) exactly as a server does on data load.
    bindTags(BuiltInRegistries.BLOCK, net.minecraft.core.registries.Registries.BLOCK, "block");
    bindTags(BuiltInRegistries.FLUID, net.minecraft.core.registries.Registries.FLUID, "fluid");
    // Ground candidates: the fixed list plus every member of a supports_* tag (so the generator can name the exact tag).
    Set<String> groundSet = new LinkedHashSet<>(Arrays.asList(GROUNDS));
    for (var e : new TreeMap<>(TAGS.get("block")).entrySet()) if (e.getKey().startsWith("supports_") || e.getKey().equals("dirt") || e.getKey().equals("sand"))
      for (String id : e.getValue()) groundSet.add(id.replace("minecraft:", ""));
    GROUNDS = groundSet.toArray(new String[0]);
    try (PrintWriter gw = new PrintWriter(Files.newBufferedWriter(out.resolve("grounds.json")))) { gw.println("[" + String.join(",", groundSet.stream().map(BlockFactsProbe::q).toList()) + "]"); }
    wallReflection();
    World w = new World();
    LevelReader r = w.reader();
    if (DEBUG) System.out.println("tags: dirt in supports_vegetation=" + Blocks.DIRT.defaultBlockState().is(net.minecraft.tags.BlockTags.SUPPORTS_VEGETATION) + " dirt tag=" + Blocks.DIRT.defaultBlockState().is(net.minecraft.tags.BlockTags.DIRT));
    RandomSource rnd = RandomSource.create(26_3L);

    List<BlockState> pool = new ArrayList<>();
    String[] poolIds = { "air", "stone", "oak_planks", "glass", "oak_leaves", "oak_fence", "spruce_fence", "nether_brick_fence", "oak_fence_gate", "cobblestone_wall", "stone_brick_wall",
      "glass_pane", "white_stained_glass_pane", "iron_bars", "oak_stairs", "stone_brick_stairs", "oak_slab", "stone_slab", "oak_trapdoor", "oak_door", "torch", "wall_torch", "lantern", "chest",
      "shulker_box", "pumpkin", "carved_pumpkin", "melon", "barrier", "ice", "snow", "dirt", "bookshelf", "oak_log", "hopper", "oak_sign", "soul_lantern", "chain", "copper_bars", "lever",
      "redstone_wire", "water", "honey_block", "scaffolding", "oak_pressure_plate", "white_carpet", "tinted_glass", "cobblestone", "sea_lantern", "grass_block", "beacon", "anvil", "lightning_rod",
      "end_rod", "oak_button", "copper_chain", "redstone_torch", "candle" };
    for (String pid : poolIds) {
      var key = net.minecraft.resources.Identifier.withDefaultNamespace(pid);
      if (!BuiltInRegistries.BLOCK.containsKey(key)) continue;
      pool.addAll(BuiltInRegistries.BLOCK.getValue(key).getStateDefinition().getPossibleStates());
    }
    List<BlockState> supportPool = new ArrayList<>(pool);
    for (String g : GROUNDS) supportPool.add(BuiltInRegistries.BLOCK.getValue(net.minecraft.resources.Identifier.withDefaultNamespace(g)).defaultBlockState());
    // Plants that hold on their own kind (heads and bodies of growing plants, dripleaf, chorus, dripstone …): every state.
    for (String g : new String[] { "kelp", "kelp_plant", "weeping_vines", "weeping_vines_plant", "twisting_vines", "twisting_vines_plant", "cave_vines", "cave_vines_plant",
        "big_dripleaf", "big_dripleaf_stem", "small_dripleaf", "chorus_plant", "chorus_flower", "pointed_dripstone", "bamboo", "sugar_cane", "cactus", "pale_hanging_moss",
        "hanging_roots", "mangrove_propagule", "mangrove_roots", "spore_blossom", "glow_lichen", "seagrass", "tall_seagrass", "sea_pickle", "oak_sapling", "tall_grass" }) {
      var key = net.minecraft.resources.Identifier.withDefaultNamespace(g);
      if (BuiltInRegistries.BLOCK.containsKey(key)) supportPool.addAll(BuiltInRegistries.BLOCK.getValue(key).getStateDefinition().getPossibleStates());
    }
    try (PrintWriter tw = new PrintWriter(Files.newBufferedWriter(out.resolve("tags.jsonl")))) {
      for (var e : new TreeMap<>(TAGS.get("block")).entrySet()) tw.println("{\"tag\":" + q(e.getKey()) + ",\"blocks\":[" + String.join(",", e.getValue().stream().map(BlockFactsProbe::q).toList()) + "]}");
    }
    try (PrintWriter bw = new PrintWriter(Files.newBufferedWriter(out.resolve("blocks.jsonl")));
         PrintWriter sw = new PrintWriter(Files.newBufferedWriter(out.resolve("states.jsonl")))) {
      for (Block b : BuiltInRegistries.BLOCK) {
        BlockState d = b.defaultBlockState();
        List<String> chain = new ArrayList<>();
        for (Class<?> c = b.getClass(); c != null && c != Object.class; c = c.getSuperclass()) chain.add(c.getSimpleName());
        Item item = b.asItem();
        String itemId = BuiltInRegistries.ITEM.getKey(item).toString();
        float hard; try { hard = d.getDestroySpeed(r, O); } catch (Throwable t) { hard = -2; }
        bw.println("{\"id\":" + q(id(b)) + ",\"cls\":[" + String.join(",", chain.stream().map(BlockFactsProbe::q).toList()) + "]"
          + ",\"item\":" + q(itemId) + ",\"hardness\":" + hard + ",\"tool\":" + d.requiresCorrectToolForDrops()
          + ",\"fallable\":" + (b instanceof Fallable) + ",\"states\":" + b.getStateDefinition().getPossibleStates().size() + "}");
        for (BlockState s : b.getStateDefinition().getPossibleStates()) {
          int sturdy = sturdyMask(s, r);
          boolean alone = survives(w, s);
          int dirs = 0;
          if (!alone) for (int i = 0; i < 6; i++) {
            w.blocks.put(O.relative(DIRS[i]), Blocks.STONE.defaultBlockState());
            if (survives(w, s)) dirs |= 1 << i;
            w.blocks.remove(O.relative(DIRS[i]));
          }
          List<String> grounds = new ArrayList<>(), groundsWater = new ArrayList<>(), above = new ArrayList<>(), dark = new ArrayList<>();
          if (!alone && dirs == 0) {
            for (String g : GROUNDS) {
              BlockState gs = BuiltInRegistries.BLOCK.getValue(net.minecraft.resources.Identifier.withDefaultNamespace(g)).defaultBlockState();
              w.blocks.put(O.below(), gs);
              if (survives(w, s)) grounds.add(g);
              else { w.blocks.put(O.below().north(), Blocks.WATER.defaultBlockState()); if (survives(w, s)) groundsWater.add(g); w.blocks.remove(O.below().north()); }
              w.blocks.remove(O.below());
              w.blocks.put(O.above(), gs);
              if (survives(w, s)) above.add(g);
              w.blocks.remove(O.above());
            }
            // Light-dependent grounds (mushrooms grow on any sturdy block in the dark).
            w.light = 0;
            for (String g : GROUNDS) {
              if (grounds.contains(g)) continue;
              BlockState gs = BuiltInRegistries.BLOCK.getValue(net.minecraft.resources.Identifier.withDefaultNamespace(g)).defaultBlockState();
              w.blocks.put(O.below(), gs); if (survives(w, s)) dark.add(g); w.blocks.remove(O.below());
            }
            w.light = 15;
            // Stacking on itself (cactus, sugar cane, bamboo, kelp, vines, …).
            w.blocks.put(O.below(), b.defaultBlockState()); if (survives(w, s)) grounds.add("=self"); w.blocks.remove(O.below());
            w.blocks.put(O.above(), b.defaultBlockState()); if (survives(w, s)) above.add("=self"); w.blocks.remove(O.above());
          }
          FluidState f = s.getFluidState();
          int wc = 0;
          try {
            var face = s.getCollisionShape(r, O).getFaceShape(Direction.DOWN);
            if ((boolean) IS_COVERED.invoke(null, face, POST_TEST)) wc |= 1;
            for (int i = 2; i < 6; i++) if ((boolean) IS_COVERED.invoke(null, face, WALL_TESTS.get(DIRS[i]))) wc |= 1 << (i - 1);
          } catch (Throwable t) { wc = -1; }
          StringBuilder how = new StringBuilder();
          for (int i = 0; i < 6; i++) if ((dirs & (1 << i)) != 0) {
            Direction sd = DIRS[i];
            BitSet pass = new BitSet();
            for (int k = 0; k < supportPool.size(); k++) { w.blocks.put(O.relative(sd), supportPool.get(k)); if (survives(w, s)) pass.set(k); }
            w.blocks.remove(O.relative(sd));
            String fit = null;
            for (String pred : PREDICATES) { if (predicateSet(pred, supportPool, sd, r).equals(pass)) { fit = pred; break; } }
            if (fit == null) {
              BitSet best = null; String bestName = null; int bestDiff = Integer.MAX_VALUE;
              for (String pred : PREDICATES) { BitSet x = (BitSet) predicateSet(pred, supportPool, sd, r).clone(); x.xor(pass); if (x.cardinality() < bestDiff) { bestDiff = x.cardinality(); best = x; bestName = pred; } }
              Set<String> plus = new TreeSet<>(), minus = new TreeSet<>();
              BitSet base = predicateSet(bestName, supportPool, sd, r);
              for (int k = best.nextSetBit(0); k >= 0; k = best.nextSetBit(k + 1)) (pass.get(k) ? plus : minus).add(str(supportPool.get(k)));
              fit = bestName + "|+" + String.join(";", plus) + "|-" + String.join(";", minus);
            }
            if (how.length() > 0) how.append(',');
            how.append(q(sd.getSerializedName())).append(':').append(q(fit));
          }
          sw.println("{\"s\":" + q(str(s)) + ",\"st\":" + sturdy + ",\"full\":" + s.isCollisionShapeFullBlock(r, O) + ",\"alone\":" + alone + ",\"dirs\":" + dirs
            + (grounds.isEmpty() ? "" : ",\"on\":[" + String.join(",", grounds.stream().map(BlockFactsProbe::q).toList()) + "]")
            + (groundsWater.isEmpty() ? "" : ",\"onWater\":[" + String.join(",", groundsWater.stream().map(BlockFactsProbe::q).toList()) + "]")
            + (above.isEmpty() ? "" : ",\"under\":[" + String.join(",", above.stream().map(BlockFactsProbe::q).toList()) + "]")
            + (dark.isEmpty() ? "" : ",\"onDark\":[" + String.join(",", dark.stream().map(BlockFactsProbe::q).toList()) + "]")
            + ",\"repl\":" + s.canBeReplaced() + ",\"light\":" + s.getLightEmission() + ",\"fluid\":" + q(f.isEmpty() ? "" : BuiltInRegistries.FLUID.getKey(f.getType()).toString())
            + ",\"occ\":" + s.canOcclude() + ",\"solid\":" + s.isSolid() + ",\"wc\":" + wc + (how.length() == 0 ? "" : ",\"how\":{" + how + "}") + "}");
        }
      }
    }

    // Prüfvektoren: Nachbarschaften aus einer Mischung echter Zustände, Ergebnis = Spielzustand nach updateShape in alle Richtungen.
    String[] families = { "oak_fence", "nether_brick_fence", "oak_fence_gate", "cobblestone_wall", "glass_pane", "iron_bars", "copper_bars", "oak_stairs", "stone_brick_stairs",
      "grass_block", "mycelium", "podzol", "chest", "redstone_wire", "oak_door", "tall_grass", "vine", "chorus_plant", "brown_mushroom_block", "tripwire" };
    try (PrintWriter vw = new PrintWriter(Files.newBufferedWriter(out.resolve("vectors.jsonl")))) {
      for (String fam : families) {
        var key = net.minecraft.resources.Identifier.withDefaultNamespace(fam);
        if (!BuiltInRegistries.BLOCK.containsKey(key)) continue;
        Block fb = BuiltInRegistries.BLOCK.getValue(key);
        List<BlockState> centers = fb.getStateDefinition().getPossibleStates();
        // Stairs need stair neighbours to form corners: bias the pool.
        List<BlockState> famPool = new ArrayList<>(pool);
        for (int i = 0; i < 3; i++) famPool.addAll(centers);
        for (int n = 0; n < vectorsPerFamily; n++) {
          w.blocks.clear();
          BlockState c = centers.get(rnd.nextInt(centers.size()));
          StringBuilder nb = new StringBuilder();
          for (Direction d : DIRS) {
            if (rnd.nextInt(4) == 0) continue;
            BlockState ns = famPool.get(rnd.nextInt(famPool.size()));
            if (ns.isAir()) continue;
            w.blocks.put(O.relative(d), ns);
            if (nb.length() > 0) nb.append(',');
            nb.append(q(d.getSerializedName())).append(':').append(q(str(ns)));
          }
          // Stairs also look one block further (front/back neighbours' own neighbours).
          if (fam.endsWith("_stairs")) for (Direction d : Direction.Plane.HORIZONTAL) for (Direction e : Direction.Plane.HORIZONTAL) {
            BlockPos p = O.relative(d).relative(e);
            if (p.equals(O) || w.blocks.containsKey(p) || rnd.nextInt(3) != 0) continue;
            BlockState ns = centers.get(rnd.nextInt(centers.size()));
            w.blocks.put(p, ns);
            nb.append(',').append(q(d.getSerializedName() + "+" + e.getSerializedName())).append(':').append(q(str(ns)));
          }
          BlockState s = c;
          w.blocks.put(O, s);
          for (int pass = 0; pass < 2; pass++) for (Direction d : Direction.values()) {
            BlockPos np = O.relative(d);
            try { s = s.updateShape(r, TICKS, O, d, np, w.at(np), rnd); } catch (Throwable t) { s = null; break; }
            if (s.isAir()) break;
            w.blocks.put(O, s);
          }
          if (s == null) continue;
          vw.println("{\"family\":" + q(fam) + ",\"center\":" + q(str(c)) + ",\"n\":{" + nb + "},\"result\":" + q(str(s)) + "}");
        }
      }
      // Halt-Vektoren: zufällige Zustände anbringbarer Blöcke mit zufälligen Nachbarn → canSurvive.
      List<Block> attachables = new ArrayList<>();
      for (Block b : BuiltInRegistries.BLOCK) {
        if (b.defaultBlockState().isAir()) continue;
        boolean any = false;
        for (BlockState s : b.getStateDefinition().getPossibleStates()) if (!survives(w, s)) { any = true; break; }
        if (any) attachables.add(b);
      }
      for (int n = 0; n < vectorsPerFamily * 8; n++) {
        w.blocks.clear();
        Block b = attachables.get(rnd.nextInt(attachables.size()));
        List<BlockState> ss = b.getStateDefinition().getPossibleStates();
        BlockState c = ss.get(rnd.nextInt(ss.size()));
        StringBuilder nb = new StringBuilder();
        for (Direction d : DIRS) {
          if (rnd.nextInt(3) == 0) continue;
          BlockState ns = pool.get(rnd.nextInt(pool.size()));
          if (rnd.nextInt(6) == 0) {
            String g = GROUNDS[rnd.nextInt(GROUNDS.length)];
            ns = BuiltInRegistries.BLOCK.getValue(net.minecraft.resources.Identifier.withDefaultNamespace(g)).defaultBlockState();
          }
          if (ns.isAir()) continue;
          w.blocks.put(O.relative(d), ns);
          if (nb.length() > 0) nb.append(',');
          nb.append(q(d.getSerializedName())).append(':').append(q(str(ns)));
        }
        boolean ok = survives(w, c);
        vw.println("{\"family\":\"survive\",\"center\":" + q(str(c)) + ",\"n\":{" + nb + "},\"survives\":" + ok + "}");
      }
    }
    System.out.println("ok " + BuiltInRegistries.BLOCK.size());
  }
}
