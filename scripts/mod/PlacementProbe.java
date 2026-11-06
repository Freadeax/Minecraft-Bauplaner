// MAP-07 helper for bridge_paperplacement.mjs: runs the mod's own rule (mod-core Placement.java) on probe blocks.
// Input lines: "<turns> <mirror> <px> <py> <pz> <state>", output lines: "<wx> <wy> <wz> <state>" (anchor 0/0/0).
// Start: java -cp mods/bauplaner-bridge/mod-core/build/classes/java/main scripts/mod/PlacementProbe.java < in
import io.github.freadeax.bauplaner.mod.BlockState;
import io.github.freadeax.bauplaner.mod.Placement;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class PlacementProbe {
    public static void main(String[] args) throws Exception {
        var in = new BufferedReader(new InputStreamReader(System.in));
        var out = new StringBuilder();
        for (String line; (line = in.readLine()) != null; ) {
            if (line.isBlank()) continue;
            String[] w = line.trim().split(" ");
            var pl = new Placement("minecraft:overworld", 0, 0, 0, Integer.parseInt(w[0]), Boolean.parseBoolean(w[1]));
            int[] p = pl.toWorld(Integer.parseInt(w[2]), Integer.parseInt(w[3]), Integer.parseInt(w[4]));
            BlockState s = pl.toWorld(BlockState.parse(w[5]));
            int[] back = pl.toProject(p[0], p[1], p[2]);
            if (back[0] != Integer.parseInt(w[2]) || back[1] != Integer.parseInt(w[3]) || back[2] != Integer.parseInt(w[4])) throw new IllegalStateException("toProject ist nicht die Umkehrung: " + line);
            if (!pl.toProject(s).equals(BlockState.parse(w[5]))) throw new IllegalStateException("toProject(state) ist nicht die Umkehrung: " + line + " -> " + s + " -> " + pl.toProject(s));
            out.append(p[0]).append(' ').append(p[1]).append(' ').append(p[2]).append(' ').append(s).append('\n');
        }
        System.out.print(out);
    }
}
