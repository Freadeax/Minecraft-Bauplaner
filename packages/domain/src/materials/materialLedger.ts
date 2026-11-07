import { stackSizeOf } from './materials.js';
import type { MaterialReport } from './materials.js';
import type { SiteOverview } from '../building/site.js';

/**
 * Materialbilanz (FLOW-01): Gesamtbedarf, Lager, Reservierung und Beschaffung in einer Zeile je Bauitem.
 *
 * Alles kommt aus bestehenden Rechnungen, es gibt keine zweite Zähl- oder Itemlogik:
 *  - Gesamtbedarf = Materialbericht des ganzen Projekts (Material-Reiter);
 *  - offen, reserviert und zu beschaffen = Baustellenplan (`planSite`): Bedarf der nicht abgehakten Schritte je Bauabschnitt,
 *    der Lagerbestand wird in Bauabschnitt-Reihenfolge verbraucht;
 *  - verbaut = Gesamtbedarf − offen (abgehakte Schritte);
 *  - frei = Lager, das kein offener Abschnitt braucht.
 * „Reserviert“ heißt also: Dieses Lager ist für offene Abschnitte verplant, „jetzt“ meint den aktuellen Abschnitt
 * (erster mit offenen Schritten). Es ist eine Planungshilfe, keine Sperre im Spiel.
 */
export interface LedgerLine {
  readonly itemId: string;
  /** Bauitems des ganzen Plans. */
  readonly total: number;
  /** In abgehakten Schritten verbaut (total − open, nie negativ). */
  readonly built: number;
  /** Noch zu setzen (nicht abgehakte Schritte). */
  readonly open: number;
  /** Erfasster Lagerbestand (Baustelle bzw. aus den Team-Lagerkisten übernommen). */
  readonly stock: number;
  /** Lager, das für offene Abschnitte verplant ist. */
  readonly reserved: number;
  /** Davon für den aktuellen Abschnitt. */
  readonly reservedNow: number;
  /** Lager, das kein offener Abschnitt braucht. */
  readonly free: number;
  /** Noch zu beschaffen (offen − reserviert). */
  readonly procure: number;
  /** Davon für den aktuellen Abschnitt. */
  readonly procureNow: number;
  readonly stackSize: ReturnType<typeof stackSizeOf>;
  readonly assumed: boolean;
}

export interface MaterialLedger {
  readonly lines: readonly LedgerLine[];
  /** Name des aktuellen Abschnitts, null wenn alles abgehakt ist. */
  readonly current: { readonly id: string; readonly name: string } | null;
  readonly totals: { readonly total: number; readonly built: number; readonly open: number; readonly stock: number; readonly reserved: number; readonly free: number; readonly procure: number; readonly procureNow: number };
  readonly notes: readonly string[];
}

const ns = (id: string): string => id.includes(':') ? id : `minecraft:${id}`;

export function materialLedger(total: Pick<MaterialReport, 'items'>, plan: Pick<SiteOverview, 'sections' | 'currentId'>, stock: Readonly<Record<string, number>>): MaterialLedger {
  const rows = new Map<string, { total: number; open: number; reserved: number; reservedNow: number; procure: number; procureNow: number; assumed: boolean }>();
  const row = (id: string) => { let r = rows.get(id); if (!r) rows.set(id, r = { total: 0, open: 0, reserved: 0, reservedNow: 0, procure: 0, procureNow: 0, assumed: false }); return r; };
  for (const l of total.items) { const r = row(l.itemId); r.total += l.count; if (l.confidence === 'assumed') r.assumed = true; }
  const current = plan.currentId === null ? null : plan.sections.find(s => s.id === plan.currentId) ?? null;
  for (const s of plan.sections) {
    const now = s === current;
    for (const i of s.items) {
      const r = row(i.itemId);
      r.open += i.need; r.reserved += i.fromStock; r.procure += i.missing;
      if (i.assumed) r.assumed = true;
      if (now) { r.reservedNow += i.fromStock; r.procureNow += i.missing; }
    }
  }
  const stocked = new Map(Object.entries(stock).map(([k, v]) => [ns(k), v]));
  for (const id of stocked.keys()) row(id);
  const lines: LedgerLine[] = [...rows.entries()].map(([itemId, r]) => {
    const have = stocked.get(itemId) ?? 0;
    return { itemId, total: r.total, built: Math.max(0, r.total - r.open), open: r.open, stock: have, reserved: r.reserved, reservedNow: r.reservedNow,
      free: Math.max(0, have - r.reserved), procure: r.procure, procureNow: r.procureNow, stackSize: stackSizeOf(itemId), assumed: r.assumed };
  }).sort((a, b) => b.procureNow - a.procureNow || b.procure - a.procure || b.open - a.open || (a.itemId < b.itemId ? -1 : 1));
  const sum = (k: keyof Omit<LedgerLine, 'itemId' | 'assumed' | 'stackSize'>) => lines.reduce((n, l) => n + l[k], 0);
  const notes = [
    'Reserviert = Lager, das für noch offene Bauabschnitte verplant ist (in Bau-Reihenfolge). Das ist eine Planung, keine Sperre im Spiel.',
    'Verbaut zählt die abgehakten Schritte; ein Haken ist eine Angabe, keine Messung. Im Spiel bestätigt ist, was eine Aufnahme belegt (Reiter „Bauen“).',
  ];
  if (lines.some(l => l.assumed)) notes.push('Einige Mengen beruhen auf Annahmen (siehe Material-Reiter).');
  return { lines, current: current ? { id: current.id, name: current.name } : null,
    totals: { total: sum('total'), built: sum('built'), open: sum('open'), stock: sum('stock'), reserved: sum('reserved'), free: sum('free'), procure: sum('procure'), procureNow: sum('procureNow') }, notes };
}

/** Bilanz als CSV (Semikolon, für Tabellenprogramme). */
export function ledgerToCsv(ledger: MaterialLedger): string {
  const head = ['Item', 'Gesamtbedarf', 'Verbaut', 'Offen', 'Lager', 'Reserviert', 'Davon jetzt', 'Frei', 'Zu beschaffen', 'Davon jetzt'];
  const rows = ledger.lines.map(l => [l.itemId, l.total, l.built, l.open, l.stock, l.reserved, l.reservedNow, l.free, l.procure, l.procureNow].join(';'));
  return [head.join(';'), ...rows].join('\r\n') + '\r\n';
}
