import { writeExportFile } from '../../../../packages/application/src/revisionExport.js';
import type { FileWriter } from '../../../../packages/application/src/revisionExport.js';
import { runJob, workersAvailable } from './client';
import { transportInSlices } from './transport';

/** Export writer for the page (O-10): packs the file in a background worker; without workers in place. */
export const backgroundWriter: FileWriter = async request => {
  if (!workersAvailable()) return writeExportFile(request);
  const world = await transportInSlices(request.world);
  const { kinds, palette, xyz } = world.columns;
  return runJob('write', { ...request, world }, { transfer: [kinds.buffer as ArrayBuffer, palette.buffer as ArrayBuffer, xyz.buffer as ArrayBuffer] });
};
