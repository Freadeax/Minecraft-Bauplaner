import { readWorldScan, FormatError } from '../../../packages/formats/src/index.js';
// Reads in-game recordings (B8) off the main thread; recordings can hold millions of cells.
self.onmessage = async (event: MessageEvent<{ buffer: ArrayBuffer }>) => {
  try {
    const scan = await readWorldScan(event.data.buffer);
    self.postMessage({ scan }, { transfer: [scan.data.buffer as ArrayBuffer] });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Aufnahme konnte nicht gelesen werden.', code: error instanceof FormatError ? error.code : 'SCAN' });
  }
};
