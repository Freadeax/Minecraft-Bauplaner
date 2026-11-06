// BLOCK-01/02 Spielprüfstand: kleines Test-Plugin für einen echten Paper-Server (nur für
// scripts/mod/test_game_placement.sh, wird nicht ausgeliefert). Es setzt Baupläne Block für Block in
// eine flache Welt, lässt danach das Spiel jede Zelle aktualisieren (Formupdate von allen Nachbarn,
// neighborChanged, geplante Ticks, Schwerkraft, Wasser) und schreibt auf, was das Spiel daraus gemacht
// hat: abgefallene, umgewandelte und anders verbundene Blöcke, neu entstandene Blöcke (auslaufendes
// Wasser, gelandeter Sand), fallende Blöcke und Gegenstände als Drops.
//
// Eingabe  plugins/PlacementProbe/jobs/<n>.txt : Zeile 1 "<name>\t<sx> <sy> <sz>[\t<meer>]", dann je Block "x y z state";
//          <meer> gesetzt: Wasser am Planrand setzt sich nach außen fort (Ufer, Meer, Bach, Nachbarmodul)
// Ausgabe  plugins/PlacementProbe/results/<n>.json, danach plugins/PlacementProbe/done.txt; der Server stoppt.
//
// Übersetzt gegen die von Paperclip entpackten Jars (paper-api und der Mojang-gemappte Server):
//   javac -cp "versions/26.3/paper-26.3.jar:libraries/**.jar" -d out PlacementProbe.java
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.block.state.BlockState;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.block.data.BlockData;
import org.bukkit.craftbukkit.CraftWorld;
import org.bukkit.entity.Entity;
import org.bukkit.entity.FallingBlock;
import org.bukkit.entity.Item;
import org.bukkit.plugin.java.JavaPlugin;

public final class PlacementProbe extends JavaPlugin {
  /** Height of the flat world's surface block (grass); plans stand on it. */
  static final int GROUND = -61;
  static final int MARGIN = 3;
  static final int BATCH = 16;

  static final class Job {
    String file, name; int sx, sy, sz, sea = -1;
    int ox, oz; // world position of the plan's min corner (y = GROUND + 1)
    final Map<Long, String> planned = new HashMap<>();
    final List<int[]> order = new ArrayList<>();
  }

  Path dir;
  final List<Job> queue = new ArrayList<>();
  int nextX = 20_000;
  World world;
  ServerLevel level;

  static long key(int x, int y, int z) { return ((long) (x & 0x3FFFFFF) << 38) | ((long) (z & 0x3FFFFFF) << 12) | (y & 0xFFF); }

  @Override
  public void onEnable() {
    dir = getDataFolder().toPath();
    Bukkit.getScheduler().runTaskLater(this, this::begin, 40);
  }

  void begin() {
    try {
      world = Bukkit.getWorlds().get(0);
      level = ((CraftWorld) world).getHandle();
      world.setGameRule(org.bukkit.GameRules.RANDOM_TICK_SPEED, 0);
      world.setGameRule(org.bukkit.GameRules.SPAWN_MOBS, false);
      Files.createDirectories(dir.resolve("results"));
      List<Path> files;
      try (var s = Files.list(dir.resolve("jobs"))) { files = s.filter(p -> p.toString().endsWith(".txt")).sorted().toList(); }
      for (Path p : files) queue.add(read(p));
      getLogger().info("Spielprüfung: " + queue.size() + " Pläne");
      nextBatch();
    } catch (Exception e) { fail(e); }
  }

  Job read(Path p) throws IOException {
    Job j = new Job();
    j.file = p.getFileName().toString().replace(".txt", "");
    try (BufferedReader r = Files.newBufferedReader(p, StandardCharsets.UTF_8)) {
      String[] head = r.readLine().split("\t");
      j.name = head[0];
      String[] s = head[1].split(" ");
      j.sx = Integer.parseInt(s[0]); j.sy = Integer.parseInt(s[1]); j.sz = Integer.parseInt(s[2]);
      if (head.length > 2) j.sea = Integer.parseInt(head[2]);
      for (String line; (line = r.readLine()) != null; ) {
        if (line.isEmpty()) continue;
        String[] t = line.split(" ", 4);
        int x = Integer.parseInt(t[0]), y = Integer.parseInt(t[1]), z = Integer.parseInt(t[2]);
        j.planned.put(key(x, y, z), t[3]);
        j.order.add(new int[] { x, y, z });
      }
    }
    return j;
  }

  void nextBatch() {
    if (queue.isEmpty()) { finish(); return; }
    List<Job> batch = new ArrayList<>(queue.subList(0, Math.min(BATCH, queue.size())));
    queue.subList(0, batch.size()).clear();
    try {
      for (Job j : batch) {
        j.ox = nextX; j.oz = 20_000;
        nextX += Math.max(j.sx, 16) + 2 * MARGIN + 16;
        forceLoad(j, true);
        place(j);
      }
      // Let the world settle one tick, then ask every cell's neighbours to update, twice with ticks between.
      Bukkit.getScheduler().runTaskLater(this, () -> {
        for (Job j : batch) updateAll(j);
        Bukkit.getScheduler().runTaskLater(this, () -> {
          for (Job j : batch) updateAll(j);
          Bukkit.getScheduler().runTaskLater(this, () -> {
            try {
              for (Job j : batch) { report(j); forceLoad(j, false); }
            } catch (Exception e) { fail(e); return; }
            nextBatch();
          }, 80);
        }, 60);
      }, 2);
    } catch (Exception e) { fail(e); }
  }

  void forceLoad(Job j, boolean on) {
    for (int cx = (j.ox - MARGIN) >> 4; cx <= (j.ox + j.sx + MARGIN) >> 4; cx++)
      for (int cz = (j.oz - MARGIN) >> 4; cz <= (j.oz + j.sz + MARGIN) >> 4; cz++) world.setChunkForceLoaded(cx, cz, on);
  }

  final Map<String, BlockData> parsed = new HashMap<>();

  void place(Job j) {
    if (j.sea >= 0) {
      // Water continues beyond the plan where its liquid touches the plan's side (lake, sea, brook,
      // next module): every edge liquid cell gets water sources outwards through the margin.
      BlockData water = Bukkit.createBlockData("minecraft:water");
      for (int[] p : j.order) {
        String st = j.planned.get(key(p[0], p[1], p[2]));
        if (!(st.startsWith("minecraft:water") || st.contains("waterlogged=true"))) continue;
        int[][] out = { { -1, 0 }, { 1, 0 }, { 0, -1 }, { 0, 1 } };
        for (int[] d : out) {
          int ex = p[0] + d[0], ez = p[2] + d[1];
          if (ex >= 0 && ez >= 0 && ex < j.sx && ez < j.sz) continue;
          for (int k = 0; k < MARGIN; k++) world.getBlockAt(j.ox + p[0] + d[0] * (k + 1), GROUND + 1 + p[1], j.oz + p[2] + d[1] * (k + 1)).setBlockData(water, false);
        }
      }
    }
    for (int[] p : j.order) {
      String state = j.planned.get(key(p[0], p[1], p[2]));
      BlockData data = parsed.computeIfAbsent(state, Bukkit::createBlockData);
      world.getBlockAt(j.ox + p[0], GROUND + 1 + p[1], j.oz + p[2]).setBlockData(data, false);
    }
  }

  /** Every cell of the box (plus one around, including the ground below) tells its neighbours it is there. */
  void updateAll(Job j) {
    int y0 = GROUND, y1 = GROUND + 1 + j.sy;
    BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
    for (int x = j.ox - 1; x <= j.ox + j.sx; x++)
      for (int z = j.oz - 1; z <= j.oz + j.sz; z++)
        for (int y = y0; y <= y1; y++) {
          pos.set(x, y, z);
          BlockState s = level.getBlockState(pos);
          s.updateNeighbourShapes(level, pos.immutable(), 3);
        }
    for (int x = j.ox - 1; x <= j.ox + j.sx; x++)
      for (int z = j.oz - 1; z <= j.oz + j.sz; z++)
        for (int y = y0; y <= y1; y++) {
          pos.set(x, y, z);
          BlockPos at = pos.immutable();
          level.updateNeighborsAt(at, level.getBlockState(at).getBlock(), null);
        }
  }

  static String json(String s) { return '"' + s.replace("\\", "\\\\").replace("\"", "\\\"") + '"'; }

  void report(Job j) throws IOException {
    StringBuilder out = new StringBuilder();
    out.append("{\"name\":").append(json(j.name)).append(",\"size\":[").append(j.sx).append(',').append(j.sy).append(',').append(j.sz).append("],\"blocks\":").append(j.planned.size()).append(",\"diffs\":[");
    boolean first = true;
    for (int x = -MARGIN; x < j.sx + MARGIN; x++)
      for (int z = -MARGIN; z < j.sz + MARGIN; z++)
        for (int y = 0; y < j.sy + MARGIN; y++) {
          String want = j.planned.get(key(x, y, z));
          Block b = world.getBlockAt(j.ox + x, GROUND + 1 + y, j.oz + z);
          String got = b.getBlockData().getAsString();
          boolean ring = x < 0 || z < 0 || x >= j.sx || z >= j.sz;
          if (want == null) { if (b.getType().isAir() || (ring && j.sea >= 0 && b.getType() == Material.WATER)) continue; }
          else if (Bukkit.createBlockData(want).equals(b.getBlockData())) continue;
          if (!first) out.append(','); first = false;
          out.append("{\"p\":[").append(x).append(',').append(y).append(',').append(z).append("],\"want\":").append(want == null ? "null" : json(want)).append(",\"got\":").append(json(got)).append('}');
        }
    out.append("],\"entities\":[");
    first = true;
    Location min = new Location(world, j.ox - MARGIN - 4, GROUND - 2, j.oz - MARGIN - 4);
    var box = new org.bukkit.util.BoundingBox(min.getX(), min.getY(), min.getZ(), j.ox + j.sx + MARGIN + 4, GROUND + j.sy + 8, j.oz + j.sz + MARGIN + 4);
    for (Entity e : world.getNearbyEntities(box)) {
      String what;
      if (e instanceof Item item) what = "item " + item.getItemStack().getType().getKey() + " x" + item.getItemStack().getAmount();
      else if (e instanceof FallingBlock fb) what = "falling " + fb.getBlockData().getAsString();
      else continue;
      Location l = e.getLocation();
      if (!first) out.append(','); first = false;
      out.append("{\"p\":[").append(l.getBlockX() - j.ox).append(',').append(l.getBlockY() - GROUND - 1).append(',').append(l.getBlockZ() - j.oz).append("],\"what\":").append(json(what)).append('}');
      e.remove();
    }
    out.append("]}\n");
    Files.writeString(dir.resolve("results").resolve(j.file + ".json"), out.toString(), StandardCharsets.UTF_8);
  }

  void finish() {
    try { Files.writeString(dir.resolve("done.txt"), "ok\n"); } catch (IOException e) { getLogger().severe(e.toString()); }
    getLogger().info("Spielprüfung fertig");
    Bukkit.shutdown();
  }

  void fail(Exception e) {
    StringWriter w = new StringWriter();
    e.printStackTrace(new PrintWriter(w));
    try { Files.writeString(dir.resolve("done.txt"), "error\n" + w); } catch (IOException ignored) { }
    getLogger().severe("Spielprüfung abgebrochen: " + w);
    Bukkit.shutdown();
  }
}
