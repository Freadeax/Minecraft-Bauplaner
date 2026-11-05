import { rmSync } from 'node:fs';
// Only generated output. A separate pre-build process prevents stale artifacts
// from an earlier build remaining in the publication directory.
rmSync(new URL('../dist-web/',import.meta.url),{recursive:true,force:true});
