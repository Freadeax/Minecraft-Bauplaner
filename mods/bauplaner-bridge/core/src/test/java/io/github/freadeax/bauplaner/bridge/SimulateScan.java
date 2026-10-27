package io.github.freadeax.bauplaner.bridge;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;

/**
 * Cross-language check (scripts/test_bridge.sh): records a world built exactly from the plan,
 * with optional overrides {@code x,y,z=state} in world coordinates, using the real ScanJob.
 * Usage: plan.schem out.schem anchorX anchorY anchorZ [x,y,z=state ...]
 */
public final class SimulateScan {
    public static void main(String[] args) throws Exception {
        byte[] file = Files.readAllBytes(Path.of(args[0]));
        int[] anchor = { Integer.parseInt(args[2]), Integer.parseInt(args[3]), Integer.parseInt(args[4]) };
        var plan = Plan.parse(Path.of(args[0]).getFileName().toString(), file);
        var world = new PlanWorld(file, anchor);
        for (int i = 5; i < args.length; i++) {
            String[] kv = args[i].split("=", 2);
            String[] p = kv[0].split(",");
            world.overrides.put(PlanWorld.key(Integer.parseInt(p[0]), Integer.parseInt(p[1]), Integer.parseInt(p[2])), kv[1]);
        }
        var job = new ScanJob(plan, anchor, world, plan.dataVersion(), new ScanJob.Info("26.3", "test", "fabric", "minecraft:overworld", "client"));
        while (!job.step(997)) { /* slices like the in-game tick budget */ }
        Files.write(Path.of(args[1]), job.toFile(Instant.parse("2026-10-27T12:00:00Z")));
    }
}
