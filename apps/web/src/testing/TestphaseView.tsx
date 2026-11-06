import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../app/context';
import { parseManifest } from '../app/delivery';
import type { DeploymentManifest } from '../app/delivery';
import { bugReport, collectEnvironment, diagnosisText, issueUrl, SEVERITIES } from '../app/diagnostics';
import type { BugInput, Environment } from '../app/diagnostics';
import { loggedErrors, onErrorLogged } from '../app/errorLog';
import { useDocumentTitle } from '../app/Shell';
import { download, REPO_URL } from '../app/ui';
import { AUTO_SCOPE_LABEL, autoCheckOf } from './autochecks';
import { ALL_CASES, AREA_KIND_LABEL, areaOf, findCase, packagesOf, PLACE_LABEL, PLACE_ORDER, placeOf, TEST_AREAS } from './testplan';
import type { TestArea, TestCase, TestPlace } from './testplan';
import { loadProtocol, protocolMarkdown, saveProtocol, setResult, summarize } from './protocol';
import type { CaseResult, Protocol } from './protocol';
import './testphase.css';

const base = import.meta.env.BASE_URL;
const RESULTS: readonly { id: CaseResult; label: string; title: string }[] = [
  { id: 'ok', label: '✓', title: 'In Ordnung' }, { id: 'fehler', label: '✕', title: 'Fehler gefunden' }, { id: 'offen', label: '?', title: 'Unklar / später' },
];

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function useManifest(): DeploymentManifest | null {
  const [manifest, setManifest] = useState<DeploymentManifest | null>(null);
  useEffect(() => {
    fetch(`${base}deployment.json`, { cache: 'no-store' })
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return parseManifest(await r.json()); })
      .then(setManifest, () => setManifest(null));
  }, []);
  return manifest;
}

/** Umgebung einmal je Anzeige erfassen; Fehlerprotokoll live. */
function useEnvironment(manifest: DeploymentManifest | null): Environment | null {
  const { repo, library } = useApp();
  const [env, setEnv] = useState<Environment | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      let projects: number | undefined;
      try { projects = (await repo.listProjects()).length; } catch { /* unbekannt */ }
      const e = await collectEnvironment({ build: manifest, repoKind: repo.kind, projects, ownAssets: library.assets.filter(a => !a.demo).length });
      if (alive) setEnv(e);
    })();
    return () => { alive = false; };
  }, [repo, library, manifest]);
  return env;
}

interface ReportProps { readonly initialCase?: string | undefined; readonly env: Environment | null; readonly tester: string; readonly onClose: () => void }

/** Formular „Fehler melden“: eigene Angaben plus automatische Diagnose; kopieren, speichern, GitHub-Issue öffnen. */
function ReportForm({ initialCase, env, tester, onClose }: ReportProps) {
  const found = initialCase ? findCase(initialCase) : undefined;
  const [bug, setBug] = useState<BugInput>({ title: found ? `${found.id}: ${found.title}` : '', area: (found && areaOf(found.id)?.title) ?? '', severity: SEVERITIES[1], caseId: found?.id ?? '', steps: found ? found.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') : '', expected: found?.expect ?? '', actual: '', tester });
  const [errors, setErrors] = useState(loggedErrors);
  const [message, setMessage] = useState('');
  useEffect(() => onErrorLogged(() => setErrors(loggedErrors())), []);
  const diagnosis = useMemo(() => env ? diagnosisText(env, errors) : 'Umgebung wird erfasst …', [env, errors]);
  const text = bugReport(bug, diagnosis);
  const issue = issueUrl(REPO_URL, bug, diagnosis);
  const set = <K extends keyof BugInput>(key: K, value: BugInput[K]) => setBug(b => ({ ...b, [key]: value }));
  const fileName = `fehlerbericht-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.md`;
  return <section className="tp-report" aria-labelledby="tp-report-title">
    <div className="tp-report-head"><h2 id="tp-report-title">Fehler melden</h2><button type="button" onClick={onClose}>Schließen</button></div>
    <p className="muted">Beschreibe, was du gemacht hast und was passiert ist. Die Diagnose unten wird automatisch angehängt: Build, Browser, Grafik, Speicher, Fehlerprotokoll und Konsolenwarnungen dieser Sitzung. Projekte, Bauteile oder Dateien sind nicht enthalten.</p>
    <div className="tp-form">
      <label>Titel<input value={bug.title} onChange={e => set('title', e.target.value)} placeholder="Kurz: Was geht nicht?" /></label>
      <div className="tp-form-row">
        <label>Bereich<select aria-label="Bereich" value={bug.area} onChange={e => set('area', e.target.value)}><option value="">–</option>{TEST_AREAS.map(a => <option key={a.id} value={a.title}>{a.title}</option>)}</select></label>
        <label>Schwere<select value={bug.severity} onChange={e => set('severity', e.target.value)}>{SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
        <label>Testfall<input value={bug.caseId ?? ''} onChange={e => set('caseId', e.target.value)} placeholder="z. B. PROJ-04" list="tp-cases" /><datalist id="tp-cases">{ALL_CASES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</datalist></label>
        <label>Dein Name<input value={bug.tester ?? ''} onChange={e => set('tester', e.target.value)} placeholder="optional" /></label>
      </div>
      <label>Was ich gemacht habe<textarea rows={4} value={bug.steps} onChange={e => set('steps', e.target.value)} placeholder="Schritt für Schritt, so dass es jemand nachmachen kann" /></label>
      <div className="tp-form-row">
        <label>Erwartet<textarea rows={3} value={bug.expected} onChange={e => set('expected', e.target.value)} /></label>
        <label>Tatsächlich<textarea rows={3} value={bug.actual} onChange={e => set('actual', e.target.value)} placeholder="Fehlermeldung wörtlich, falls vorhanden" /></label>
      </div>
    </div>
    <details className="tp-diagnosis"><summary>Diagnose ansehen ({errors.length} Fehler im Protokoll)</summary><pre>{diagnosis}</pre></details>
    {message && <p className="notice" role="status">{message}</p>}
    <div className="button-row">
      <a className="button primary" href={issue.url} target="_blank" rel="noreferrer" onClick={() => setMessage(issue.truncated ? 'GitHub geöffnet. Die Diagnose wurde für die Adresse gekürzt – bitte den gespeicherten Bericht als Datei anhängen.' : 'GitHub geöffnet (Anmeldung nötig). Dort prüfen und „Submit“ drücken.')}>Als GitHub-Issue öffnen ↗</a>
      <button type="button" onClick={() => void copy(text).then(ok => setMessage(ok ? 'Bericht kopiert. In eine Nachricht an Philipp oder ein Issue einfügen.' : 'Kopieren nicht möglich – bitte den Text unten markieren.'))}>Bericht kopieren</button>
      <button type="button" onClick={() => { download(fileName, text, 'text/markdown'); setMessage(`Gespeichert als ${fileName}.`); }}>Als Datei speichern</button>
    </div>
    <details className="tp-diagnosis"><summary>Ganzer Bericht als Text</summary><textarea readOnly rows={12} value={text} aria-label="Fehlerbericht" onFocus={e => e.currentTarget.select()} /></details>
  </section>;
}

function CaseRow({ c, protocol, onResult, onReport }: { c: TestCase; protocol: Protocol; onResult: (id: string, r: CaseResult | null, note?: string) => void; onReport: (id: string) => void }) {
  const entry = protocol.entries[c.id];
  const auto = autoCheckOf(c.id);
  const [open, setOpen] = useState(false);
  return <li className={`tp-case${entry ? ` tp-${entry.result}` : ''}`} data-case={c.id} data-level={c.level}>
    <div className="tp-case-head">
      <button type="button" className="tp-case-title" aria-expanded={open} onClick={() => setOpen(o => !o)}><code>{c.id}</code> {c.title}{c.level === 'vertieft' && <small> · vertieft</small>}{auto && <small className={`tp-auto tp-auto-${auto.scope}`} data-testid="tp-auto-badge"> · 🤖 {AUTO_SCOPE_LABEL[auto.scope]}</small>}</button>
      <div className="tp-results" role="group" aria-label={`Ergebnis ${c.id}`}>
        {RESULTS.map(r => <button key={r.id} type="button" className={entry?.result === r.id ? 'active' : ''} aria-pressed={entry?.result === r.id} title={r.title} aria-label={`${c.id} ${r.title}`} onClick={() => onResult(c.id, entry?.result === r.id ? null : r.id)}>{r.label}</button>)}
      </div>
    </div>
    {(open || entry?.result === 'fehler') && <div className="tp-case-body">
      <ol>{c.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <p><b>Erwartet:</b> {c.expect}{c.start && <> · <a href={c.start}>Hier starten</a></>}</p>
      {packagesOf(c.id).length > 0 && <p className="muted tp-packages" data-testid="tp-packages">Abnahme für: {packagesOf(c.id).join(', ')}</p>}
      {auto && <div className="tp-auto-proof" data-testid="tp-auto-proof"><p><b>🤖 {AUTO_SCOPE_LABEL[auto.scope]}:</b> {auto.covers}</p>{auto.remaining && <p><b>Bleibt für dich:</b> {auto.remaining}</p>}<p className="muted">Nachweis: {auto.evidence} · Wiederholen: <code>{auto.command}</code></p></div>}
      {c.merged && <p className="muted tp-merged">Enthält die früheren Fälle {c.merged.join(', ')}.</p>}
      <label className="tp-note">Notiz<input value={entry?.note ?? ''} onChange={e => onResult(c.id, entry?.result ?? null, e.target.value)} placeholder="Was war anders? Gerät, Datei, Besonderheit" /></label>
      {entry?.result === 'fehler' && <button type="button" className="tp-report-link" onClick={() => onReport(c.id)}>Fehler zu {c.id} melden</button>}
    </div>}
  </li>;
}

/** Filter der Fallliste: Stufe, Ort, Suche, erledigte ausblenden. */
interface CaseFilter { readonly kernOnly: boolean; readonly place: TestPlace | ''; readonly query: string; readonly hideDone: boolean }

function caseMatches(c: TestCase, f: CaseFilter, protocol: Protocol): boolean {
  if (f.kernOnly && c.level !== 'kern') return false;
  if (f.place && placeOf(c) !== f.place) return false;
  const r = protocol.entries[c.id]?.result;
  if (f.hideDone && (r === 'ok' || r === 'fehler')) return false;
  const q = f.query.trim().toLowerCase();
  if (!q) return true;
  return [c.id, ...(c.merged ?? []), c.title, ...packagesOf(c.id)].some(t => t.toLowerCase().includes(q));
}

function AreaSection({ area, protocol, cases, open, onToggle, onResult, onReport }: { area: TestArea; protocol: Protocol; cases: readonly TestCase[]; open: boolean; onToggle: () => void; onResult: (id: string, r: CaseResult | null, note?: string) => void; onReport: (id: string) => void }) {
  const s = summarize(protocol, area);
  return <section className={`tp-area${open ? ' open' : ''}`} aria-labelledby={`tp-${area.id}`} data-area={area.id} id={`tp-area-${area.id}`}>
    <div className="tp-area-head">
      <h2 id={`tp-${area.id}`}><button type="button" className="tp-area-toggle" aria-expanded={open} onClick={onToggle}><span className="tp-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span> {area.title}</button></h2>
      <span className="tp-area-sum" aria-label={`${s.done} von ${s.total} geprüft`}>{s.ok > 0 && <em className="tp-ok">{s.ok} ✓</em>}{s.fehler > 0 && <em className="tp-fehler">{s.fehler} ✕</em>}{s.offen > 0 && <em className="tp-offen">{s.offen} ?</em>}<span>{s.done}/{s.total}</span></span>
    </div>
    {open && <>
      <p className="muted">{area.intro}</p>
      {cases.length > 0
        ? <ol className="tp-cases">{cases.map(c => <CaseRow key={c.id} c={c} protocol={protocol} onResult={onResult} onReport={onReport} />)}</ol>
        : <p className="muted tp-empty">Kein Fall passt zum Filter.</p>}
    </>}
  </section>;
}

const VIEW_KEY = 'bauplaner.testphase.ansicht';
const PARTS: readonly { kind: TestArea['kind']; title: string; hint: string }[] = [
  { kind: 'planer', title: 'Teil 1 · Nur im Browser', hint: 'Planer am PC, iPad oder Handy – ohne Minecraft.' },
  { kind: 'mod', title: 'Teil 2 · Mit Minecraft', hint: 'Mod im Spiel, Verbindung zum Planer und zum Team-Raum.' },
  { kind: 'server', title: 'Teil 3 · Mit Paper-Server', hint: 'Freiwilliges Plugin auf einem echten Server.' },
];

function loadOpenAreas(): string[] {
  try { const v: unknown = JSON.parse(localStorage.getItem(VIEW_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; }
}

/** Testphase (QA-04): Checklisten je Bereich mit Protokoll im Browser und Fehlerbericht mit Diagnose. */
export function TestphaseView({ search }: { search?: string | undefined }) {
  useDocumentTitle('Testphase');
  const params = useMemo(() => new URLSearchParams(search ?? ''), [search]);
  const [protocol, setProtocol] = useState<Protocol>(loadProtocol);
  const [kernOnly, setKernOnly] = useState(false);
  const [place, setPlace] = useState<TestPlace | ''>('');
  const [query, setQuery] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const [howtoOpen] = useState(() => Object.keys(protocol.entries).length === 0);
  const [openAreas, setOpenAreas] = useState<string[]>(loadOpenAreas);
  const toggleArea = useCallback((id: string, force?: boolean) => setOpenAreas(list => {
    const next = (force ?? !list.includes(id)) ? [...new Set([...list, id])] : list.filter(x => x !== id);
    try { localStorage.setItem(VIEW_KEY, JSON.stringify(next)); } catch { /* nur im Speicher */ }
    return next;
  }), []);
  const [report, setReport] = useState<string | null>(() => params.has('melden') ? (params.get('melden') || params.get('fall') || '') : null);
  const [message, setMessage] = useState('');
  const manifest = useManifest();
  const env = useEnvironment(manifest);
  useEffect(() => { if (params.has('melden')) setReport(params.get('melden') || ''); }, [params]);

  const update = useCallback((next: Protocol) => { setProtocol(next); saveProtocol(next); }, []);
  const onResult = useCallback((id: string, r: CaseResult | null, note?: string) => setProtocol(p => { const next = setResult(p, id, r, note); saveProtocol(next); return next; }), []);
  const totals = TEST_AREAS.reduce((acc, a) => { const s = summarize(protocol, a); return { total: acc.total + s.total, done: acc.done + s.done, fehler: acc.fehler + s.fehler }; }, { total: 0, done: 0, fehler: 0 });
  const filter: CaseFilter = { kernOnly, place, query, hideDone };
  const filtering = query.trim() !== '';
  const shown = new Map(TEST_AREAS.map(a => [a.id, a.cases.filter(c => caseMatches(c, filter, protocol))] as const).filter(([, cs]) => cs.length > 0));
  const kern = TEST_AREAS.reduce((acc, a) => { const s = summarize(protocol, a, 'kern'); return { total: acc.total + s.total, done: acc.done + s.done }; }, { total: 0, done: 0 });

  const exportProtocol = async () => {
    const text = protocolMarkdown(protocol, env ?? []);
    setMessage(await copy(text) ? 'Testprotokoll kopiert.' : 'Kopieren nicht möglich; als Datei gespeichert.');
    if (!navigator.clipboard) download('testprotokoll.md', text, 'text/markdown');
  };

  return <div className="page tp-page">
    <div className="page-head"><div><span className="eyebrow">TESTPHASE</span><h1 className="page-title">Alles einmal durchspielen</h1>
      <p className="muted">Checklisten für Planer und Mod. Hake jeden Fall ab, notiere Auffälligkeiten und melde Fehler direkt mit Diagnose. Dein Fortschritt bleibt in diesem Browser; „Protokoll kopieren“ gibt ihn weiter.</p></div>
      <div className="tp-summary" role="status"><b>{totals.done}/{totals.total}</b> geprüft · Kern {kern.done}/{kern.total}{totals.fehler > 0 && <> · <span className="tp-fehler">{totals.fehler} Fehler</span></>}</div></div>

    <div className="tp-toolbar">
      <label>Dein Name<input value={protocol.tester} onChange={e => update({ ...protocol, tester: e.target.value })} placeholder="für das Protokoll" /></label>
      <label>Suchen<input aria-label="Suchen" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Fall-ID, auch frühere, oder Stichwort" /></label>
      <label>Ort<select aria-label="Ort" value={place} onChange={e => setPlace(e.target.value as TestPlace | '')}><option value="">Alle Orte</option>{PLACE_ORDER.map(p => <option key={p} value={p}>{PLACE_LABEL[p]}</option>)}</select></label>
      <label className="system-check"><input type="checkbox" checked={kernOnly} onChange={e => setKernOnly(e.target.checked)} /> Nur Kernfälle zeigen</label>
      <label className="system-check"><input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} /> Erledigte ausblenden</label>
      <div className="button-row">
        <button type="button" className="primary" onClick={() => setReport(r => r === null ? '' : r)}>Fehler melden</button>
        <button type="button" onClick={() => void exportProtocol()}>Protokoll kopieren</button>
        <button type="button" onClick={() => download('testprotokoll.md', protocolMarkdown(protocol, env ?? []), 'text/markdown')}>Protokoll als Datei</button>
        <button type="button" onClick={() => { if (confirm('Alle Haken und Notizen in diesem Browser löschen?')) update({ ...protocol, entries: {} }); }}>Zurücksetzen</button>
      </div>
    </div>
    {message && <p className="notice" role="status">{message}</p>}
    {report !== null && <ReportForm key={report} initialCase={report || undefined} env={env} tester={protocol.tester} onClose={() => setReport(null)} />}

    <details className="tp-howto" open={howtoOpen}>
      <summary><h2>So läuft die Testphase</h2></summary>
      <ol>
        <li>Die Fälle sind in drei Teile geordnet: <b>nur im Browser</b>, <b>mit Minecraft</b> und <b>mit Paper-Server</b>. Mit „Ort“ zeigst du nur, was du gerade testen kannst (z. B. am iPad nur den Browser-Teil).</li>
        <li>Mit den <b>Kernfällen</b> anfangen (Haken „Nur Kernfälle“), danach die vertieften Fälle der Bereiche, die dich interessieren. Einen Bereich über die Leiste unten öffnen; „Erledigte ausblenden“ zeigt nur, was noch fehlt.</li>
        <li>Je Fall: Schritte nachmachen, Ergebnis mit ✓ / ✕ / ? bewerten, bei ✕ eine Notiz und gleich <b>„Fehler melden“</b>: Der Bericht enthält automatisch Build, Browser und das Fehlerprotokoll.</li>
        <li>Im Spiel bei jedem Problem <code>/bauplaner diagnose</code> eingeben; die Mod legt den Bericht in die Zwischenablage und nach <code>bauplaner/diagnose/</code>. In den Fehlerbericht einfügen.</li>
        <li>Am Ende <b>„Protokoll kopieren“</b> und an Philipp schicken oder als Issue anhängen. Fehler landen als GitHub-Issues (<a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">Übersicht ↗</a>) und werden dort beantwortet.</li>
      </ol>
      <p className="muted">Hinweis: Die Seite sendet nichts von selbst. Ein Issue entsteht erst, wenn du es auf GitHub abschickst; ohne GitHub-Konto den Bericht kopieren und als Nachricht schicken.</p>
    </details>

    <nav className="tp-jump" aria-label="Bereiche der Testphase">
      {PARTS.map(part => <div key={part.kind} className="tp-jump-part"><span className={`tp-kind tp-kind-${part.kind}`}>{AREA_KIND_LABEL[part.kind]}</span>
        {TEST_AREAS.filter(a => a.kind === part.kind).map(a => { const sum = summarize(protocol, a); const n = shown.get(a.id)?.length ?? 0; return <button key={a.id} type="button" className={`tp-jump-area${sum.fehler ? ' has-fehler' : ''}${sum.done === sum.total ? ' done' : ''}`} disabled={n === 0} onClick={() => { toggleArea(a.id, true); requestAnimationFrame(() => document.getElementById(`tp-area-${a.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}>{a.title} <small>{sum.done}/{sum.total}</small></button>; })}
      </div>)}
      <div className="tp-jump-all"><button type="button" onClick={() => TEST_AREAS.forEach(a => toggleArea(a.id, true))}>Alle aufklappen</button><button type="button" onClick={() => TEST_AREAS.forEach(a => toggleArea(a.id, false))}>Alle zuklappen</button></div>
    </nav>

    {PARTS.map(part => { const areas = TEST_AREAS.filter(a => a.kind === part.kind && (shown.get(a.id)?.length ?? 0) > 0); return areas.length > 0 && <div key={part.kind} className="tp-part" data-part={part.kind}>
      <h2 className="tp-part-title">{part.title} <small className="muted">{part.hint}</small></h2>
      {areas.map(a => <AreaSection key={a.id} area={a} protocol={protocol} cases={shown.get(a.id) ?? []} open={filtering || openAreas.includes(a.id)} onToggle={() => toggleArea(a.id)} onResult={onResult} onReport={id => { setReport(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />)}
    </div>; })}
    {shown.size === 0 && <p className="notice">Kein Fall passt zum Filter.</p>}
  </div>;
}
