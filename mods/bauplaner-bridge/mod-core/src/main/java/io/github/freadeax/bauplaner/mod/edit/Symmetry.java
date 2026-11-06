package io.github.freadeax.bauplaner.mod.edit;

import static io.github.freadeax.bauplaner.mod.Lang.t;

import io.github.freadeax.bauplaner.mod.BlockState;
import io.github.freadeax.bauplaner.mod.Placement;
import java.util.ArrayList;
import java.util.List;

/**
 * Symmetrie beim Bauen im Spiel (EDIT-04, mod side): the same finite group of transforms around a vertical axis as
 * the planner's workshop ({@code packages/domain/src/editor/symmetry.ts}). The axis lies at {@code centre2 / 2}
 * (doubled, so it may run through a cell centre or along a cell border). Positions turn like
 * {@code transformVector}, block states with the mod's one orientation rule ({@link Placement#toWorld(BlockState)}:
 * mirror x first, then clockwise quarter turns) – no second rule.
 */
public record Symmetry(boolean mirrorX, boolean mirrorZ, int rotate, int cx2, int cz2) {
    public static final Symmetry OFF = new Symmetry(false, false, 1, 0, 0);

    public Symmetry {
        if (rotate != 1 && rotate != 2 && rotate != 4) throw new IllegalArgumentException("Drehsymmetrie 1, 2 oder 4 erwartet");
        // Quarter turns map cells to cells only when both axis coordinates lie on centres or both on borders.
        if (rotate == 4 && Math.floorMod(cx2 - cz2, 2) != 0) throw new IllegalArgumentException("Für Vierteldrehungen muss die Achse in X und Z gleich liegen (beide auf Zellmitte oder beide auf Zellgrenze)");
    }

    /** One element of the group: quarter turns clockwise after an optional mirror of x. */
    public record Turn(int quarterTurns, boolean mirrorX) {
        static final Turn ID = new Turn(0, false);
        /** a ∘ b (apply b first): R^qa M^ma R^qb M^mb = R^(qa ± qb) M^(ma xor mb), since M R = R⁻¹ M. */
        Turn after(Turn b) { return new Turn(Math.floorMod(quarterTurns + (mirrorX ? 4 - b.quarterTurns : b.quarterTurns), 4), mirrorX != b.mirrorX); }
        /** The state rule of the mod: a placement at 0/0/0 with this turn. */
        Placement placement() { return new Placement("", 0, 0, 0, quarterTurns, mirrorX); }
    }

    public boolean active() { return mirrorX || mirrorZ || rotate > 1; }

    /** Axis through the centre of a block (both coordinates on the cell centre). */
    public static Symmetry around(int x, int z) { return new Symmetry(false, false, 1, 2 * x, 2 * z); }

    public Symmetry withMirrorX(boolean on) { return new Symmetry(on, mirrorZ, rotate, cx2, cz2); }
    public Symmetry withMirrorZ(boolean on) { return new Symmetry(mirrorX, on, rotate, cx2, cz2); }
    public Symmetry withRotate(int r) { return new Symmetry(mirrorX, mirrorZ, r, cx2, cz2); }
    public Symmetry withAxis(int x2, int z2) { return new Symmetry(mirrorX, mirrorZ, rotate == 4 && Math.floorMod(x2 - z2, 2) != 0 ? 2 : rotate, x2, z2); }

    /** All transforms of the group, identity first (1, 2, 4 or 8), in the planner's order. */
    public List<Turn> group() {
        List<Turn> gens = new ArrayList<>();
        if (mirrorX) gens.add(new Turn(0, true));
        if (mirrorZ) gens.add(new Turn(2, true));
        if (rotate == 2) gens.add(new Turn(2, false));
        if (rotate == 4) gens.add(new Turn(1, false));
        List<Turn> out = new ArrayList<>(List.of(Turn.ID));
        for (int i = 0; i < out.size(); i++) for (Turn g : gens) {
            Turn n = g.after(out.get(i));
            if (!out.contains(n)) out.add(n);
        }
        return out;
    }

    /** Image of a cell under one transform (around the axis). */
    public int[] image(int x, int y, int z, Turn t) {
        int vx = 2 * x - cx2, vz = 2 * z - cz2;
        if (t.mirrorX()) vx = -vx;
        for (int i = 0; i < t.quarterTurns(); i++) { int tmp = vx; vx = -vz; vz = tmp; }
        return new int[] { (vx + cx2) / 2, y, (vz + cz2) / 2 };
    }

    /** State of the image (doors, stairs, chests, rails … turned and mirrored like the game's structures). */
    public BlockState state(BlockState s, Turn t) { return t.quarterTurns() == 0 && !t.mirrorX() ? s : t.placement().toWorld(s); }

    /** "Spiegeln Ost/West + Nord/Süd · 4-fach drehen · Achse X 10,5 · Z -3". */
    public String label() {
        if (!active()) return t("aus", "off");
        List<String> parts = new ArrayList<>();
        if (mirrorX || mirrorZ) parts.add(t("Spiegeln ", "mirror ") + (mirrorX && mirrorZ ? t("Ost/West + Nord/Süd", "east/west + north/south") : mirrorX ? t("Ost/West", "east/west") : t("Nord/Süd", "north/south")));
        if (rotate > 1) parts.add(rotate + t("-fach drehen", "-fold rotation"));
        return String.join(" · ", parts) + t(" · Achse X ", " · axis X ") + half(cx2) + " · Z " + half(cz2);
    }

    private static String half(int v2) { return (v2 < 0 ? "-" : "") + Math.abs(v2) / 2 + (Math.abs(v2) % 2 == 1 ? ",5" : ""); }
}
