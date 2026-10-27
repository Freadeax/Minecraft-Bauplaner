package io.github.freadeax.bauplaner.bridge;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

/**
 * Minimal big-endian Java NBT with Modified UTF-8 (DataInput/DataOutput), independent of
 * Minecraft classes so the core stays version-neutral. Values: Byte, Short, Integer, Long,
 * Float, Double, byte[], String, {@link NbtList}, compound as {@code Map<String, Tag>},
 * int[], long[].
 */
public final class Nbt {
    private Nbt() {}

    public static final byte END = 0, BYTE = 1, SHORT = 2, INT = 3, LONG = 4, FLOAT = 5, DOUBLE = 6,
            BYTE_ARRAY = 7, STRING = 8, LIST = 9, COMPOUND = 10, INT_ARRAY = 11, LONG_ARRAY = 12;

    /** One tag: type id plus Java value. */
    public record Tag(byte type, Object value) {
        public static Tag ofInt(int v) { return new Tag(INT, v); }
        public static Tag ofShort(int v) { return new Tag(SHORT, (short) v); }
        public static Tag ofString(String v) { return new Tag(STRING, v); }
        public static Tag ofIntArray(int... v) { return new Tag(INT_ARRAY, v); }
        public static Tag ofBytes(byte[] v) { return new Tag(BYTE_ARRAY, v); }
        public static Tag ofCompound(Map<String, Tag> v) { return new Tag(COMPOUND, v); }

        @SuppressWarnings("unchecked")
        public Map<String, Tag> compound(String path) { expect(COMPOUND, path); return (Map<String, Tag>) value; }
        public int asInt(String path) { expect(INT, path); return (Integer) value; }
        /** Unsigned short, as used for Schem dimensions. */
        public int asUShort(String path) { expect(SHORT, path); return ((Short) value) & 0xffff; }
        public String asString(String path) { expect(STRING, path); return (String) value; }
        public int[] asIntArray(String path) { expect(INT_ARRAY, path); return (int[]) value; }
        public byte[] asBytes(String path) { expect(BYTE_ARRAY, path); return (byte[]) value; }

        private void expect(byte t, String path) {
            if (type != t) throw new BridgeException(path + ": NBT-Typ " + t + " erwartet, gefunden " + type + ".");
        }
    }

    public record NbtList(byte elementType, List<Tag> values) {}

    public record Root(String name, Tag tag) {}

    public static Root readGzip(byte[] file, int maxBytes) {
        try (var in = new GZIPInputStream(new ByteArrayInputStream(file))) {
            byte[] raw = in.readNBytes(maxBytes + 1);
            if (raw.length > maxBytes) throw new BridgeException("Entpackte Datei überschreitet " + maxBytes + " Bytes.");
            return read(raw);
        } catch (IOException e) {
            throw new BridgeException("Datei ist kein gültiges GZip-NBT: " + e.getMessage());
        }
    }

    public static Root read(byte[] raw) {
        try {
            var in = new DataInputStream(new ByteArrayInputStream(raw));
            byte type = in.readByte();
            if (type != COMPOUND) throw new BridgeException("NBT-Wurzel muss ein Compound sein.");
            String name = in.readUTF();
            Tag tag = readPayload(in, type, 0);
            if (in.read() != -1) throw new BridgeException("Überzählige Bytes nach der NBT-Wurzel.");
            return new Root(name, tag);
        } catch (EOFException e) {
            throw new BridgeException("NBT endet unerwartet.");
        } catch (IOException e) {
            throw new BridgeException("NBT nicht lesbar: " + e.getMessage());
        }
    }

    private static int length(DataInputStream in) throws IOException {
        int n = in.readInt();
        if (n < 0) throw new BridgeException("Negative NBT-Länge.");
        return n;
    }

    private static Tag readPayload(DataInputStream in, byte type, int depth) throws IOException {
        if (depth > 64) throw new BridgeException("NBT zu tief verschachtelt.");
        switch (type) {
            case BYTE: return new Tag(type, in.readByte());
            case SHORT: return new Tag(type, in.readShort());
            case INT: return new Tag(type, in.readInt());
            case LONG: return new Tag(type, in.readLong());
            case FLOAT: return new Tag(type, in.readFloat());
            case DOUBLE: return new Tag(type, in.readDouble());
            case BYTE_ARRAY: { byte[] b = new byte[length(in)]; in.readFully(b); return new Tag(type, b); }
            case STRING: return new Tag(type, in.readUTF());
            case LIST: {
                byte et = in.readByte();
                int n = length(in);
                List<Tag> values = new ArrayList<>(Math.min(n, 1024));
                for (int i = 0; i < n; i++) values.add(readPayload(in, et, depth + 1));
                return new Tag(type, new NbtList(et, values));
            }
            case COMPOUND: {
                Map<String, Tag> map = new LinkedHashMap<>();
                while (true) {
                    byte t = in.readByte();
                    if (t == END) break;
                    String key = in.readUTF();
                    if (map.put(key, readPayload(in, t, depth + 1)) != null) throw new BridgeException("Doppelter NBT-Schlüssel " + key + ".");
                }
                return new Tag(type, map);
            }
            case INT_ARRAY: { int[] v = new int[length(in)]; for (int i = 0; i < v.length; i++) v[i] = in.readInt(); return new Tag(type, v); }
            case LONG_ARRAY: { long[] v = new long[length(in)]; for (int i = 0; i < v.length; i++) v[i] = in.readLong(); return new Tag(type, v); }
            default: throw new BridgeException("Unbekannter NBT-Typ " + type + ".");
        }
    }

    public static byte[] writeGzip(Root root) {
        try {
            var bytes = new ByteArrayOutputStream();
            try (var gz = new GZIPOutputStream(bytes)) { gz.write(write(root)); }
            return bytes.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public static byte[] write(Root root) {
        try {
            var bytes = new ByteArrayOutputStream();
            var out = new DataOutputStream(bytes);
            out.writeByte(root.tag().type());
            out.writeUTF(root.name());
            writePayload(out, root.tag());
            return bytes.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private static void writePayload(DataOutputStream out, Tag tag) throws IOException {
        switch (tag.type()) {
            case BYTE -> out.writeByte((Byte) tag.value());
            case SHORT -> out.writeShort((Short) tag.value());
            case INT -> out.writeInt((Integer) tag.value());
            case LONG -> out.writeLong((Long) tag.value());
            case FLOAT -> out.writeFloat((Float) tag.value());
            case DOUBLE -> out.writeDouble((Double) tag.value());
            case BYTE_ARRAY -> { byte[] b = (byte[]) tag.value(); out.writeInt(b.length); out.write(b); }
            case STRING -> out.writeUTF((String) tag.value());
            case LIST -> {
                NbtList list = (NbtList) tag.value();
                out.writeByte(list.values().isEmpty() ? END : list.elementType());
                out.writeInt(list.values().size());
                for (Tag t : list.values()) {
                    if (t.type() != list.elementType()) throw new BridgeException("Uneinheitliche NBT-Liste.");
                    writePayload(out, t);
                }
            }
            case COMPOUND -> {
                for (var e : ((Map<String, Tag>) tag.value()).entrySet()) {
                    out.writeByte(e.getValue().type());
                    out.writeUTF(e.getKey());
                    writePayload(out, e.getValue());
                }
                out.writeByte(END);
            }
            case INT_ARRAY -> { int[] v = (int[]) tag.value(); out.writeInt(v.length); for (int i : v) out.writeInt(i); }
            case LONG_ARRAY -> { long[] v = (long[]) tag.value(); out.writeInt(v.length); for (long l : v) out.writeLong(l); }
            default -> throw new BridgeException("Unbekannter NBT-Typ " + tag.type() + ".");
        }
    }
}
