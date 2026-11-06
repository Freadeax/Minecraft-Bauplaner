package io.github.freadeax.bauplaner.mod;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Placement helper rules, loader-neutral: is the block the player is about to set the planned one, what
 * is wrong with it, and how must the player click so the game itself produces the planned orientation.
 * The mod only predicts with the game's own placement logic and then lets the click through or not; it
 * never changes what is sent to the server (no faked view direction, no faked click position).
 */
public final class PlacementAdvice {
    private PlacementAdvice() {}

    /** How strictly the helper acts. */
    public enum Guard {
        /** Helper off. */ OFF("aus"),
        /** Only a message, the block is set anyway. */ WARN("nur warnen"),
        /** Wrong block or wrong orientation is not set; correct plan blocks are not broken. */ ON("an");

        public final String label;
        Guard(String label) { this.label = label; }

        public Guard next() { return values()[(ordinal() + 1) % values().length]; }

        /** Label in the mod's language (GAME-12); {@link #label} stays the saved German key. */
        public String text() { return switch (this) { case OFF -> Lang.t("aus", "off"); case WARN -> Lang.t("nur warnen", "warn only"); case ON -> Lang.t("an", "on"); }; }

        public static Guard parse(String text, Guard fallback) {
            if (text == null) return fallback;
            for (Guard g : values()) if (g.name().equalsIgnoreCase(text.trim()) || g.label.equalsIgnoreCase(text.trim())) return g;
            return fallback;
        }
    }

    public enum Kind {
        /** No planned block at this position (outside the plan or planned air): never interfere. */ NOT_PLANNED,
        /** The predicted block equals the plan. */ RIGHT,
        /** Right item, other orientation/half/side (also floor torch where a wall torch is planned). */ WRONG_STATE,
        /** Another block than planned. */ WRONG_BLOCK
    }

    public record Judgement(Kind kind, List<String> differences) {
        public boolean blocks(Guard guard) { return guard == Guard.ON && (kind == Kind.WRONG_BLOCK || kind == Kind.WRONG_STATE); }
    }

    /**
     * @param planned the planned state at the target position, {@code null} if nothing is planned there
     * @param predicted the state the game would place with this click
     * @param sameItem whether the held item is the item of the planned block (wall torch ↔ torch)
     */
    public static Judgement judge(BlockState planned, BlockState predicted, boolean sameItem) {
        if (planned == null || planned.isAir() || predicted == null) return new Judgement(Kind.NOT_PLANNED, List.of());
        BlockRules.Verdict v = BlockRules.compare(planned, predicted);
        if (v == BlockRules.Verdict.OK) return new Judgement(Kind.RIGHT, List.of());
        if (v == BlockRules.Verdict.STATE) return new Judgement(Kind.WRONG_STATE, differences(planned, predicted));
        return new Judgement(sameItem ? Kind.WRONG_STATE : Kind.WRONG_BLOCK, List.of());
    }

    /** Relevant properties that differ, as "Richtung: Osten statt Norden". */
    public static List<String> differences(BlockState planned, BlockState actual) {
        var ignored = BlockRules.ignoredProperties(planned.id());
        List<String> out = new ArrayList<>();
        for (var e : planned.properties().entrySet()) {
            if (ignored.contains(e.getKey())) continue;
            String is = actual.properties().get(e.getKey());
            if (!e.getValue().equals(is)) out.add(propertyName(e.getKey()) + ": " + value(is) + " statt " + value(e.getValue()));
        }
        return out;
    }

    private static final Map<String, String> PROPERTY = Map.of("facing", "Richtung", "half", "Hälfte", "axis", "Achse", "type", "Art",
            "hinge", "Scharnier", "rotation", "Drehung", "face", "Befestigung", "part", "Teil", "orientation", "Ausrichtung", "attachment", "Befestigung");
    private static final Map<String, String> VALUE = Map.ofEntries(Map.entry("north", "Norden"), Map.entry("south", "Süden"), Map.entry("east", "Osten"),
            Map.entry("west", "Westen"), Map.entry("up", "oben"), Map.entry("down", "unten"), Map.entry("top", "oben"), Map.entry("bottom", "unten"),
            Map.entry("upper", "oben"), Map.entry("lower", "unten"), Map.entry("double", "doppelt"), Map.entry("left", "links"), Map.entry("right", "rechts"),
            Map.entry("x", "Ost-West"), Map.entry("y", "senkrecht"), Map.entry("z", "Nord-Süd"), Map.entry("floor", "Boden"), Map.entry("ceiling", "Decke"),
            Map.entry("wall", "Wand"));

    static String propertyName(String key) { return PROPERTY.getOrDefault(key, key); }

    static String value(String v) { return v == null ? "–" : VALUE.getOrDefault(v, v); }

    /** Pitch of the view while clicking. */
    public enum Pitch { LEVEL, UP, DOWN }

    /** Half of a side face that is clicked; {@code ANY} for top and bottom faces. */
    public enum Half { ANY, LOWER, UPPER }

    /**
     * One way of clicking that makes the game place the planned state.
     * @param yaw view direction in sixteenths of a full turn, 0 = south, 4 = west, 8 = north, 12 = east (Minecraft yaw / 22.5°)
     * @param side side of the target where the clicked neighbour block is ("down" = click the top of the block below)
     */
    public record Way(int yaw, Pitch pitch, String side, Half half) {
        public String text() { return text(true, true); }

        /** @param direction whether the view direction matters; @param tilt whether looking up/down matters */
        public String text(boolean direction, boolean tilt) {
            StringBuilder s = new StringBuilder();
            if (direction) s.append("Blick nach ").append(compass(yaw));
            if (tilt && pitch == Pitch.UP) s.append(s.isEmpty() ? "Nach oben schauen" : ", nach oben");
            if (tilt && pitch == Pitch.DOWN) s.append(s.isEmpty() ? "Nach unten schauen" : ", nach unten");
            String click = switch (side) {
                case "down" -> "auf den Block darunter klicken";
                case "up" -> "an die Unterseite des Blocks darüber klicken";
                default -> "an den Block im " + VALUE.getOrDefault(side, side) + " klicken";
            };
            s.append(s.isEmpty() ? Character.toUpperCase(click.charAt(0)) + click.substring(1) : ", " + click);
            if (half == Half.LOWER) s.append(" (untere Hälfte)");
            if (half == Half.UPPER) s.append(" (obere Hälfte)");
            return s.toString();
        }
    }

    private static final String[] COMPASS = { "Süden", "Süd-Südwest", "Südwesten", "West-Südwest", "Westen", "West-Nordwest", "Nordwesten",
            "Nord-Nordwest", "Norden", "Nord-Nordost", "Nordosten", "Ost-Nordost", "Osten", "Ost-Südost", "Südosten", "Süd-Südost" };

    public static String compass(int yaw) { return COMPASS[Math.floorMod(yaw, 16)]; }

    /** Minecraft yaw in degrees for a sixteenth. */
    public static float yawDegrees(int yaw) { return Math.floorMod(yaw, 16) * 22.5f; }

    /** Sixteenth of the player's current yaw. */
    public static int yawOf(float degrees) { return Math.floorMod(Math.round(degrees / 22.5f), 16); }

    /**
     * The easiest of the working ways for a player looking in {@code currentYaw}/{@code currentPitch}:
     * cardinal directions first, then least turning, then level view, then clicking the block below.
     */
    public static Way best(List<Way> ways, int currentYaw, Pitch currentPitch) {
        return ways.stream().min(Comparator
                .comparingInt((Way w) -> w.yaw() % 4 == 0 ? 0 : 1)
                .thenComparingInt(w -> turn(w.yaw(), currentYaw))
                .thenComparingInt(w -> w.pitch() == currentPitch ? 0 : w.pitch() == Pitch.LEVEL ? 1 : 2)
                .thenComparingInt(w -> w.side().equals("down") ? 0 : w.side().equals("up") ? 2 : 1)
                .thenComparingInt(w -> w.half().ordinal())).orElse(null);
    }

    /**
     * Hint for the easiest way, leaving out what does not matter: if the same face works in every view
     * direction (logs, planks on top), no direction is named; if it works level, up and down, no tilt.
     */
    public static String advice(List<Way> ways, int currentYaw, Pitch currentPitch) {
        Way w = best(ways, currentYaw, currentPitch);
        if (w == null) return null;
        boolean anyYaw = true, anyPitch = true;
        for (int y = 0; y < 16 && anyYaw; y++) anyYaw = ways.contains(new Way(y, w.pitch(), w.side(), w.half()));
        for (Pitch p : Pitch.values()) anyPitch &= ways.contains(new Way(w.yaw(), p, w.side(), w.half()));
        return w.text(!anyYaw, !anyPitch);
    }

    /** Whether the player's current view direction already belongs to a working way. */
    public static boolean viewFits(List<Way> ways, int currentYaw, Pitch currentPitch) {
        for (Way w : ways) if (turn(w.yaw(), currentYaw) <= 1 && w.pitch() == currentPitch) return true;
        return false;
    }

    static int turn(int a, int b) { int d = Math.floorMod(a - b, 16); return Math.min(d, 16 - d); }

    public static Pitch pitchOf(float degrees) { return degrees < -35 ? Pitch.UP : degrees > 35 ? Pitch.DOWN : Pitch.LEVEL; }

    public static float pitchDegrees(Pitch p) { return switch (p) { case LEVEL -> 0f; case UP -> -70f; case DOWN -> 70f; }; }
}
