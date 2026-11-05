package io.github.freadeax.bauplaner.mod.live;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

/** Frames over one JDK WebSocket must go out one after the other (otherwise "Send pending"). */
class WsQueueTest {
    /** Behaves like the JDK socket: a second sendText while one is outstanding fails. */
    static final class FakeSocket implements WebSocket {
        final List<String> sent = new ArrayList<>();
        final List<CompletableFuture<WebSocket>> open = new ArrayList<>();
        boolean outstanding;
        int pendingErrors;
        boolean failNext;

        @Override public synchronized CompletableFuture<WebSocket> sendText(CharSequence data, boolean last) {
            if (outstanding) { pendingErrors++; return CompletableFuture.failedFuture(new IllegalStateException("Send pending")); }
            if (failNext) return CompletableFuture.failedFuture(new java.io.IOException("Verbindung zu"));
            outstanding = true;
            sent.add(data.toString());
            CompletableFuture<WebSocket> f = new CompletableFuture<>();
            open.add(f);
            return f;
        }
        /** The network finished the oldest frame. */
        void finishOne() {
            CompletableFuture<WebSocket> f;
            synchronized (this) { f = open.remove(0); outstanding = false; }
            f.complete(this);
        }
        @Override public CompletableFuture<WebSocket> sendBinary(ByteBuffer data, boolean last) { throw new UnsupportedOperationException(); }
        @Override public CompletableFuture<WebSocket> sendPing(ByteBuffer message) { throw new UnsupportedOperationException(); }
        @Override public CompletableFuture<WebSocket> sendPong(ByteBuffer message) { throw new UnsupportedOperationException(); }
        @Override public CompletableFuture<WebSocket> sendClose(int statusCode, String reason) { return CompletableFuture.completedFuture(this); }
        @Override public void request(long n) { }
        @Override public String getSubprotocol() { return ""; }
        @Override public boolean isOutputClosed() { return false; }
        @Override public boolean isInputClosed() { return false; }
        @Override public void abort() { }
    }

    @Test
    void sendsFramesInOrderOneAtATime() throws Exception {
        FakeSocket ws = new FakeSocket();
        WsQueue q = new WsQueue(ws, e -> { throw new AssertionError("kein Fehler erwartet: " + e); });
        CompletableFuture<WebSocket> a = q.send("{\"type\":\"hello\"}");
        CompletableFuture<WebSocket> b = q.send("{\"type\":\"append\",\"batch\":\"b_1\"}");
        CompletableFuture<WebSocket> c = q.send("{\"type\":\"append\",\"batch\":\"b_2\"}");
        assertEquals(List.of("{\"type\":\"hello\"}"), ws.sent, "erst nach dem ersten Rahmen geht der nächste raus");
        assertEquals(3, q.pending());
        ws.finishOne(); ws.finishOne(); ws.finishOne();
        CompletableFuture.allOf(a, b, c).get(2, TimeUnit.SECONDS);
        assertEquals(3, ws.sent.size());
        assertTrue(ws.sent.get(2).contains("b_2"));
        assertEquals(0, ws.pendingErrors, "nie zwei offene Sendungen gleichzeitig");
        assertEquals(0, q.pending());
    }

    @Test
    void manyThreadsLoseNothing() throws Exception {
        FakeSocket ws = new FakeSocket();
        WsQueue q = new WsQueue(ws, e -> { throw new AssertionError(e); });
        int threads = 8, each = 25;
        CountDownLatch go = new CountDownLatch(1);
        List<Thread> all = new ArrayList<>();
        List<CompletableFuture<WebSocket>> futures = java.util.Collections.synchronizedList(new ArrayList<>());
        for (int t = 0; t < threads; t++) {
            int id = t;
            Thread th = new Thread(() -> {
                try { go.await(); } catch (InterruptedException e) { return; }
                for (int i = 0; i < each; i++) futures.add(q.send("t" + id + "-" + i));
            });
            th.start(); all.add(th);
        }
        // The "network" finishes frames as they come.
        Thread net = new Thread(() -> {
            int done = 0;
            while (done < threads * each) {
                boolean has; synchronized (ws) { has = !ws.open.isEmpty(); }
                if (has) { ws.finishOne(); done++; } else Thread.onSpinWait();
            }
        });
        net.start();
        go.countDown();
        for (Thread th : all) th.join();
        net.join(10_000);
        assertFalse(net.isAlive(), "alle Rahmen gesendet");
        CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).get(2, TimeUnit.SECONDS);
        assertEquals(threads * each, ws.sent.size());
        assertEquals(0, ws.pendingErrors);
    }

    @Test
    void reportsTheFirstFailureOnceAndRefusesMore() {
        FakeSocket ws = new FakeSocket();
        ws.failNext = true;
        AtomicReference<Throwable> failure = new AtomicReference<>();
        int[] calls = { 0 };
        WsQueue q = new WsQueue(ws, e -> { calls[0]++; failure.set(e); });
        assertTrue(q.send("x").isCompletedExceptionally());
        assertNotNull(failure.get());
        assertTrue(q.send("y").isCompletedExceptionally(), "nach einem Fehler nimmt die Schlange nichts mehr an");
        assertEquals(1, calls[0]);
    }

    @Test
    void aStuckSocketIsReportedInsteadOfGrowingForever() {
        FakeSocket ws = new FakeSocket();
        int[] calls = { 0 };
        WsQueue q = new WsQueue(ws, e -> calls[0]++);
        for (int i = 0; i < WsQueue.MAX_PENDING; i++) q.send("f" + i);
        assertEquals(0, calls[0]);
        assertTrue(q.send("zu viel").isCompletedExceptionally());
        assertEquals(1, calls[0]);
    }
}
