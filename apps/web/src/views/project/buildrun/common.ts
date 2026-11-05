export { localDay } from '../../../app/ui';
export const dayLabel = (day: string): string => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

export type BuildView = 'steps' | 'days' | 'focus';
const VIEW_KEY = 'bauplaner.buildView';
export function storedView(): BuildView {
  try { const v = localStorage.getItem(VIEW_KEY); return v === 'days' || v === 'focus' ? v : 'steps'; } catch { return 'steps'; }
}
export function storeView(v: BuildView): void { try { localStorage.setItem(VIEW_KEY, v); } catch { /* private mode */ } }

export type PrintTarget = { readonly kind: 'day'; readonly index: number } | { readonly kind: 'rework' };

export const fileStem = (name: string): string => name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'Projekt';
