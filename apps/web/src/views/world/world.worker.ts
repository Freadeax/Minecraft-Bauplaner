import {
  RegionReader, collectWorldFiles, sampleWorld, sampleToPayload, surfaceMap, terrainColumns, writeSchemV3, FormatError, parseRegionFileName,
} from '../../../../../packages/formats/src/index.js';
import type { RegionSource, WorldFiles, ExcerptOptions } from '../../../../../packages/formats/src/index.js';
import { checkTerrain, isGroundId, SURFACE_SKIP_IDS, terrainBox } from '../../../../../packages/domain/src/index.js';
import type { WorldPlacement } from '../../../../../packages/domain/src/index.js';
import type { Bounds, NbtTag, VoxelPayload } from '../../../../../packages/voxel/src/index.js';
import type { RegionInfo, WorldRequest, WorldResponse } from './protocol';

/**
 * World-file worker (WORLD-IMPORT-01). Keeps the picked File objects and reads
 * only the byte ranges it needs (header, then single chunk records) with
 * File.slice, so even large region files never load as a whole.
 */
let files: WorldFiles = { regions: new Map() };
let signal = { aborted: false };

const source = (f: File): RegionSource => ({
  name: f.name, size: f.size,
  read: async (offset, length) => new Uint8Array(await f.slice(offset, Math.min(f.size, offset + length)).arrayBuffer()),
});
const post = (m: WorldResponse, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);
const str = (v: string): NbtTag => ({ type: 'string', value: v });
const ints = (v: readonly number[]): NbtTag => ({ type: 'intArray', value: [...v] });

async function open(list: readonly File[]): Promise<{ regions: RegionInfo[]; ignored: string[]; duplicates: string[] }> {
  const picked = collectWorldFiles(list.map(source));
  files = picked.files;
  const regions: RegionInfo[] = [];
  for (const [, src] of picked.files.regions) {
    const name = parseRegionFileName(src.name)!;
    try {
      const r = await RegionReader.open(src, name);
      let newest = 0;
      for (const e of r.entries.values()) newest = Math.max(newest, e.timestamp);
      regions.push({ name: src.name, rx: name.rx, rz: name.rz, size: src.size, chunks: r.entries.size, newest });
    } catch (e) {
      regions.push({ name: src.name, rx: name.rx, rz: name.rz, size: src.size, chunks: 0, newest: 0, error: e instanceof Error ? e.message : String(e) });
    }
  }
  regions.sort((a, b) => a.rz - b.rz || a.rx - b.rx);
  return { regions, ignored: picked.ignored, duplicates: picked.duplicates };
}

self.onmessage = async (event: MessageEvent<WorldRequest>) => {
  const req = event.data;
  if (req.kind === 'abort') { signal.aborted = true; return; }
  signal = { aborted: false };
  const progress = (done: number, total: number) => post({ id: req.id, kind: 'progress', done, total });
  try {
    if (req.kind === 'open') { post({ id: req.id, kind: 'opened', ...await open(req.files) }); return; }
    if (req.kind === 'surface') {
      const m = await surfaceMap(files, req.min, req.max, { onProgress: progress, signal, includeIncomplete: req.includeIncomplete, ...(req.maxY !== undefined && { maxY: req.maxY }) });
      post({ id: req.id, kind: 'surface', map: m }, [m.heights.buffer, m.blocks.buffer]);
      return;
    }
    if (req.kind === 'excerpt') {
      const sample = await sampleWorld(files, req.box, { onProgress: progress, signal, includeIncomplete: req.includeIncomplete });
      const options: ExcerptOptions = { air: req.air, trim: req.trim, ...(req.exclude.length && { exclude: new Set(req.exclude) }) };
      const { payload, report } = sampleToPayload(sample, options);
      // The stored original is an exact Sponge Schem v3 of the excerpt with its world provenance.
      const regions = [...new Set(sample.chunks.filter(c => c.state === 'ok').map(c => `r.${Math.floor(c.cx / 32)}.${Math.floor(c.cz / 32)}.mca`))].sort();
      const newest = Math.max(0, ...sample.chunks.map(c => c.timestamp ?? 0));
      const schem = await writeSchemV3(payload, {
        dataVersion: Math.max(1, report.dataVersion), anchor: 'min-corner', unselected: req.air === 'explicit' ? 'air' : 'structure_void',
        metadata: { name: req.name || 'Weltausschnitt', date: Date.now(), extra: { Bauplaner: { type: 'compound', value: {
          Kind: str('world-excerpt'), ExcerptVersion: { type: 'int', value: 1 }, Dimension: str(req.dimension),
          WorldMin: ints(report.origin), BoxMin: ints(req.box.min), BoxMaxExclusive: ints(req.box.maxExclusive),
          Regions: { type: 'list', elementType: 'string', value: regions.map(str) }, NewestChunkSave: { type: 'long', value: String(newest) },
        } } } },
      });
      const counts = { ok: 0, other: 0 };
      for (const c of sample.chunks) if (c.state === 'ok') counts.ok++; else counts.other++;
      post({ id: req.id, kind: 'excerpt', payload, report, chunks: sample.chunks, regions, original: schem.bytes, originalSha256: schem.sha256 }, [schem.bytes.buffer]);
      return;
    }
    if (req.kind === 'terrain') {
      const box: Bounds = terrainBox(req.planned.bounds, req.placement.origin, req.depth);
      const sample = await sampleWorld(files, box, { onProgress: progress, signal, includeIncomplete: req.includeIncomplete });
      const check = checkTerrain(req.planned as VoxelPayload, req.placement as WorldPlacement, sample, { depth: req.depth });
      post({ id: req.id, kind: 'terrain', check, chunks: sample.chunks, warnings: sample.warnings, box });
      return;
    }
    if (req.kind === 'survey') {
      const columns = await terrainColumns(files, req.area, { onProgress: progress, signal, includeIncomplete: req.includeIncomplete, isGround: isGroundId, skip: SURFACE_SKIP_IDS, ...(req.maxY !== undefined && { maxY: req.maxY }) });
      const read = columns.chunks.filter(c => c.state === 'ok' || c.state === 'incomplete');
      const regions = [...new Set(read.map(c => `r.${Math.floor(c.cx / 32)}.${Math.floor(c.cz / 32)}.mca`))].sort();
      const newest = Math.max(0, ...read.map(c => c.timestamp ?? 0));
      post({ id: req.id, kind: 'survey', columns, regions, newest }, [columns.surface.buffer, columns.surfaceBlock.buffer, columns.ground.buffer, columns.groundBlock.buffer]);
      return;
    }
  } catch (e) {
    post({ id: req.id, kind: 'error', message: e instanceof Error ? e.message : String(e), code: e instanceof FormatError ? e.code : 'WORLD' });
  }
};
