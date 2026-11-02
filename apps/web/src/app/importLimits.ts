/**
 * Largest structure file the import accepts. Uncompressed Litematic files (as
 * some converters write them) are several times larger than GZip ones; the
 * reader additionally caps compressed input at 4 MB and the parsed NBT at 32 MB.
 */
export const MAX_IMPORT_BYTES = 16_000_000;
export const MAX_IMPORT_LABEL = `${MAX_IMPORT_BYTES / 1_000_000} MB`;
