import type { GuideStep } from './guide.js';
import type { SectionMember, SitePlan } from './site.js';

/** Shared membership rule of build sections (site.ts, sectionSnapshots.ts): one place, one rule. */
export const memberMatches = (m: SectionMember, step: Pick<GuideStep, 'instanceId' | 'layer'>): boolean =>
  m.instanceId === step.instanceId && step.layer >= (m.fromLayer ?? 0) && step.layer <= (m.toLayer ?? Infinity);

/** Section id a step belongs to (first match in build order), or null. */
export function sectionOfStep(site: Pick<SitePlan, 'sections'>, step: Pick<GuideStep, 'instanceId' | 'layer'>): string | null {
  return site.sections.find(s => s.members.some(m => memberMatches(m, step)))?.id ?? null;
}
