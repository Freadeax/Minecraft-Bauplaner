/**
 * Testprotokoll der Testphase: je Testfall ein Ergebnis mit Notiz, im Browser gespeichert
 * (localStorage, Schlüssel bauplaner.testphase.v1). Es sind Browserdaten, keine Projektdaten:
 * Sicherungen enthalten es nicht, ein Export als Markdown ersetzt das.
 */
import { ALL_CASES, MERGED_INTO, TEST_AREAS } from './testplan.ts';
import type { TestArea } from './testplan.ts';

export type CaseResult = 'ok' | 'fehler' | 'offen';
export interface CaseEntry { readonly result: CaseResult; readonly note: string; readonly at: string }
export interface Protocol { readonly tester: string; readonly entries: Readonly<Record<string, CaseEntry>> }

export const STORAGE_KEY = 'bauplaner.testphase.v1';
export const EMPTY: Protocol = { tester: '', entries: {} };

export function parseProtocol(raw: string | null): Protocol {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return EMPTY;
    const d = data as { tester?: unknown; entries?: unknown };
    const entries: Record<string, CaseEntry> = {};
    if (d.entries && typeof d.entries === 'object') {
      for (const [id, e] of Object.entries(d.entries as Record<string, unknown>)) {
        if (!e || typeof e !== 'object') continue;
        const { result, note, at } = e as Partial<CaseEntry>;
        if (result === 'ok' || result === 'fehler' || result === 'offen') entries[id] = { result, note: typeof note === 'string' ? note : '', at: typeof at === 'string' ? at : '' };
      }
    }
    return { tester: typeof d.tester === 'string' ? d.tester : '', entries: migrateEntries(entries) };
  } catch { return EMPTY; }
}

const MARK: Record<CaseResult, string> = { ok: '✓', fehler: '✕', offen: '?' };

/**
 * Ergebnisse zusammengelegter Fälle (`merged` im Testplan) auf den neuen Fall übertragen, damit nach der
 * Neuordnung kein Haken und keine Notiz verloren geht. ✕ in einem Teil → ✕; ✓ nur, wenn alle früheren Teile
 * und der Fall selbst ✓ waren; sonst ? mit Hinweis, welche Teile schon geprüft sind.
 */
export function migrateEntries(entries: Readonly<Record<string, CaseEntry>>): Record<string, CaseEntry> {
  const out: Record<string, CaseEntry> = {};
  const targets = new Set<string>();
  for (const [id, e] of Object.entries(entries)) {
    const target = MERGED_INTO[id];
    if (target) targets.add(target); else out[id] = e;
  }
  for (const target of targets) {
    const sources = [target, ...(ALL_CASES.find(c => c.id === target)?.merged ?? [])];
    const found = sources.map(id => [id, entries[id]] as const).filter((x): x is readonly [string, CaseEntry] => !!x[1]);
    const results = found.map(([, e]) => e.result);
    const result: CaseResult = results.includes('fehler') ? 'fehler' : found.length === sources.length && results.every(r => r === 'ok') ? 'ok' : 'offen';
    const own = entries[target];
    const notes = [own?.note.trim() ?? '', ...found.filter(([id]) => id !== target).map(([id, e]) => `früher ${id} ${MARK[e.result]}${e.note.trim() ? ` ${e.note.trim()}` : ''}`)].filter(Boolean);
    const at = found.map(([, e]) => e.at).sort().at(-1) ?? '';
    out[target] = { result, note: notes.join(' · '), at };
  }
  return out;
}

export function loadProtocol(): Protocol {
  try { return parseProtocol(localStorage.getItem(STORAGE_KEY)); } catch { return EMPTY; }
}

export function saveProtocol(p: Protocol): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* privates Fenster o. ä.: bleibt nur im Speicher */ }
}

export function setResult(p: Protocol, id: string, result: CaseResult | null, note = p.entries[id]?.note ?? '', at = new Date().toISOString()): Protocol {
  const entries = { ...p.entries };
  if (result === null && !note.trim()) delete entries[id];
  else entries[id] = { result: result ?? entries[id]?.result ?? 'offen', note, at };
  return { ...p, entries };
}

export interface AreaSummary { readonly total: number; readonly ok: number; readonly fehler: number; readonly offen: number; readonly done: number }

export function summarize(p: Protocol, area: TestArea, level?: 'kern'): AreaSummary {
  const cases = level ? area.cases.filter(c => c.level === level) : area.cases;
  let ok = 0, fehler = 0, offen = 0;
  for (const c of cases) {
    const r = p.entries[c.id]?.result;
    if (r === 'ok') ok++; else if (r === 'fehler') fehler++; else if (r === 'offen') offen++;
  }
  return { total: cases.length, ok, fehler, offen, done: ok + fehler };
}

const LABEL: Record<CaseResult, string> = { ok: '✓ in Ordnung', fehler: '✕ Fehler', offen: '? offen' };

/** Protokoll als Markdown für Nachricht oder Issue; nur geprüfte Fälle, mit Notizen. */
export function protocolMarkdown(p: Protocol, env: ReadonlyArray<readonly [string, string]>, at = new Date()): string {
  const lines = [`## Testprotokoll Minecraft-Bauplaner`, `- Tester: ${p.tester.trim() || '–'}`, `- Stand: ${at.toISOString()}`, ...env.filter(([k]) => k === 'Build' || k === 'Browser' || k === 'System').map(([k, v]) => `- ${k}: ${v}`), ''];
  let any = false;
  for (const area of TEST_AREAS) {
    const s = summarize(p, area);
    if (s.done + s.offen === 0) continue;
    any = true;
    lines.push(`### ${area.title} · ${s.ok} ok, ${s.fehler} Fehler, ${s.offen} offen, ${s.total - s.done - s.offen} nicht geprüft`);
    for (const c of area.cases) {
      const e = p.entries[c.id];
      if (!e) continue;
      lines.push(`- ${c.id} ${c.title}: ${LABEL[e.result]}${e.note.trim() ? ` – ${e.note.trim().replaceAll('\n', ' ')}` : ''}`);
    }
    lines.push('');
  }
  if (!any) lines.push('Noch kein Testfall bewertet.');
  return lines.join('\n').trimEnd() + '\n';
}
