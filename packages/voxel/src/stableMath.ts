/**
 * Plattformunabhängige Winkel- und Abstandsfunktionen (PERF-05, Befund S-1).
 *
 * `Math.sin`, `Math.cos`, `Math.atan2` und `Math.hypot` sind in JavaScript nur
 * „implementierungsabhängig angenähert“: Node 22 und das aktuelle Chromium liefern
 * gemessen bei ~4 % der Eingaben ein anderes letztes Bit, Firefox und Safari rechnen
 * wieder anders. Fällt ein Generator damit eine Ganzzahl-Entscheidung (Block ja/nein,
 * Bogennummer), entsteht auf einem anderen Browser eine andere Geometrie – und weil
 * Versions-ids Inhaltsadressen sind, eine andere Version desselben mitgelieferten
 * Gebäudes (Scheinupdates, abweichende Teampakete, Katalogdatei passt nicht).
 *
 * Diese Funktionen nutzen nur +, −, ×, ÷, `Math.sqrt` und `Math.round` – alle von IEEE 754
 * bzw. ECMAScript exakt festgelegt – in fester Reihenfolge, also überall dasselbe Ergebnis.
 * Verfahren und Konstanten aus fdlibm (Sun Microsystems, frei verwendbar): Cody-Waite-
 * Reduktion auf [−π/4, π/4] und Minimax-Polynome; Genauigkeit für |x| < 10⁶ besser als
 * 2·10⁻¹⁶ (Test `stable-math.test.mjs`). Für Geometrie, die gespeichert oder verglichen
 * wird, diese Funktionen statt `Math.*` verwenden; Anzeige und Kamera dürfen `Math.*` nutzen.
 */

const INV_PIO2 = 6.36619772367581382433e-01;
const PIO2_1 = 1.57079632673412561417e+00;
const PIO2_1T = 6.07710050650619224932e-11;

const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
  S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
  C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;

/** sin on [−π/4, π/4]. */
function kernelSin(x: number): number {
  const z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  return x + v * (S1 + z * r);
}
/** cos on [−π/4, π/4]. */
function kernelCos(x: number): number {
  const z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6))))), hz = 0.5 * z, w = 1 - hz;
  return w + (((1 - w) - hz) + z * r);
}
/** Quadrant (0–3) and remainder in [−π/4, π/4]. */
function reduce(x: number): [number, number] {
  const k = Math.round(x * INV_PIO2);
  const r = (x - k * PIO2_1) - k * PIO2_1T;
  return [((k % 4) + 4) % 4, r];
}

export function stableSin(x: number): number {
  if (!Number.isFinite(x)) return Number.NaN;
  if (x === 0) return x;
  const [n, r] = reduce(x);
  return n === 0 ? kernelSin(r) : n === 1 ? kernelCos(r) : n === 2 ? -kernelSin(r) : -kernelCos(r);
}

export function stableCos(x: number): number {
  if (!Number.isFinite(x)) return Number.NaN;
  const [n, r] = reduce(x);
  return n === 0 ? kernelCos(r) : n === 1 ? -kernelSin(r) : n === 2 ? -kernelCos(r) : kernelSin(r);
}

const ATAN_HI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00] as const;
const ATAN_LO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17] as const;
const AT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01,
  9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02,
  4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02] as const;

export function stableAtan(value: number): number {
  if (Number.isNaN(value)) return Number.NaN;
  const negative = value < 0;
  let x = negative ? -value : value, id: number;
  if (x >= 7.378697629483821e19) { const z = ATAN_HI[3] + ATAN_LO[3]; return negative ? -z : z; }
  if (x < 0.4375) { if (x < 1.862645149230957e-9) return value; id = -1; }
  else if (x < 0.6875) { id = 0; x = (2 * x - 1) / (2 + x); }
  else if (x < 1.1875) { id = 1; x = (x - 1) / (x + 1); }
  else if (x < 2.4375) { id = 2; x = (x - 1.5) / (1 + 1.5 * x); }
  else { id = 3; x = -1 / x; }
  const z = x * x, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) { const r = x - x * (s1 + s2); return negative ? -r : r; }
  const r = ATAN_HI[id]! - ((x * (s1 + s2) - ATAN_LO[id]!) - x);
  return negative ? -r : r;
}

const PI = 3.14159265358979311600e+00, PI_LO = 1.22464679914735317720e-16;

/** Angle of (x, y) in (−π, π], like `Math.atan2(y, x)`. */
export function stableAtan2(y: number, x: number): number {
  if (Number.isNaN(x) || Number.isNaN(y)) return Number.NaN;
  // Infinite arguments: exact constants, the same everywhere.
  if (!Number.isFinite(x) || !Number.isFinite(y)) return Math.atan2(y, x);
  if (y === 0) return (x > 0 || Object.is(x, 0)) ? y : (Object.is(y, -0) ? -PI : PI);
  if (x === 0) return y > 0 ? ATAN_HI[3] + ATAN_LO[3] : -(ATAN_HI[3] + ATAN_LO[3]);
  const z = stableAtan(Math.abs(y / x));
  if (x > 0) return y > 0 ? z : -z;
  return y > 0 ? PI - (z - PI_LO) : (z - PI_LO) - PI;
}

/** Length of a vector, like `Math.hypot`, as √(Σ xᵢ²) in argument order. */
export function stableHypot(...values: number[]): number {
  let sum = 0;
  for (const v of values) sum += v * v;
  return Math.sqrt(sum);
}
