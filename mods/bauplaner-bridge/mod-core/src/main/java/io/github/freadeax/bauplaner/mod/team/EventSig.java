package io.github.freadeax.bauplaner.mod.team;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * GAME-06 (docs/architecture/team/SIGNED_EVENTS.md): signed team events of the Bauleitung.
 * <ul>
 *   <li>Signing key: {@code base64url(HMAC-SHA-256(adminKey, "bauplaner-leitung/v1"))} – derived in the planner of the
 *       Bauleitung from the room's admin key. The server plugin gets only this key (link parameter {@code l}), never the
 *       admin key; members and the room never see it.</li>
 *   <li>Signature: {@code sig = base64url(HMAC-SHA-256(signKey, "bauplaner-team-event/v1\n" + teamId + "\n" + canonical(event without sig)))}.
 *       The team id in the signed text keeps a signed event from working in another team, the event id and time keep
 *       it from being reused as a new event.</li>
 *   <li>Canonical JSON = keys sorted by UTF-16 code units, no spaces, strings escaped like {@code JSON.stringify}
 *       ({@code packages/domain/src/team/eventSig.ts} computes the same; shared test vector in both tests).</li>
 * </ul>
 * The value model is that of {@link io.github.freadeax.bauplaner.mod.live.Json}: maps, lists, strings, numbers,
 * booleans and null. Copied into the Paper plugin like {@code TeamWire}.
 */
public final class EventSig {
    public static final String KEY_INFO = "bauplaner-leitung/v1";
    public static final String CONTEXT = "bauplaner-team-event/v1";
    /** base64url of 32 bytes without padding. */
    public static final String KEY_PATTERN = "[A-Za-z0-9_-]{43}";

    private EventSig() { }

    /** Signing key of the Bauleitung from the room's admin key. */
    public static String deriveKey(String adminKey) {
        return b64(hmac(adminKey.getBytes(StandardCharsets.UTF_8), KEY_INFO));
    }

    /** Signature of an event (a {@code sig} field in it is ignored). */
    public static String sign(String signKey, String teamId, Map<String, Object> event) {
        return b64(hmac(signKey.getBytes(StandardCharsets.UTF_8), CONTEXT + "\n" + teamId + "\n" + canonical(withoutSig(event))));
    }

    /** Whether the event carries a valid signature of this key (constant-time comparison). */
    public static boolean verify(String signKey, String teamId, Map<String, Object> event) {
        if (signKey == null || !(event.get("sig") instanceof String sig) || !sig.matches(KEY_PATTERN)) return false;
        return MessageDigest.isEqual(sign(signKey, teamId, event).getBytes(StandardCharsets.US_ASCII), sig.getBytes(StandardCharsets.US_ASCII));
    }

    /** Copy with {@code sig} set (deterministic: the same event always gets the same signature, so resending stays "known"). */
    public static Map<String, Object> signed(String signKey, String teamId, Map<String, Object> event) {
        Map<String, Object> out = new java.util.LinkedHashMap<>(withoutSig(event));
        out.put("sig", sign(signKey, teamId, event));
        return out;
    }

    private static Map<String, Object> withoutSig(Map<String, Object> event) {
        if (!event.containsKey("sig")) return event;
        Map<String, Object> m = new java.util.LinkedHashMap<>(event);
        m.remove("sig");
        return m;
    }

    /** Canonical JSON text, equal to {@code canonical} in core.js / eventSig.ts. */
    public static String canonical(Object v) {
        StringBuilder b = new StringBuilder();
        write(b, v, 0);
        return b.toString();
    }

    @SuppressWarnings("unchecked")
    private static void write(StringBuilder b, Object v, int depth) {
        if (depth > 64) throw new IllegalArgumentException("Ereignis zu tief verschachtelt");
        if (v == null) b.append("null");
        else if (v instanceof String s) quote(b, s);
        else if (v instanceof Boolean x) b.append(x);
        else if (v instanceof Number n) b.append(number(n));
        else if (v instanceof Map<?, ?> m) {
            List<String> keys = new ArrayList<>();
            for (Object k : m.keySet()) keys.add(String.valueOf(k));
            Collections.sort(keys);
            b.append('{');
            for (int i = 0; i < keys.size(); i++) {
                if (i > 0) b.append(',');
                quote(b, keys.get(i));
                b.append(':');
                write(b, ((Map<String, Object>) m).get(keys.get(i)), depth + 1);
            }
            b.append('}');
        } else if (v instanceof List<?> l) {
            b.append('[');
            for (int i = 0; i < l.size(); i++) { if (i > 0) b.append(','); write(b, l.get(i), depth + 1); }
            b.append(']');
        } else throw new IllegalArgumentException("Unbekannter Wert im Ereignis: " + v.getClass().getSimpleName());
    }

    /** Like JSON.stringify for the numbers team events use (integers; other values with the shortest round trip). */
    static String number(Number n) {
        double d = n.doubleValue();
        if (!Double.isFinite(d)) return "null";
        if (d == Math.rint(d) && Math.abs(d) < 1e21) return new java.math.BigDecimal(d).toPlainString();
        String s = Double.toString(d);
        if (s.contains("E")) {
            // 1.0E-7 → 1e-7 like JavaScript
            String[] p = s.split("E");
            String m = p[0].endsWith(".0") ? p[0].substring(0, p[0].length() - 2) : p[0];
            int e = Integer.parseInt(p[1]);
            return m + "e" + (e > 0 ? "+" : "") + e;
        }
        return s;
    }

    /** String escaping exactly like JSON.stringify (no escaping of non-ASCII). */
    private static void quote(StringBuilder b, String s) {
        b.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> b.append("\\\"");
                case '\\' -> b.append("\\\\");
                case '\b' -> b.append("\\b");
                case '\f' -> b.append("\\f");
                case '\n' -> b.append("\\n");
                case '\r' -> b.append("\\r");
                case '\t' -> b.append("\\t");
                default -> {
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
                    else if (Character.isSurrogate(c) && !pairAt(s, i)) b.append(String.format("\\u%04x", (int) c));
                    else if (Character.isHighSurrogate(c)) { b.append(c).append(s.charAt(i + 1)); i++; }
                    else b.append(c);
                }
            }
        }
        b.append('"');
    }

    private static boolean pairAt(String s, int i) {
        char c = s.charAt(i);
        return Character.isHighSurrogate(c) && i + 1 < s.length() && Character.isLowSurrogate(s.charAt(i + 1));
    }

    private static byte[] hmac(byte[] key, String text) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(text.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) { throw new IllegalStateException(e); }
    }

    private static String b64(byte[] b) { return Base64.getUrlEncoder().withoutPadding().encodeToString(b); }

    // ------------------------------------------------------------------ TEAM-SEC-01: Ed25519 (docs/architecture/team/TEAM_IDENTITY.md §4)
    // With the HMAC key above, whoever can check can also sign – the plugin had to hold it. Now the Bauleitung signs with an
    // Ed25519 key derived from the admin key (seed = HMAC(adminKey, "bauplaner-leitung/ed25519/v1")); the plugin, the mods of
    // the members and the planners get only the public key (link parameter p). Same vector as tests/unit/team/team-identity.test.mjs.

    public static final String SEED_INFO = "bauplaner-leitung/ed25519/v1";
    public static final String CONTEXT_ED = "bauplaner-team-event/v2";
    /** base64url of a 64-byte Ed25519 signature. */
    public static final String SIG_ED_PATTERN = "[A-Za-z0-9_-]{86}";
    private static final byte[] PKCS8 = { 0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20 };
    private static final byte[] SPKI = { 0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00 };

    /** Ed25519 seed of the Bauleitung from the admin key (only on the Bauleitung's devices). */
    public static String deriveSeed(String adminKey) { return b64(hmac(adminKey.getBytes(StandardCharsets.UTF_8), SEED_INFO)); }

    private static byte[] unb64(String s) { return Base64.getUrlDecoder().decode(s); }
    private static byte[] concat(byte[] a, byte[] b) { byte[] o = java.util.Arrays.copyOf(a, a.length + b.length); System.arraycopy(b, 0, o, a.length, b.length); return o; }

    private static java.security.PrivateKey privateKey(String seed) throws GeneralSecurityException {
        byte[] raw = unb64(seed);
        if (raw.length != 32) throw new GeneralSecurityException("Schlüssel der Bauleitung ungültig");
        return java.security.KeyFactory.getInstance("Ed25519").generatePrivate(new java.security.spec.PKCS8EncodedKeySpec(concat(PKCS8, raw)));
    }

    /** Public key (32 bytes base64url) to a seed. The JDK has no "public from private", so the key pair is generated from the seed. */
    public static String publicKey(String seed) {
        byte[] raw = unb64(seed);
        if (raw.length != 32) throw new IllegalArgumentException("Schlüssel der Bauleitung ungültig");
        try {
            java.security.KeyPairGenerator g = java.security.KeyPairGenerator.getInstance("Ed25519");
            g.initialize(java.security.spec.NamedParameterSpec.ED25519, new java.security.SecureRandom() {
                @Override public void nextBytes(byte[] bytes) { System.arraycopy(raw, 0, bytes, 0, Math.min(raw.length, bytes.length)); }
            });
            byte[] spki = g.generateKeyPair().getPublic().getEncoded();
            return b64(java.util.Arrays.copyOfRange(spki, spki.length - 32, spki.length));
        } catch (GeneralSecurityException e) { throw new IllegalStateException(e); }
    }

    private static byte[] edText(String teamId, Map<String, Object> event) { return (CONTEXT_ED + "\n" + teamId + "\n" + canonical(withoutSig(event))).getBytes(StandardCharsets.UTF_8); }

    /** Copy with an Ed25519 {@code sig} (deterministic like HMAC: a resend stays "known"). */
    public static Map<String, Object> signedEd(String seed, String teamId, Map<String, Object> event) {
        try {
            java.security.Signature s = java.security.Signature.getInstance("Ed25519");
            s.initSign(privateKey(seed));
            s.update(edText(teamId, event));
            Map<String, Object> out = new java.util.LinkedHashMap<>(withoutSig(event));
            out.put("sig", b64(s.sign()));
            return out;
        } catch (GeneralSecurityException e) { throw new IllegalStateException(e); }
    }

    /** Whether the event carries a valid Ed25519 signature of this public key. */
    public static boolean verifyEd(String publicKey, String teamId, Map<String, Object> event) {
        if (publicKey == null || !publicKey.matches(KEY_PATTERN) || !(event.get("sig") instanceof String sig) || !sig.matches(SIG_ED_PATTERN)) return false;
        try {
            java.security.PublicKey k = java.security.KeyFactory.getInstance("Ed25519").generatePublic(new java.security.spec.X509EncodedKeySpec(concat(SPKI, unb64(publicKey))));
            java.security.Signature s = java.security.Signature.getInstance("Ed25519");
            s.initVerify(k);
            s.update(edText(teamId, event));
            return s.verify(unb64(sig));
        } catch (GeneralSecurityException | IllegalArgumentException e) { return false; }
    }
}
