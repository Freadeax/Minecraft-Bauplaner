import type { JobContext } from './protocol';
import type { ImportJobInput, ImportJobOutput } from './importJob';
import type { VersionJobInput, VersionJobOutput } from './versionJob';
import type { MeshJobInput, MeshJobOutput } from './meshJob';
import type { ModelJobInput, ModelJobOutput } from './modelJob';
import type { DiffJobInput, DiffJobOutput } from './diffJob';
import type { UpdateJobInput, UpdateJobOutput } from './updateJob';
import type { LibraryJobInput, LibraryJobOutput } from './libraryJob';
import type { PackJobInput, PackJobOutput } from './packJob';
import type { WriteJobInput, WriteJobOutput } from './writeJob';

/** Every background job: input and output types, and the module that runs it inside the worker. */
export interface JobMap {
  import: { input: ImportJobInput; output: ImportJobOutput };
  version: { input: VersionJobInput; output: VersionJobOutput };
  mesh: { input: MeshJobInput; output: MeshJobOutput };
  model: { input: ModelJobInput; output: ModelJobOutput };
  diff: { input: DiffJobInput; output: DiffJobOutput };
  update: { input: UpdateJobInput; output: UpdateJobOutput };
  library: { input: LibraryJobInput; output: LibraryJobOutput };
  pack: { input: PackJobInput; output: PackJobOutput };
  write: { input: WriteJobInput; output: WriteJobOutput };
}
export type JobKind = keyof JobMap;
export type JobInput<K extends JobKind> = JobMap[K]['input'];
export type JobOutput<K extends JobKind> = JobMap[K]['output'];
export type JobHandler<K extends JobKind> = (input: JobInput<K>, ctx: JobContext) => Promise<JobOutput<K>>;

/** Loaded inside the worker only; each kind pulls its own modules. */
export const HANDLERS: { readonly [K in JobKind]: () => Promise<JobHandler<K>> } = {
  import: () => import('./importJob').then(m => m.importJob),
  version: () => import('./versionJob').then(m => m.versionJob),
  mesh: () => import('./meshJob').then(m => m.meshJob),
  model: () => import('./modelJob').then(m => m.modelJob),
  diff: () => import('./diffJob').then(m => m.diffJob),
  update: () => import('./updateJob').then(m => m.updateJob),
  library: () => import('./libraryJob').then(m => m.libraryJob),
  pack: () => import('./packJob').then(m => m.packJob),
  write: () => import('./writeJob').then(m => m.writeJob),
};
