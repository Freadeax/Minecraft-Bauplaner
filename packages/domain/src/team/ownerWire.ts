import type { Vec3 } from '../../../voxel/src/types.js';

/**
 * `Resolution.owners` (positionKey → beitragende Instanzen) schlank übertragen (PERF-02).
 *
 * Die Zuordnung hat einen Eintrag je Weltzelle. Bei großen Projekten (256 000 Zellen) kostete das
 * Kopieren der Map vom Worker zur Seite über 200 ms – bei jeder Änderung, obwohl die Seite sie nur
 * beim Anklicken einzelner Blöcke oder Gruppen braucht. Sie reist deshalb als Zahlen (Koordinaten,
 * Index der Besitzerliste; gleiche Listen nur einmal) und wird auf der Seite wieder zur selben
 * gewöhnlichen Map (gleiche Schlüssel, Werte, Reihenfolge). Eine „erst beim Lesen gefüllte“ Map
 * wurde verworfen: `structuredClone` und `util.isDeepStrictEqual` lesen Maps an überschriebenen
 * Methoden vorbei und hätten sie leer gesehen.
 */
/** Gegenstück zu `encodeOwners`: eine gewöhnliche Map mit denselben Schlüsseln, Werten und derselben Reihenfolge. */
export function decodeOwners(wire: OwnerWire): Map<string, readonly string[]> {
  const { xyz, list, lists } = wire;
  if (xyz.length !== list.length * 3) throw new Error('Besitzerdaten passen nicht zusammen.');
  const owners = new Map<string, readonly string[]>();
  for (let i = 0; i < list.length; i++) {
    const ids = lists[list[i]!];
    if (!ids) throw new Error('Besitzerdaten verweisen ins Leere.');
    owners.set(`${xyz[3 * i]},${xyz[3 * i + 1]},${xyz[3 * i + 2]}`, ids);
  }
  return owners;
}

/** Übertragungsform von `Resolution.owners`; Puffer gehen in die Transferliste. */
export interface OwnerWire { readonly xyz: Int32Array; readonly list: Int32Array; readonly lists: readonly (readonly string[])[] }

const ownerEntries = new WeakMap<object, { readonly positions: readonly Vec3[]; readonly lists: readonly (readonly string[])[] }>();
/** `resolveProject`: Positionen und Listen der Map in ihrer Reihenfolge, damit `encodeOwners` keine Schlüssel zerlegen muss. */
export function rememberOwnerEntries(owners: ReadonlyMap<string, readonly string[]>, positions: readonly Vec3[], lists: readonly (readonly string[])[]): void {
  if (positions.length === owners.size && lists.length === owners.size) ownerEntries.set(owners, { positions, lists });
}

/** Jede Besitzer-Map in kompakter Form; nur Schlüssel im Format von `positionKey` sind zulässig. */
export function encodeOwners(owners: ReadonlyMap<string, readonly string[]>): OwnerWire {
  const known = ownerEntries.get(owners);
  // Resolutions are read-only; the size check only catches a map that was obviously replaced or extended.
  if (known && known.positions.length === owners.size) return pack(known.positions.length, i => known.positions[i]!, i => known.lists[i]!);
  const entries = [...owners], positions = entries.map(([key]) => {
    const parts = key.split(','), x = Number(parts[0]), y = Number(parts[1]), z = Number(parts[2]);
    if (parts.length !== 3 || `${x},${y},${z}` !== key || (x | 0) !== x || (y | 0) !== y || (z | 0) !== z) throw new Error(`Ungültiger Zellschlüssel ${key}`);
    return [x, y, z] as const;
  });
  return pack(entries.length, i => positions[i]!, i => entries[i]![1]);
}

function pack(count: number, position: (i: number) => readonly [number, number, number], owners: (i: number) => readonly string[]): OwnerWire {
  const xyz = new Int32Array(count * 3), list = new Int32Array(count), lists: (readonly string[])[] = [], seen = new Map<readonly string[], number>();
  for (let i = 0; i < count; i++) {
    const p = position(i);
    xyz[3 * i] = p[0]; xyz[3 * i + 1] = p[1]; xyz[3 * i + 2] = p[2];
    const ids = owners(i);
    let k = seen.get(ids);
    if (k === undefined) { k = lists.length; lists.push(ids); seen.set(ids, k); }
    list[i] = k;
  }
  return { xyz, list, lists };
}
