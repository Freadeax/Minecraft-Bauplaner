package io.github.freadeax.bauplaner.mod;

/**
 * Automatic render budget (performance "auto", mod 0.29.0): watches the frame time and shrinks the number of
 * hologram blocks drawn per frame in steps while the game runs below {@link #SLOW_FPS}, and grows it back once
 * the game is fast again. Steps instead of a smooth factor, because every change rebuilds the selection.
 * Loader-neutral and clock-free (the caller passes nanoTime), so it is testable without the game.
 */
public final class FrameBudget {
    /** Share of the "normal" budget at each step; the last one keeps at least the blocks right around the player. */
    static final double[] STEPS = { 1.0, 0.75, 0.55, 0.4, 0.3, 0.2, 0.12 };
    /** Below this frame rate (smoothed) the budget goes one step down. */
    static final int SLOW_FPS = 40;
    /** Above this frame rate the budget goes one step up again, but only while blocks are left out. */
    static final int FAST_FPS = 58;
    /** Wait after a change, so the new frame time can settle before the next decision. */
    static final long SETTLE_DOWN_NANOS = 1_500_000_000L, SETTLE_UP_NANOS = 4_000_000_000L;
    /** Longer gaps are menus, loading screens or a paused game, not slow frames. */
    static final long MAX_FRAME_NANOS = 500_000_000L;

    private int step;
    private double avg;
    private long last, changedAt;

    /** Share of the normal budget to draw now (1 = full). */
    public double scale() { return STEPS[step]; }

    /** Current step, 0 = full budget; changes whenever the selection has to be rebuilt. */
    public int step() { return step; }

    /** Smoothed frames per second (0 before the first two frames). */
    public int fps() { return avg <= 0 ? 0 : (int) Math.round(1e9 / avg); }

    /** Back to the full budget, e.g. after a new plan or a change of the setting. */
    public void reset() { step = 0; avg = 0; last = 0; changedAt = 0; }

    /**
     * Called once per rendered frame. {@code capped} = the current budget left out blocks (only then growing helps).
     * Returns true when the step changed.
     */
    public boolean frame(long now, boolean capped) {
        long dt = last == 0 ? 0 : now - last;
        last = now;
        if (dt <= 0 || dt > MAX_FRAME_NANOS) return false;
        avg = avg == 0 ? dt : avg * 0.92 + dt * 0.08;
        if (changedAt == 0) changedAt = now;
        long since = now - changedAt;
        if (avg > 1e9 / SLOW_FPS && step < STEPS.length - 1 && since >= SETTLE_DOWN_NANOS) {
            step++;
            changedAt = now;
            return true;
        }
        if (avg < 1e9 / FAST_FPS && step > 0 && capped && since >= SETTLE_UP_NANOS) {
            step--;
            changedAt = now;
            return true;
        }
        return false;
    }
}
