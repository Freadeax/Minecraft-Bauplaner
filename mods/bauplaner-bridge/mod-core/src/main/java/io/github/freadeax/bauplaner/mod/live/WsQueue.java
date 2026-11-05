package io.github.freadeax.bauplaner.mod.live;

import java.net.http.WebSocket;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;

/**
 * Sends text frames over one {@link WebSocket} strictly one after the other.
 * <p>
 * {@code java.net.http.WebSocket} allows only one outstanding {@code sendText}: a second call before the first
 * finished fails with {@code IllegalStateException("Send pending")} – silently, inside the returned future. Hello,
 * presence, appends and control answers of the mod (RoomClient) and of the Paper plugin (RoomLink) come from
 * different threads and timers, so without this queue frames got lost or the plugin dropped its connection.
 * <p>
 * Shared with the Paper plugin as source (paper/build.gradle, Java 17), so no newer language features here.
 */
public final class WsQueue {
    /** More frames waiting than this means the socket is stuck: the queue reports a failure instead of growing. */
    public static final int MAX_PENDING = 512;

    private final WebSocket ws;
    private final Consumer<Throwable> onFail;
    private CompletableFuture<?> tail = CompletableFuture.completedFuture(null);
    private int pending;
    private boolean failed;

    /** @param onFail called once with the first failed send (closed socket, stuck queue); may be null */
    public WsQueue(WebSocket ws, Consumer<Throwable> onFail) {
        this.ws = ws;
        this.onFail = onFail;
    }

    public WebSocket socket() { return ws; }

    /** Frames handed over but not yet sent completely. */
    public synchronized int pending() { return pending; }

    /** Queues one complete text frame; the future completes when it went out (or failed). */
    public CompletableFuture<WebSocket> send(String text) {
        CompletableFuture<WebSocket> next;
        synchronized (this) {
            if (failed) return CompletableFuture.failedFuture(new IllegalStateException("Verbindung bereits gestört"));
            if (pending >= MAX_PENDING) next = null;
            else {
                pending++;
                next = tail.handle((r, ex) -> null).thenCompose(x -> ws.sendText(text, true));
                tail = next;
            }
        }
        // onFail runs outside this lock: callers hold their own lock while sending.
        if (next == null) {
            IllegalStateException e = new IllegalStateException("Rückstau beim Senden (mehr als " + MAX_PENDING + " Nachrichten)");
            fail(e);
            return CompletableFuture.failedFuture(e);
        }
        next.whenComplete((r, ex) -> {
            synchronized (WsQueue.this) { pending--; }
            if (ex != null) fail(ex);
        });
        return next;
    }

    private void fail(Throwable ex) {
        synchronized (this) { if (failed) return; failed = true; }
        if (onFail != null) onFail.accept(ex);
    }
}
