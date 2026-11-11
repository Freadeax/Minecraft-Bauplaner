// PERF-07 O-9: resolves imports from the package barrels (packages/<pkg>/src/index.ts) to the modules that
// declare each name. The bundler splits code by module: a page that imports one function through the barrel
// otherwise depends on every module behind it, so code that only later pages use landed in the start bundle.
// Build only (Vite plugin); the sources keep their barrel imports.
import path from 'node:path';
import ts from '@typescript/typescript6';

/** name → absolute file that declares it, for each barrel (TypeScript resolves re-export chains). */
export function barrelMaps(root, barrels) {
  const program = ts.createProgram(barrels, { allowJs: false, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, moduleResolution: ts.ModuleResolutionKind.Bundler, noEmit: true, skipLibCheck: true });
  const checker = program.getTypeChecker();
  const maps = new Map();
  for (const barrel of barrels) {
    const source = program.getSourceFile(barrel);
    const symbol = source && checker.getSymbolAtLocation(source);
    if (!symbol) continue;
    const map = new Map();
    for (const exp of checker.getExportsOfModule(symbol)) {
      let target = exp;
      while (target.flags & ts.SymbolFlags.Alias) target = checker.getAliasedSymbol(target);
      const decl = target.declarations?.find(d => !ts.isExportSpecifier(d));
      if (!decl) continue;
      // Values only: types are erased before this plugin runs.
      if (!(target.flags & (ts.SymbolFlags.Value))) continue;
      const file = path.resolve(decl.getSourceFile().fileName);
      // Declared names only (not `export default`, not namespaces of `export * as`).
      if (exp.escapedName === 'default' || ts.isSourceFile(decl)) continue;
      map.set(String(exp.escapedName), { file, name: String(target.escapedName) });
    }
    maps.set(path.resolve(barrel), map);
  }
  return maps;
}

const IMPORT = /\b(import|export)\s*\{([^}]*)\}\s*from\s*(['"])([^'"]+)\3;?/g;

/** Rewrites barrel imports of one module; returns null when nothing changed. */
export function rewriteBarrelImports(code, id, maps) {
  let changed = false;
  const out = code.replace(IMPORT, (whole, kind, list, _q, spec) => {
    if (!spec.startsWith('.')) return whole;
    const resolved = path.resolve(path.dirname(id), spec.replace(/\.js$/, '.ts'));
    const map = maps.get(resolved);
    if (!map) return whole;
    const groups = new Map();
    for (const raw of list.split(',').map(s => s.trim()).filter(Boolean)) {
      const m = /^(?:type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?$/.exec(raw);
      if (!m || raw.startsWith('type ')) return whole;
      const hit = map.get(m[1]);
      if (!hit) return whole; // unknown name: leave the statement as it is
      const local = m[2] ?? m[1];
      const item = hit.name === local ? local : `${hit.name} as ${local}`;
      groups.set(hit.file, [...(groups.get(hit.file) ?? []), item]);
    }
    changed = true;
    return [...groups].map(([file, items]) => {
      let rel = path.relative(path.dirname(id), file).replace(/\\/g, '/').replace(/\.tsx?$/, '.js');
      if (!rel.startsWith('.')) rel = `./${rel}`;
      return `${kind} { ${items.join(', ')} } from '${rel}';`;
    }).join('\n');
  });
  return changed ? out : null;
}

export function barrelImportsPlugin(root) {
  let maps = null;
  const barrels = ['application', 'domain', 'formats', 'voxel'].map(p => path.join(root, 'packages', p, 'src', 'index.ts'));
  return {
    name: 'bauplaner-barrel-imports',
    apply: 'build',
    buildStart() { maps = barrelMaps(root, barrels); },
    transform(code, id) {
      if (!/\.(tsx?|mjs|js)$/.test(id.split('?')[0]) || id.includes('node_modules')) return null;
      const out = rewriteBarrelImports(code, id.split('?')[0], maps);
      return out === null ? null : { code: out, map: null };
    },
  };
}
