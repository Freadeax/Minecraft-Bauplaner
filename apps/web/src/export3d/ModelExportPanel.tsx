import { useMemo, useState } from 'react';
import type { BlockState, Cell } from '../../../../packages/voxel/src/index.js';
import { useRenderKit } from '../blockmodels/assets';
import { download, errorText, formatNumber } from '../app/ui';
import type { ExportResult, ModelFormat, ModelKind } from './build';
import './model3d.css';

/**
 * Panel „3D-Datei“ (MODEL-01): Bauteil, Projekt, Anlage oder geöffnete
 * Datei als OBJ/MTL, GLB, STL oder 3MF. Die Datei entsteht lokal im Browser
 * und wird heruntergeladen; nichts wird hochgeladen. Die Rechenmodule werden
 * erst beim Export geladen.
 */
const FORMATS: readonly { readonly id: ModelFormat; readonly label: string; readonly hint: string; readonly print: boolean }[] = [
  { id: 'glb', label: 'glTF-Binär (.glb)', hint: 'Eine Datei mit Texturen – Blender, Windows-3D-Viewer, Web, AR und Spiele-Engines.', print: false },
  { id: 'obj', label: 'OBJ + MTL (.zip)', hint: 'Klassisches Austauschformat – Blender, Cinema 4D, SketchUp, 3ds Max. ZIP mit Modell-, Material- und Texturdatei.', print: false },
  { id: 'stl', label: 'STL (.stl)', hint: 'Für jeden 3D-Drucker (Cura, PrusaSlicer, Bambu Studio). Nur die Form, ohne Farben.', print: true },
  { id: '3mf', label: '3MF (.3mf)', hint: 'Druckformat mit Farbe je Block – für Mehrfarbdruck (Bambu AMS, Prusa MMU) und Druckdienste.', print: true },
];
/** Dünner als das bricht beim Druck meist (FDM, 0,4-mm-Düse). */
const MIN_FEATURE_MM = 0.8;
const PRINT_GRID_LIMIT = 48_000_000;
const fmt = (v: number, d = 1) => v.toLocaleString('de-DE', { maximumFractionDigits: d });

export function ModelExportPanel({ cells, palette, name, source }: {
  cells: readonly Cell[];
  palette: readonly BlockState[];
  name: string;
  /** Herkunft für Dateikommentare, z. B. „Bauteil Fachwerkhaus, Version 3“. */
  source?: string;
}) {
  const kit = useRenderKit();
  const [format, setFormat] = useState<ModelFormat>('glb');
  const [kind, setKind] = useState<ModelKind>('view');
  const [metres, setMetres] = useState(1);
  const [mm, setMm] = useState(4);
  const [bake, setBake] = useState(true);
  const [place, setPlace] = useState<'center' | 'world'>('center');
  const [detail, setDetail] = useState<1 | 2 | 4>(2);
  const [smallParts, setSmallParts] = useState(true);
  const [fill, setFill] = useState(true);
  const [hollow, setHollow] = useState(false);
  const [wallMm, setWallMm] = useState(2);
  const [dropLoose, setDropLoose] = useState(false);
  const [maxColors, setMaxColors] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ExportResult | null>(null);

  const info = FORMATS.find(f => f.id === format)!;
  const asPrint = info.print || kind === 'print';
  const size = useMemo(() => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    let blocks = 0;
    for (const c of cells) if (c.kind === 'block') { blocks++; for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, c.position[i]!); hi[i] = Math.max(hi[i]!, c.position[i]!); } }
    return blocks ? { blocks, dims: [0, 1, 2].map(i => hi[i]! - lo[i]! + 1) as [number, number, number] } : { blocks: 0, dims: [0, 0, 0] as [number, number, number] };
  }, [cells]);
  const blockSize = info.print ? mm : metres;
  const unit = info.print ? 'mm' : 'm';
  const cellMm = mm / detail;
  const gridCells = size.dims.reduce((p, d) => p * (d * detail + 4), 1);
  const tooBig = asPrint && gridCells > PRINT_GRID_LIMIT;
  const longest = Math.max(...size.dims);
  const validSize = Number.isFinite(blockSize) && blockSize > 0 && blockSize <= 10_000;
  const wallCells = Math.max(1, Math.ceil(wallMm / cellMm));

  async function run() {
    setError(''); setBusy(true); setResult(null);
    // Let the button show "Erzeugt …" before the main thread is busy.
    await new Promise(r => setTimeout(r, 30));
    try {
      const [{ exportModel }, formats] = await Promise.all([import('./build'), import('../../../../packages/formats/src/index.js')]);
      const texturePng = kit.textured ? () => new Promise<Uint8Array | null>(resolve => kit.atlas.canvas.toBlob(b => {
        if (!b) { resolve(null); return; }
        void b.arrayBuffer().then(buf => resolve(new Uint8Array(buf)), () => resolve(null));
      }, 'image/png')) : undefined;
      const out = await exportModel(formats, {
        format, kind, name, cells, palette, blockSize, ...(source && { source }),
        view: { renderer: kit.renderer, sprites: kit.atlas.lookup, textured: kit.textured, place, bake, ...(texturePng && { texturePng }) },
        print: { detail, smallParts, fill, hollow: hollow ? wallCells : 0, minPart: dropLoose ? 8 * detail ** 3 : 0, maxColors: format === '3mf' ? maxColors : 0 },
      });
      download(out.file.name, out.file.bytes as Uint8Array<ArrayBuffer>, out.file.type);
      setResult(out);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  if (!size.blocks) return <section className="model3d" aria-label="3D-Datei"><p className="muted">Keine Blöcke – nichts zu exportieren.</p></section>;
  return <section className="model3d" aria-label="3D-Datei" data-format={format} data-kind={asPrint ? 'print' : 'view'}>
    <form className="model3d-form" onSubmit={e => { e.preventDefault(); void run(); }}>
      <div className="model3d-head">
        <span className="panel-kicker">3D-MODELL EXPORTIEREN</span>
        <p className="muted">{formatNumber(size.blocks)} Blöcke · {size.dims.join(' × ')} (B × H × T). Die Datei entsteht in deinem Browser; nichts wird hochgeladen.</p>
      </div>
      <fieldset className="model3d-formats">
        <legend>Format</legend>
        {FORMATS.map(f => <label key={f.id} className={`model3d-format${format === f.id ? ' active' : ''}`}>
          <input type="radio" name="model3d-format" value={f.id} checked={format === f.id} onChange={() => setFormat(f.id)} />
          <strong>{f.label}</strong><small>{f.hint}</small>
        </label>)}
      </fieldset>

      {!info.print && <fieldset className="model3d-group">
        <legend>Geometrie</legend>
        <label className="check"><input type="radio" name="model3d-kind" checked={kind === 'view'} onChange={() => setKind('view')} /> Ansichtsmodell – echte Blockformen wie im Betrachter, verdeckte Flächen weggelassen</label>
        <label className="check"><input type="radio" name="model3d-kind" checked={kind === 'print'} onChange={() => setKind('print')} /> Druckmodell – geschlossene Hülle mit Blockfarben (wie STL/3MF)</label>
      </fieldset>}

      <fieldset className="model3d-group">
        <legend>Maßstab</legend>
        {info.print
          ? <label>Millimeter je Block<input type="number" step="any" min={0.1} max={1000} value={mm} aria-label="Millimeter je Block" aria-invalid={!validSize} onChange={e => setMm(Number(e.target.value))} /></label>
          : <label>Meter je Block<input type="number" step="any" min={0.01} max={100} value={metres} aria-label="Meter je Block" aria-invalid={!validSize} onChange={e => setMetres(Number(e.target.value))} /></label>}
        <p className="muted model3d-size" data-size={size.dims.map(d => fmt(d * blockSize)).join('x')}>
          Ergibt {size.dims.map(d => fmt(d * blockSize)).join(' × ')} {unit} (B × H × T).
          {info.print && <> {[100, 150, 200].map(t => <button key={t} type="button" className="text-button" onClick={() => setMm(Math.round(t / longest * 100) / 100)}>auf {t} mm</button>)}</>}
        </p>
      </fieldset>

      {!asPrint && <fieldset className="model3d-group">
        <legend>Aussehen</legend>
        <p className="muted">{kit.textured ? '▦ Texturen aus deiner geladenen Quelle werden als PNG mitgeliefert (nur für deine eigene Nutzung).' : 'Durchschnittsfarben je Block. Für Texturen oben rechts über ▦ deine Minecraft-Version laden.'}</p>
        <label className="check"><input type="checkbox" checked={bake} onChange={e => setBake(e.target.checked)} /> Flächenhelligkeit und Eckschatten einbacken (Eckpunktfarben)</label>
        <label>Lage
          <select value={place} onChange={e => setPlace(e.target.value as 'center' | 'world')} aria-label="Lage">
            <option value="center">Mitte unten auf 0/0/0</option>
            <option value="world">Minecraft-Koordinaten</option>
          </select>
        </label>
      </fieldset>}

      {asPrint && <fieldset className="model3d-group">
        <legend>Druck</legend>
        <label>Feinheit
          <select value={detail} onChange={e => setDetail(Number(e.target.value) as 1 | 2 | 4)} aria-label="Feinheit">
            <option value={1}>1 – ganze Blöcke</option>
            <option value={2}>2 – Platten und Treppen</option>
            <option value={4}>4 – auch Zäune, Türen, Teppiche</option>
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={fill} onChange={e => setFill(e.target.checked)} /> Innenräume füllen (massiv, keine eingeschlossene Luft)</label>
        <label className="check"><input type="checkbox" checked={smallParts} onChange={e => setSmallParts(e.target.checked)} /> Kleinteile mitdrucken (Fackeln, Knöpfe, Teppiche – mindestens eine Gitterzelle stark)</label>
        <label className="check"><input type="checkbox" checked={hollow} onChange={e => setHollow(e.target.checked)} /> Aushöhlen (spart Material, für Harzdruck Ablaufloch selbst setzen)</label>
        {hollow && <label>Wandstärke in mm<input type="number" step="any" min={0.5} max={100} value={wallMm} aria-label="Wandstärke in mm" onChange={e => setWallMm(Number(e.target.value))} /></label>}
        {hollow && <p className="muted">= {wallCells} Gitterzelle{wallCells === 1 ? '' : 'n'} ({fmt(wallCells * cellMm, 2)} mm).</p>}
        <label className="check"><input type="checkbox" checked={dropLoose} onChange={e => setDropLoose(e.target.checked)} /> Kleine lose Teile entfernen (unter einem Block Volumen)</label>
        {format === '3mf' && <label>Farben
          <select value={maxColors} onChange={e => setMaxColors(Number(e.target.value))} aria-label="Farben">
            <option value={0}>alle Blockfarben</option>
            {[16, 8, 4, 2, 1].map(n => <option key={n} value={n}>höchstens {n} (ähnliche zusammenfassen)</option>)}
          </select>
        </label>}
        <p className="muted">Eine Gitterzelle = {fmt(cellMm, 2)} mm. Stellen, an denen sich Blöcke nur an einer Kante oder Ecke berühren, werden mit einer Zelle verbunden. Pflanzen, Schienen, Leitern und Flüssigkeiten haben keine Druckform.</p>
        {info.print && cellMm < MIN_FEATURE_MM && <p className="notice warning" role="status">Eine Gitterzelle ist nur {fmt(cellMm, 2)} mm. Teile dünner als etwa {fmt(MIN_FEATURE_MM)} mm brechen leicht – Maßstab erhöhen oder Feinheit verringern.</p>}
      </fieldset>}

      {!tooBig && (asPrint ? gridCells > 8_000_000 : size.blocks > 300_000) && <p className="muted" role="status">Großes Modell: der Export kann bis zu einer halben Minute dauern, die Seite reagiert in der Zeit nicht.</p>}
      {tooBig && <p className="notice warning" role="alert">Zu groß für den Druckexport: {formatNumber(gridCells)} Gitterzellen (höchstens {formatNumber(PRINT_GRID_LIMIT)}). Feinheit verringern.</p>}
      <div className="button-row">
        <button className="primary" type="submit" disabled={busy || tooBig || !validSize}>{busy ? 'Erzeugt …' : `⤓ ${info.label.split(' (')[0]} exportieren`}</button>
      </div>
    </form>
    {error && <div className="notice warning" role="alert"><strong>Export fehlgeschlagen.</strong><p>{error}</p></div>}
    {result && <ModelReport result={result} />}
  </section>;
}

function ModelReport({ result }: { result: ExportResult }) {
  const { stats, print } = result, u = result.unit === 'meter' ? 'm' : 'mm';
  const ext = [0, 1, 2].map(i => fmt(stats.max[i]! - stats.min[i]!, 2));
  const check = print?.check;
  return <section className="import-report model3d-report" aria-label="3D-Exportbericht" data-closed={check ? String(check.closed) : 'n/a'} data-triangles={stats.triangles}>
    <div><span className="eyebrow">DATEI ERZEUGT</span><h2>{result.file.name}</h2></div>
    <dl>
      <div><dt>Abmessungen</dt><dd>{ext.join(' × ')} {u} ({result.unit === 'millimeter' ? 'X × Y × Z, Z oben' : 'X × Y × Z, Y oben'})</dd></div>
      <div><dt>Dreiecke · Eckpunkte</dt><dd>{formatNumber(stats.triangles)} · {formatNumber(stats.vertices)}</dd></div>
      <div><dt>Materialien</dt><dd>{print ? `${print.colors} Farben` : `${result.materials}${result.textured ? ' mit Textur-PNG' : ' Farben'}`}</dd></div>
      <div><dt>Dateigröße</dt><dd>{formatNumber(result.file.bytes.byteLength)} Bytes</dd></div>
      {check && <div><dt>Druckprüfung</dt><dd className={check.closed ? 'ok' : 'bad'}>{check.closed ? '✓ wasserdicht und mannigfaltig' : `✗ ${check.boundaryEdges} offene Kanten, ${check.nonManifoldEdges + check.nonManifoldVertices} Berührstellen`} · Volumen {fmt(check.volume / (result.unit === 'millimeter' ? 1000 : 1), 2)} {result.unit === 'millimeter' ? 'cm³' : 'm³'}</dd></div>}
      {print && <div><dt>Teile</dt><dd>{print.parts === 1 ? 'ein zusammenhängendes Teil' : `${print.parts} lose Teile – beim Druck einzeln oder mit Stützen`}</dd></div>}
    </dl>
    {print && <ul>
      {print.skipped > 0 && <li>{formatNumber(print.skipped)} Blöcke ohne Druckform weggelassen (Pflanzen, Schienen, Flüssigkeiten und – wenn abgewählt – Kleinteile).</li>}
      {print.cellsFilled > 0 && <li>{formatNumber(print.cellsFilled)} Gitterzellen Innenraum gefüllt.</li>}
      {print.cellsHollowed > 0 && <li>{formatNumber(print.cellsHollowed)} Gitterzellen ausgehöhlt.</li>}
      {print.repairCells > 0 && <li>{formatNumber(print.repairCells)} Verbindungszellen an Kanten- und Eckberührungen ergänzt.</li>}
      {print.removedParts > 0 && <li>{print.removedParts} kleine lose Teile entfernt.</li>}
    </ul>}
  </section>;
}
