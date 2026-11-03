/**
 * Größengrenzen für große Bauwerke (SIZE-01) – die eine Stelle, an der der Planer festlegt,
 * wie groß ein Modell sein darf. Import (Schem, Litematic, Voxel-JSON, Weltausschnitt),
 * Werkstatt, Export, Spielaufnahmen und die Übertragung über die Mod lesen ihre Grenzen von hier.
 *
 * Zwei Arten von Grenzen:
 * - **Harte Grenzen** schützen Browser und Spiel vor dem Absturz (Speicher). Darüber bricht der
 *   Vorgang mit einer erklärenden Meldung ab, die sagt, wie es trotzdem geht (in Abschnitten).
 * - **Stufen** darunter sind Hinweise, keine Abbrüche: ab „groß“ und „sehr groß“ sagt die
 *   Oberfläche, was langsamer wird, und arbeitet trotzdem weiter.
 *
 * Messwerte (Node 22, Chromium ähnlich): eine Million Zellen belegen als Zellobjekte rund
 * 130 MB, in der Werkstatt zusätzlich rund 100 MB. Vier Millionen sind auf einem Rechner mit
 * 8 GB machbar, aber zäh – deshalb die Stufe „sehr groß“ ab 1,5 Millionen.
 */

/** Höchstzahl Zellen (Blöcke und ausdrückliche Luft) in einem Modell, Projekt oder Plan. */
export const MODEL_MAX_CELLS = 4_000_000;
/** Größte Box (Breite × Höhe × Länge). 2^24 – so groß wie Litematic und Weltausschnitt schon erlaubten. */
export const MODEL_MAX_VOLUME = 16_777_216;
/** Größte Ausdehnung je Achse in Dateien (Schem speichert vorzeichenlose Shorts; 4096 reicht für jede Welthöhe). */
export const MODEL_MAX_SIDE = 4096;
/** Bis zu diesem Volumen bleibt Luft beim Import eine ausdrückliche Zelle; darüber übernimmt der Import nur Blöcke. */
export const EXPLICIT_AIR_MAX_VOLUME = 250_000;
/** Pläne mit größerer Box kann erst Mod 0.9.0 (Funktion `bigplans`) laden; ältere Mods lehnen sie ab. */
export const LEGACY_MOD_MAX_VOLUME = 4_000_000;
/** Größte Datei, die Import und Mod-Übertragung annehmen (komprimiert). */
export const MODEL_MAX_FILE_BYTES = 64_000_000;
/** Größte entpackte NBT-Datei beim Import. */
export const MODEL_MAX_UNCOMPRESSED_BYTES = 192_000_000;

export type SizeLevel = 'normal' | 'gross' | 'sehr-gross' | 'zu-gross';

/** Ab hier „groß“: läuft, aber Vorschau, Speichern und Senden dauern spürbar. */
export const SIZE_LARGE_CELLS = 500_000;
/** Ab hier „sehr groß“: braucht viel Arbeitsspeicher; besser in Bauabschnitten arbeiten. */
export const SIZE_HUGE_CELLS = 1_500_000;

export interface SizeAssessment {
  readonly level: SizeLevel;
  readonly cells: number;
  readonly volume: number;
  /** Kurzer Satz für die Oberfläche, leer bei „normal“. */
  readonly message: string;
}

const de = (n: number): string => Math.round(n).toLocaleString('de-DE');
/** „1,2 Mio.“ / „350.000“ – für Meldungen. */
export function formatCount(n: number): string {
  return n >= 1_000_000 ? `${(Math.round(n / 100_000) / 10).toLocaleString('de-DE')} Mio.` : de(n);
}

/**
 * Stuft ein Modell nach Zellenzahl und Box ein. `cells` = Zellen im Modell (ohne unausgewählte),
 * `volume` = Box. Liefert immer einen Wert, wirft nie – die harte Grenze prüft der jeweilige Vorgang.
 */
export function assessSize(cells: number, volume = cells): SizeAssessment {
  const c = Math.max(0, cells), v = Math.max(c, volume);
  if (c > MODEL_MAX_CELLS || v > MODEL_MAX_VOLUME) {
    return { level: 'zu-gross', cells: c, volume: v, message: c > MODEL_MAX_CELLS
      ? `${formatCount(c)} Zellen – mehr als die ${formatCount(MODEL_MAX_CELLS)}, die der Planer sicher verarbeiten kann. Bitte in Bauabschnitte oder mehrere Bauteile teilen.`
      : `Box mit ${formatCount(v)} Zellen – größer als ${formatCount(MODEL_MAX_VOLUME)} (z. B. 512 × 64 × 512). Bitte in mehrere Bauteile teilen.` };
  }
  if (c >= SIZE_HUGE_CELLS) return { level: 'sehr-gross', cells: c, volume: v, message: `Sehr großes Modell (${formatCount(c)} Zellen): braucht viel Arbeitsspeicher; Vorschau, Speichern und Senden dauern mehrere Sekunden. Am besten in Bauabschnitten arbeiten.` };
  if (c >= SIZE_LARGE_CELLS) return { level: 'gross', cells: c, volume: v, message: `Großes Modell (${formatCount(c)} Zellen): Vorschau und Speichern brauchen etwas länger.` };
  return { level: 'normal', cells: c, volume: v, message: '' };
}

/** Meldung für eine überschrittene harte Grenze, einheitlich formuliert. */
export function tooLargeMessage(what: string, value: number, limit: number, unit = 'Zellen', hint = 'Bitte in Bauabschnitte oder mehrere Bauteile teilen.'): string {
  return `${what}: ${formatCount(value)} ${unit}, erlaubt sind höchstens ${formatCount(limit)}. ${hint}`;
}

/** Übersicht aller Grenzen für Systemcheck und Doku. */
export const SIZE_LIMIT_TABLE: readonly { readonly area: string; readonly limit: string }[] = Object.freeze([
  { area: 'Zellen je Modell/Projekt', limit: `${formatCount(MODEL_MAX_CELLS)}` },
  { area: 'Box je Modell/Projekt', limit: `${formatCount(MODEL_MAX_VOLUME)} Zellen, je Achse bis ${de(MODEL_MAX_SIDE)}` },
  { area: 'Datei (Import, Mod-Übertragung)', limit: `${MODEL_MAX_FILE_BYTES / 1_000_000} MB komprimiert, ${MODEL_MAX_UNCOMPRESSED_BYTES / 1_000_000} MB entpackt` },
  { area: 'Ausdrückliche Luft beim Import', limit: `bis ${de(EXPLICIT_AIR_MAX_VOLUME)} Zellen Box, darüber nur Blöcke` },
  { area: 'Hinweis „groß“ / „sehr groß“', limit: `ab ${formatCount(SIZE_LARGE_CELLS)} / ${formatCount(SIZE_HUGE_CELLS)} Zellen` },
  { area: 'Mod vor 0.9.0', limit: `Planbox bis ${formatCount(LEGACY_MOD_MAX_VOLUME)} Zellen` },
]);
