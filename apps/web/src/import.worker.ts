import { createPayload, countBlocks } from '../../../packages/voxel/src/index.js';
self.onmessage = (event: MessageEvent<{jobId: number; text: string}>) => {
  const { jobId, text } = event.data;
  try {
    if (text.length > 2_000_000) throw new Error('Die JSON-Datei ist zu groß (maximal 2 MB).');
    const payload = createPayload(JSON.parse(text), { maxCells: 20_000, maxNbtNodes: 50_000, maxNbtDepth: 32, maxStringLength: 100_000 });
    if (payload.bounds.maxExclusive.some((n,i)=>n-payload.bounds.min[i]!>256)) throw new Error('Die Vorschau unterstützt höchstens 256 Blöcke pro Achse.');
    self.postMessage({ jobId, payload, counts: countBlocks(payload) });
  } catch(error) { self.postMessage({ jobId, error: error instanceof Error ? error.message : 'Datei konnte nicht gelesen werden.' }); }
};
