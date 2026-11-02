package io.github.freadeax.bauplaner.mod;

import java.util.Collections;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Pattern;

/**
 * A block state as text ({@code minecraft:oak_stairs[facing=east,half=bottom]}), properties sorted
 * by name. The same notation as Sponge palettes and the website's {@code stateText}.
 */
public record BlockState(String id, Map<String, String> properties) {
    private static final Pattern ID = Pattern.compile("^[a-z0-9_.-]+:[a-z0-9_./-]+$");
    private static final Pattern PROP = Pattern.compile("^[a-z0-9_]+=[a-z0-9_.+-]+$");
    public static final BlockState AIR = new BlockState("minecraft:air", Map.of());

    public BlockState {
        properties = Collections.unmodifiableMap(new TreeMap<>(properties));
    }

    public static BlockState parse(String text) {
        int open = text.indexOf('[');
        String id = open < 0 ? text : text.substring(0, open);
        if (!ID.matcher(id).matches()) throw new IllegalArgumentException("Ungültige Block-ID: " + text);
        var props = new TreeMap<String, String>();
        if (open >= 0) {
            if (!text.endsWith("]")) throw new IllegalArgumentException("Ungültiger Blockzustand: " + text);
            String inner = text.substring(open + 1, text.length() - 1);
            if (!inner.isEmpty()) for (String part : inner.split(",")) {
                if (!PROP.matcher(part).matches()) throw new IllegalArgumentException("Ungültige Eigenschaft in " + text);
                int eq = part.indexOf('=');
                if (props.put(part.substring(0, eq), part.substring(eq + 1)) != null) throw new IllegalArgumentException("Doppelte Eigenschaft in " + text);
            }
        }
        return new BlockState(id, props);
    }

    public boolean isAir() { return BlockRules.isAir(id); }

    public BlockState with(Map<String, String> newProperties) { return new BlockState(id, newProperties); }

    @Override
    public String toString() {
        if (properties.isEmpty()) return id;
        var sb = new StringBuilder(id).append('[');
        properties.forEach((k, v) -> sb.append(k).append('=').append(v).append(','));
        sb.setCharAt(sb.length() - 1, ']');
        return sb.toString();
    }
}
