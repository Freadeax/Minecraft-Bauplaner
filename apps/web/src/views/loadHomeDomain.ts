// PERF-07: lädt die Fachfunktionen der Projektzentrale (homeDomain.ts) einmal nach.
export type HomeDomain = typeof import('./homeDomain');
let loading: Promise<HomeDomain> | null = null;
export const loadHomeDomain = (): Promise<HomeDomain> => {
  loading ??= import('./homeDomain').catch(e => { loading = null; throw e; });
  return loading;
};
