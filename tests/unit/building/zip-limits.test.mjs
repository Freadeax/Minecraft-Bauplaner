// P1 Härtung (07.11.2026): ZIP and GZIP imports count the bytes really read and inflated, share one budget across
// archives, stop at once on abort and keep only textures whose PNG header names a sane size.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { readZip, ZipBudget, ZipError } from '../../../apps/web/src/blockmodels/zip.ts';
import { extractArchive, loadFromFiles, pngSize, textureOk } from '../../../apps/web/src/blockmodels/pack.ts';
import { gunzipCapped, decodeReportCode } from '../../../dist/domain/src/index.js';
import { makeZip, miniPackFiles, miniPackZip, png } from '../../helpers/minipack.mjs';

const LIMITS = { maxArchiveBytes: 10e6, maxExtractedBytes: 1024, maxEntryBytes: 1e6, maxEntries: 10 };
/** Overwrites the uncompressed size of the only entry in local header and central directory. */
function lie(zip, size) {
  const b = Buffer.from(zip), dir = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  b.writeUInt32LE(size, 22); b.writeUInt32LE(size, dir + 24);
  return new Uint8Array(b);
}

test('stored entry: 128 KiB with a directory claiming 10 bytes is refused (reproduced finding)', async () => {
  const zip = lie(makeZip([['big.bin', new Uint8Array(128 * 1024)]], { deflate: false }), 10);
  await assert.rejects(readZip(zip, () => true, LIMITS), /falsche Länge/);
});

test('deflated entry: inflating stops as soon as more comes than declared or the budget allows', async () => {
  const bomb = makeZip([['bomb.bin', new Uint8Array(4 * 1024 * 1024)]]);
  await assert.rejects(readZip(lie(bomb, 100), () => true, LIMITS), /größer als im ZIP-Verzeichnis/);
  // Honest directory, but over the budget: refused before inflating.
  await assert.rejects(readZip(bomb, () => true, { ...LIMITS, maxEntryBytes: 10e6 }), ZipError);
  // Declared size within the budget while the budget is shared and already used up.
  const budget = new ZipBudget(1000);
  await readZip(makeZip([['a', new Uint8Array(600)]]), () => true, LIMITS, undefined, { budget });
  await assert.rejects(readZip(makeZip([['b', new Uint8Array(600)]]), () => true, LIMITS, undefined, { budget }), ZipError);
});

test('several archives of one import share one budget', async () => {
  const one = miniPackZip();
  const files = new Map();
  await extractArchive(one, files);
  let size = 0; for (const v of files.values()) size += v.length;
  const budget = new ZipBudget(size + 10);
  await extractArchive(one, new Map(), undefined, { budget });
  await assert.rejects(extractArchive(one, new Map(), undefined, { budget }), /Speicherbudget/);
  // loadFromFiles counts the source already held as well.
  const file = new File([one], 'pack.zip');
  await assert.rejects(loadFromFiles([file], new Map(), undefined, undefined, 120_000_000), ZipError);
  assert.ok((await loadFromFiles([file])).files.size > 0);
});

test('abort ends the extraction', async () => {
  const ctrl = new AbortController(); ctrl.abort();
  await assert.rejects(readZip(miniPackZip(), () => true, undefined, undefined, { signal: ctrl.signal }), e => e.name === 'AbortError');
});

test('textures: only PNGs with a sane header size are kept', async () => {
  const ok = png([1, 2, 3]);
  assert.deepEqual(pngSize(ok), { width: 16, height: 16 });
  assert.ok(textureOk(ok));
  const huge = Buffer.from(ok); huge.writeUInt32BE(100_000, 16); huge.writeUInt32BE(100_000, 20);
  assert.equal(textureOk(huge), false);
  assert.equal(textureOk(new Uint8Array(40)), false);
  const entries = miniPackFiles().map(([n, c]) => n.endsWith('stone.png') ? [n, huge] : [n, c]);
  const files = new Map();
  await extractArchive(makeZip(entries), files);
  assert.ok(![...files.keys()].some(k => k.endsWith('textures/block/stone.png')));
  assert.ok([...files.keys()].some(k => k.endsWith('.png')));
});

test('gzip: the inflated size is capped while reading (team plan, report code)', async () => {
  const raw = new Uint8Array(3_000_000);
  assert.equal((await gunzipCapped(gzipSync(raw), 3_000_000)).length, 3_000_000);
  await assert.rejects(gunzipCapped(gzipSync(raw), 1_000_000), /größer als 1 MB/);
  // A report code that unfolds into more than 1 MB is refused without parsing.
  const data = gzipSync(Buffer.from(`{"t":"team_abcdefgh","e":[],"x":"${'a'.repeat(2_000_000)}"}`)).toString('base64url');
  const { createHash } = await import('node:crypto');
  const check = createHash('sha256').update(data).digest('hex').slice(0, 8);
  await assert.rejects(decodeReportCode(`BPT1:abcdefgh:${data}:${check}`), /zu groß/);
});
