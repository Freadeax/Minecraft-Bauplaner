package io.github.freadeax.bauplaner.mod;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** Automatic render budget: shrinks on slow frames, grows back on fast ones, ignores pauses. */
class FrameBudgetTest {
    private long now = 1_000_000_000L;

    private int run(FrameBudget b, int fps, double seconds, boolean capped) {
        int changes = 0;
        long dt = 1_000_000_000L / fps;
        for (long t = 0; t < seconds * 1e9; t += dt) { now += dt; if (b.frame(now, capped)) changes++; }
        return changes;
    }

    @Test
    void shrinksStepByStepWhileSlowAndStopsAtTheFloor() {
        var b = new FrameBudget();
        run(b, 25, 2.0, true);
        assertEquals(1, b.step());
        assertTrue(b.scale() < 1);
        run(b, 25, 60, true);
        assertEquals(FrameBudget.STEPS.length - 1, b.step());
        assertEquals(25, b.fps(), 1);
    }

    @Test
    void growsBackOnlyWhenFastAndBlocksAreLeftOut() {
        var b = new FrameBudget();
        run(b, 20, 6, true);
        int low = b.step();
        assertTrue(low >= 3);
        run(b, 120, 30, false);
        assertEquals(low, b.step(), "nothing left out: no reason to draw more");
        run(b, 120, 30, true);
        assertEquals(0, b.step());
    }

    @Test
    void steadyFramesInBetweenKeepTheStep() {
        var b = new FrameBudget();
        run(b, 25, 2, true);
        assertEquals(0, run(b, 50, 30, true));
    }

    @Test
    void pausesAndMenusAreNoSlowFrames() {
        var b = new FrameBudget();
        run(b, 60, 2, true);
        for (int i = 0; i < 20; i++) { now += 2_000_000_000L; b.frame(now, true); }
        assertEquals(0, b.step());
        b.reset();
        assertEquals(1.0, b.scale());
        assertEquals(0, b.fps());
    }
}
