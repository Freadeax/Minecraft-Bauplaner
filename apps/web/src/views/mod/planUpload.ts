import { ANCHOR_LABEL, LIVE_PLAN_EXPORT, suggestDataVersion } from '../../../../../packages/domain/src/index.js';
import type { AssetVersion, Project, ServerAnchor } from '../../../../../packages/domain/src/index.js';
import { prepareRevisionExport } from '../../../../../packages/application/src/index.js';
import { planToServer } from './serverClient';

/**
 * LINK-02 S04: the plan of a project onto the paired server straight from the planner (tab „Bauen“ and the
 * world map use the same path). The plugin takes the plan by signed control message (op `plan`), through the
 * mod on this computer or through the team room; no file copy, no command.
 *
 * The anchor comes from chooseServerAnchor (domain, team/serverControl.ts).
 */
export { ANCHOR_LABEL, chooseServerAnchor } from '../../../../../packages/domain/src/index.js';

/**
 * Exports the current revision (freezing one when the working state changed, like „Export“) and puts it on
 * the paired server with the chosen anchor. Returns the text for the user and the project when a revision
 * was frozen (the caller saves and reloads it).
 */
export async function uploadPlanToServer(project: Project, versions: ReadonlyMap<string, AssetVersion>, anchor: ServerAnchor): Promise<{ readonly text: string; readonly frozen: Project | null; readonly revision: number }> {
  const dv = suggestDataVersion(project, versions).dataVersion ?? 5023;
  const prepared = await prepareRevisionExport(project, versions, { ...LIVE_PLAN_EXPORT, dataVersion: dv });
  const out = prepared.output;
  const placement = anchor.origin && anchor.dimension ? { dimension: anchor.dimension, origin: anchor.origin } : undefined;
  const msg = await planToServer(out.fileName, out.bytes, placement);
  const where = placement ? ` Anker ${placement.origin.join(' ')} (${ANCHOR_LABEL[anchor.source]}).` : ' Ohne Anker: im Spiel auf den Block mit Projektkoordinate 0/0/0 schauen und /bp anker hier eingeben, oder den Plan auf der Weltkarte platzieren und erneut senden.';
  return { text: `${msg} Revision ${out.revision.number}.${where}`, frozen: prepared.created ? prepared.project : null, revision: out.revision.number };
}
