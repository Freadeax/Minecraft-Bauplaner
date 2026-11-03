import { MODEL_MAX_FILE_BYTES } from '../../../../packages/voxel/src/sizeLimits.js';

/**
 * Largest structure file the import accepts (SIZE-01, vorher 16 MB). Uncompressed Litematic files (as
 * some converters write them) are several times larger than GZip ones; the readers cap the parsed NBT
 * at 192 MB and the model at 4 million cells / 16.7 million cells box (packages/voxel/src/sizeLimits.ts).
 */
export const MAX_IMPORT_BYTES = MODEL_MAX_FILE_BYTES;
export const MAX_IMPORT_LABEL = `${MAX_IMPORT_BYTES / 1_000_000} MB`;
