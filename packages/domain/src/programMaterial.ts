import type { PaceSetting } from './buildRun.js';
import { analyzeProduction } from './productionPlan.js';
import type { ProductionReport } from './productionPlan.js';
import { planProgram, programOf } from './program.js';
import type { ProgramPlan } from './program.js';
import type { SiteOverview, SitePlan } from './site.js';

/**
 * Planung ↔ Produktion (PROJ-02). The schedule of the build program can wait
 * for material: a section starts only when the material readiness of the
 * Produktion analysis (farms, measured rates, gathering time per play day) says
 * its items are there. Readiness does not depend on the schedule (it is counted
 * in build order from today), so there is no loop: readiness first, then the
 * schedule, then the comparison of readiness with that schedule.
 */
export interface MaterialSchedule {
  readonly plan: ProgramPlan;
  /** Readiness without schedule; null when the program does not wait for material. */
  readonly readiness: ProductionReport | null;
}

/** Section id → play days until its material is there (null = items without rate). */
export function materialDaysOf(report: Pick<ProductionReport, 'sections'>): Map<string, number | null> {
  return new Map(report.sections.filter(s => !s.complete).map(s => [s.id, s.readyDay]));
}

/** The program schedule, waiting for material when the program says so. Same arguments as planProgram. */
export function planProgramWithMaterial(site: SitePlan, overview: SiteOverview, pace: PaceSetting, today?: string): MaterialSchedule {
  if (!programOf(site).waitForMaterial) return { plan: planProgram(site, overview, pace, today), readiness: null };
  const readiness = analyzeProduction({ site, overview, pace });
  return { plan: planProgram(site, overview, pace, today, { materialDays: materialDaysOf(readiness) }), readiness };
}
