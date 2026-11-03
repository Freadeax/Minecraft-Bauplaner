package io.github.freadeax.bauplaner.mod;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Reads a plan with the mod's own reader and writes every plan block as "x y z state" (project coordinates).
 * Used by scripts/bridge_sendcheck.mjs to compare what the website sends with what the hologram shows.
 */
public final class DumpPlan {
    private DumpPlan() {}

    public static void main(String[] args) throws Exception {
        PlanModel m = PlanModel.parse(Path.of(args[0]).getFileName().toString(), Files.readAllBytes(Path.of(args[0])));
        try (PrintWriter w = new PrintWriter(new BufferedWriter(new FileWriter(args[1]), 1 << 20))) {
            for (int i = 0; i < m.blockCount(); i++) w.println(m.x(i) + " " + m.y(i) + " " + m.z(i) + " " + m.state(i));
        }
    }
}
