package io.github.freadeax.bauplaner.mod.commands;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;

/**
 * Last answers for the command page (GAME-10): the mod's own "[Bauplaner] …" lines and, for a few seconds
 * after the page sent a server command, every system line from the server (the plugin answers in chat,
 * sometimes without prefix). Thread safe; the chat events of the loaders may come from the network thread.
 */
public final class ReplyLog {
    public static final int MAX = 40;
    /** How long after a server command its answer lines are kept (ms). */
    public static final long SERVER_WINDOW = 4000;

    public record Line(long at, String text, boolean sent) {}

    private final ArrayDeque<Line> lines = new ArrayDeque<>();
    private long serverUntil;
    private int version;

    /** A command the page ran (shown as "› /bp …"). */
    public synchronized void sent(String command, boolean server, long now) {
        push(new Line(now, "› /" + command, true));
        if (server) serverUntil = now + SERVER_WINDOW;
    }

    /**
     * A system line that reached the chat (loader event). Kept only if it answers a server command just sent
     * from the page; the mod's own "[Bauplaner]" lines come through {@link #own} and are skipped here.
     */
    public synchronized boolean offer(String text, long now) {
        if (text == null) return false;
        String t = text.strip();
        if (t.isEmpty() || t.startsWith(PREFIX) || now > serverUntil) return false;
        push(new Line(now, clip(t), false));
        return true;
    }

    /** A line the mod itself writes to the chat (always kept, prefix removed). */
    public synchronized boolean own(String text, long now) {
        if (text == null) return false;
        String t = text.strip();
        if (t.startsWith(PREFIX)) t = t.substring(PREFIX.length()).strip();
        if (t.isEmpty()) return false;
        push(new Line(now, clip(t), false));
        return true;
    }

    private static final String PREFIX = "[Bauplaner]";

    private static String clip(String t) { return t.length() > 300 ? t.substring(0, 299) + "…" : t; }

    private void push(Line l) {
        lines.addLast(l);
        while (lines.size() > MAX) lines.removeFirst();
        version++;
    }

    public synchronized List<Line> last(int n) {
        List<Line> all = new ArrayList<>(lines);
        return all.subList(Math.max(0, all.size() - n), all.size());
    }

    /** Changes whenever a line was added (the screen re-wraps only then). */
    public synchronized int version() { return version; }
}
