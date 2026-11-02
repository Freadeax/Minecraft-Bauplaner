package io.github.freadeax.bauplaner.mod.live;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Minimal JSON for the live link (no library in the mod): a strict reader for the small request
 * bodies the website sends and a writer for the answers. Objects become {@link Map}, arrays
 * {@link List}, numbers {@link Double}. Depth and size are limited; anything malformed is rejected.
 */
public final class Json {
    private Json() {}

    public static final class JsonException extends RuntimeException {
        public JsonException(String message) { super(message); }
    }

    private static final int MAX_DEPTH = 32;

    public static Object parse(String text) {
        Reader r = new Reader(text);
        r.space();
        Object value = r.value(0);
        r.space();
        if (r.pos != text.length()) throw new JsonException("Zeichen nach dem JSON-Wert");
        return value;
    }

    private static final class Reader {
        final String s;
        int pos;
        Reader(String s) { this.s = s; }

        void space() { while (pos < s.length() && " \t\r\n".indexOf(s.charAt(pos)) >= 0) pos++; }
        char peek() { if (pos >= s.length()) throw new JsonException("JSON endet zu früh"); return s.charAt(pos); }
        void expect(char c) { if (peek() != c) throw new JsonException("Erwartet '" + c + "' an Stelle " + pos); pos++; }

        Object value(int depth) {
            if (depth > MAX_DEPTH) throw new JsonException("JSON zu tief verschachtelt");
            char c = peek();
            switch (c) {
                case '{': return object(depth);
                case '[': return array(depth);
                case '"': return string();
                case 't': word("true"); return Boolean.TRUE;
                case 'f': word("false"); return Boolean.FALSE;
                case 'n': word("null"); return null;
                default: return number();
            }
        }

        void word(String w) {
            if (!s.startsWith(w, pos)) throw new JsonException("Unbekanntes Wort an Stelle " + pos);
            pos += w.length();
        }

        Map<String, Object> object(int depth) {
            expect('{');
            Map<String, Object> m = new LinkedHashMap<>();
            space();
            if (peek() == '}') { pos++; return m; }
            while (true) {
                space();
                String key = string();
                space(); expect(':'); space();
                if (m.containsKey(key)) throw new JsonException("Doppelter Schlüssel " + key);
                m.put(key, value(depth + 1));
                space();
                if (peek() == ',') { pos++; continue; }
                expect('}');
                return m;
            }
        }

        List<Object> array(int depth) {
            expect('[');
            List<Object> l = new ArrayList<>();
            space();
            if (peek() == ']') { pos++; return l; }
            while (true) {
                space();
                l.add(value(depth + 1));
                space();
                if (peek() == ',') { pos++; continue; }
                expect(']');
                return l;
            }
        }

        String string() {
            expect('"');
            StringBuilder b = new StringBuilder();
            while (true) {
                char c = peek(); pos++;
                if (c == '"') return b.toString();
                if (c < 0x20) throw new JsonException("Steuerzeichen in Zeichenkette");
                if (c != '\\') { b.append(c); continue; }
                char e = peek(); pos++;
                switch (e) {
                    case '"', '\\', '/' -> b.append(e);
                    case 'b' -> b.append('\b');
                    case 'f' -> b.append('\f');
                    case 'n' -> b.append('\n');
                    case 'r' -> b.append('\r');
                    case 't' -> b.append('\t');
                    case 'u' -> {
                        if (pos + 4 > s.length()) throw new JsonException("Unvollständiges \\u");
                        try { b.append((char) Integer.parseInt(s.substring(pos, pos + 4), 16)); }
                        catch (NumberFormatException ex) { throw new JsonException("Ungültiges \\u"); }
                        pos += 4;
                    }
                    default -> throw new JsonException("Ungültiges Escape \\" + e);
                }
            }
        }

        Double number() {
            int start = pos;
            if (peek() == '-') pos++;
            while (pos < s.length() && "0123456789.eE+-".indexOf(s.charAt(pos)) >= 0) pos++;
            String n = s.substring(start, pos);
            if (n.isEmpty() || n.equals("-")) throw new JsonException("Ungültiger Wert an Stelle " + start);
            try {
                double d = Double.parseDouble(n);
                if (!Double.isFinite(d)) throw new JsonException("Zahl außerhalb des Bereichs");
                return d;
            } catch (NumberFormatException ex) { throw new JsonException("Ungültige Zahl " + n); }
        }
    }

    // ------------------------------------------------------------------ typed access

    @SuppressWarnings("unchecked")
    public static Map<String, Object> obj(Object v, String what) {
        if (!(v instanceof Map)) throw new JsonException(what + ": Objekt erwartet");
        return (Map<String, Object>) v;
    }

    @SuppressWarnings("unchecked")
    public static List<Object> arr(Object v, String what) {
        if (!(v instanceof List)) throw new JsonException(what + ": Liste erwartet");
        return (List<Object>) v;
    }

    public static String str(Object v, String what, int max) {
        if (!(v instanceof String s) || s.length() > max) throw new JsonException(what + ": Text bis " + max + " Zeichen erwartet");
        return s;
    }

    public static int integer(Object v, String what, int min, int max) {
        if (!(v instanceof Double d) || d != Math.rint(d) || d < min || d > max) throw new JsonException(what + ": ganze Zahl von " + min + " bis " + max + " erwartet");
        return (int) (double) d;
    }

    public static boolean bool(Object v, String what) {
        if (!(v instanceof Boolean b)) throw new JsonException(what + ": wahr/falsch erwartet");
        return b;
    }

    // ------------------------------------------------------------------ writing

    /** Quoted JSON string. */
    public static String quote(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder(s.length() + 2).append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> b.append("\\\"");
                case '\\' -> b.append("\\\\");
                case '\n' -> b.append("\\n");
                case '\r' -> b.append("\\r");
                case '\t' -> b.append("\\t");
                default -> { if (c < 0x20 || c == 0x2028 || c == 0x2029) b.append(String.format("\\u%04x", (int) c)); else b.append(c); }
            }
        }
        return b.append('"').toString();
    }

    /** Number without exponent noise; NaN/infinite become 0. */
    public static String num(double d) {
        if (!Double.isFinite(d)) return "0";
        if (d == Math.rint(d) && Math.abs(d) < 1e15) return Long.toString((long) d);
        return Double.toString(Math.round(d * 1000) / 1000.0);
    }
}
