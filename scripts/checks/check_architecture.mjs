import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const allowed = { voxel: [], domain: ['voxel'], formats: ['voxel'], application: ['voxel', 'domain', 'formats'] };
/** Includes type-only dependencies, re-exports and dynamic imports. */
export function importsOf(source, filename = 'module.ts') {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const result = [];
  function visit(node) {
    const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node) ? node.moduleSpecifier
      : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword ? node.arguments[0] : null;
    if (specifier && ts.isStringLiteralLike(specifier)) result.push(specifier.text);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return result;
}
export function checkImport(filename, specifier) {
  const parts = filename.replaceAll('\\', '/').split('/');
  const current = parts[1];
  if (!allowed[current]) return `Unbekanntes Paket: ${filename}`;
  if (!specifier.startsWith('.')) return `Externe Abhängigkeit im Kern: ${filename} → ${specifier}`;
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(filename), specifier));
  const to = target.split('/')[1];
  if (!target.startsWith('packages/') || !(to === current || allowed[current].includes(to))) return `Unerlaubte Abhängigkeit: ${filename} → ${target}`;
  return null;
}
export function checkArchitecture(root = process.cwd()) {
  const errors = [];
  function walk(dir) {
    for (const e of readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts')) for (const specifier of importsOf(readFileSync(path.join(root, p), 'utf8'), p)) {
        const error = checkImport(p, specifier); if (error) errors.push(error);
      }
    }
  }
  walk('packages');
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const errors = checkArchitecture();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Architekturgrenzen gültig: voxel ← domain/formats ← application; kein Browserframework im Kern.');
}
