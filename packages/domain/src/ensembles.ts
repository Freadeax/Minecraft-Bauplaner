import { transformPayload } from '../../voxel/src/transforms.js';
import type { Transform } from '../../voxel/src/types.js';
import { applyOperation, createProject, newInstance } from './project.js';
import { SAMPLE_PROFILE } from './samples.js';
import type { Asset, AssetVersion, Project } from './types.js';

/**
 * Ensembles (B9 Ausbau): shipped buildings arranged as a ready layout – a
 * village, a farm, a castle. An ensemble only references assets; "Als Projekt
 * anlegen" turns it into a normal project with one instance per member, so
 * conflicts, materials, guide and export work unchanged.
 */
export interface EnsembleMember {
  readonly assetId: string;
  /** x/z of the member's minimum corner after rotation; y = 0 unless given. */
  readonly at: readonly [number, number];
  readonly y?: number;
  readonly turns?: 0 | 1 | 2 | 3;
}
export interface Ensemble {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly members: readonly EnsembleMember[];
}

const m = (assetId: string, x: number, z: number, turns: 0 | 1 | 2 | 3 = 0): EnsembleMember => ({ assetId: `bld_${assetId}`, at: [x, z], ...(turns && { turns }) });

export const ENSEMBLES: readonly Ensemble[] = [
  { id: 'ens_startbasis', name: 'Starter-Basis', tags: ['erste-woche', 'überleben'],
    description: 'Alles für die erste Woche: Starterhaus, Weizenfeld, Hühnerfarm, Baumfarm, Lagerfeuer und Wegweiser.',
    members: [m('starterhaus_oak', 0, 0), m('acker_weizen', 9, 0), m('huehnerfarm', 22, 0), m('baumfarm', 9, 13), m('lagerfeuer', 0, 9), m('wegweiser', 2, 18)] },
  { id: 'ens_marktdorf', name: 'Marktdorf', tags: ['dorf', 'handel', 'mittelalter'],
    description: 'Dorf um einen Brunnenplatz: Taverne, Rathaus und Lager im Norden, Werkstätten im Westen, Marktbuden im Osten, Felder und Windmühle im Süden.',
    members: [m('taverne', 0, 0, 2), m('rathaus', 14, 0, 2), m('lagerhaus', 30, 0, 2), m('dorfplatz', 14, 14),
      m('werkstatt_bauer', 0, 14), m('werkstatt_bibliothekar', 0, 23), m('werkstatt_werkzeugschmied', 30, 23),
      m('marktbude_red', 30, 14), m('marktbude_blue', 30, 19), m('marktbude_green', 36, 14), m('marktbude_yellow', 36, 19),
      m('acker_weizen', 14, 31), m('acker_karotten', 26, 31), m('windmuehle', 0, 33)] },
  { id: 'ens_bauernhof', name: 'Bauernhof', tags: ['landwirtschaft', 'tiere'],
    description: 'Hof mit Bauernhaus, Scheune, Weide und Bienenhaus, davor vier Äcker und eine Windmühle.',
    members: [m('bauernhaus', 0, 0), m('scheune', 13, 0), m('tierweide', 26, 0), m('bienenhaus', 41, 0),
      m('acker_weizen', 0, 15), m('acker_karotten', 12, 15), m('acker_kartoffeln', 24, 15), m('acker_rote_bete', 36, 15), m('windmuehle', 49, 15)] },
  { id: 'ens_burg', name: 'Burg', tags: ['befestigung', 'mittelalter'],
    description: 'Burghof hinter einem Torhaus: Bergfried, zwei Rundtürme, Kapelle, Schmiede und Brunnen.',
    members: [m('torhaus', 9, 0), m('rundturm', 0, 9), m('rundturm', 22, 9), m('bergfried', 11, 22), m('kapelle', 0, 20), m('schmiede', 22, 20), m('dorfbrunnen', 13, 12)] },
  { id: 'ens_japangarten', name: 'Kirschblütengarten', tags: ['fernöstlich', 'garten', 'kirschhain'],
    description: 'Japanisches Haus mit Zen-Garten, Torii, Schrein, Teich, Pavillon und Kirschbäumen.',
    members: [m('japanhaus', 0, 0), m('zengarten', 13, 0), m('schrein', 28, 0), m('baum_cherry', 0, 12), m('torii', 14, 14), m('teich', 28, 9), m('pavillon', 14, 19), m('baum_cherry', 26, 20)] },
  { id: 'ens_kuestendorf', name: 'Küstendorf', tags: ['küste', 'hafen', 'fischen'],
    description: 'Hafen mit Leuchtturm, Fischerhütte, Steg, Strandhaus, Hafenkran und Segelschiff.',
    members: [m('leuchtturm', 0, 0), m('fischerhuette', 9, 0), m('hafensteg', 18, 0), m('strandhaus', 24, 0), m('hafenkran', 9, 11), m('segelschiff', 0, 18)] },
  { id: 'ens_technikhof', name: 'Technikhof', tags: ['redstone', 'farmen', 'automatisch'],
    description: 'Drei Schmelzmodule und zwei Sortierer in Reihe, Lampenreihe, Taktgeber, Wasseraufzug, Eisenfarm und eine Zuckerrohr-Strecke aus zwei Modulen.',
    members: [m('schmelz_modul', 0, 0), m('schmelz_modul', 3, 0), m('schmelz_modul', 6, 0), m('sortier_modul', 10, 0), m('sortier_modul', 15, 0), m('taktgeber', 21, 0),
      m('lampenreihe', 0, 7), m('wasseraufzug', 12, 7), m('eisenfarm', 0, 12), m('zuckerrohr_modul', 11, 13), m('zuckerrohr_modul', 21, 13)] },
  { id: 'ens_wuestenposten', name: 'Wüstenaußenposten', tags: ['wüste', 'fort'],
    description: 'Wüstenfort mit Obelisk, Lehm- und Wüstenhaus, Rundhütte und Kaktusfarm.',
    members: [m('wuestenfort', 0, 0), m('obelisk', 17, 0), m('lehmhaus', 17, 9), m('kaktusfarm', 27, 0), m('wuestenhaus', 27, 9), m('rundhuette', 0, 17)] },
  { id: 'ens_wegenetz', name: 'Weg mit Brücke', tags: ['wege', 'baukasten', 'anschlüsse'],
    description: 'Vorführung des Wege-Baukastens: Gerade, Kreuzung, Gerade, Holzbrücke und Wendeplatz greifen über ihre Anschlüsse ineinander.',
    members: [m('weg_gerade', 0, 0), m('weg_kreuzung', 8, 0), m('weg_gerade', 14, 0), m('holzbruecke', 22, 0), m('weg_wendeplatz', 36, 0)] },
];

/** Transform that puts the rotated member's minimum corner at `at`. */
export function memberTransform(member: EnsembleMember, version: Pick<AssetVersion, 'payload'>): Transform {
  const quarterTurns = member.turns ?? 0, y = member.y ?? 0;
  const probe = transformPayload(version.payload, { position: [0, 0, 0], quarterTurns, mirrorX: false }).payload.bounds.min;
  return { position: [member.at[0] - probe[0], y - probe[1], member.at[1] - probe[2]], quarterTurns, mirrorX: false };
}

/** Latest version per asset id, for ensemble resolution. */
export function latestVersions(assets: readonly Asset[], versions: ReadonlyMap<string, AssetVersion>): Map<string, AssetVersion> {
  const out = new Map<string, AssetVersion>();
  for (const a of assets) { const v = versions.get(a.versionIds.at(-1) ?? ''); if (v) out.set(a.id, v); }
  return out;
}

/** Asset ids an ensemble needs that are not available (never a half project). */
export function missingMembers(ensemble: Ensemble, byAsset: ReadonlyMap<string, AssetVersion>): string[] {
  return [...new Set(ensemble.members.map(mb => mb.assetId).filter(id => !byAsset.has(id)))];
}

/** New project with one instance per member. Throws when a member is missing. */
export function createEnsembleProject(ensemble: Ensemble, byAsset: ReadonlyMap<string, AssetVersion>, names: ReadonlyMap<string, string> = new Map()): Project {
  const missing = missingMembers(ensemble, byAsset);
  if (missing.length) throw new Error(`Ensemble ${ensemble.name}: Bauteile fehlen (${missing.join(', ')})`);
  let project = createProject({ name: ensemble.name, description: ensemble.description, profileId: SAMPLE_PROFILE });
  const counts = new Map<string, number>();
  for (const member of ensemble.members) {
    const version = byAsset.get(member.assetId)!;
    const n = (counts.get(member.assetId) ?? 0) + 1; counts.set(member.assetId, n);
    const base = names.get(member.assetId) ?? member.assetId;
    const instance = newInstance({ assetVersionId: version.id, name: n > 1 ? `${base} ${n}` : base, transform: memberTransform(member, version) });
    project = applyOperation(project, { kind: 'instance.add', instance }).project;
  }
  return project;
}

/** Ensembles that use a building (for the building sheet). */
export function ensemblesWith(assetId: string): Ensemble[] {
  return ENSEMBLES.filter(e => e.members.some(mb => mb.assetId === assetId));
}
