import { lazy, useState } from 'react';
import type { ComponentProps, ComponentType } from 'react';

/**
 * Seiten erst bei Bedarf laden (PERF-05): jede große Seite ist ein eigener Baustein,
 * den der Browser erst holt, wenn sie geöffnet wird. Der Start lädt so nur Rahmen,
 * Projektzentrale und Speicher statt aller Seiten auf einmal.
 *
 * Nach einer Veröffentlichung gibt es die Bausteine des alten Stands nicht mehr: ein
 * noch offener Tab bekäme beim Öffnen einer Seite einen Ladefehler. Dann lädt die
 * Seite einmal neu (neuer Stand, gleiche Adresse); scheitert es auch danach, zeigt die
 * Fehlergrenze die Meldung wie bei jedem anderen Seitenfehler.
 */
const RELOAD_KEY = 'bauplaner.seiteNeuGeladen';

/** Loaders of all lazy pages, for loading them ahead in idle time. */
const loaders: (() => Promise<unknown>)[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any page component, its props stay checked at the call site
export function lazyPage<C extends ComponentType<any>>(load: () => Promise<C>): ComponentType<ComponentProps<C>> {
  let pending: Promise<C> | null = null, loaded: C | null = null;
  // One shared promise: the idle preload and the first visit use the same request; a failed one may be tried again.
  const once = () => (pending ??= load().then(c => (loaded = c), e => { pending = null; throw e; }));
  loaders.push(once);
  const Lazy = lazy(async () => {
    try {
      const component = await once();
      try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* storage blocked: nothing to reset */ }
      return { default: component };
    } catch (e) {
      let reloaded = true;
      try { reloaded = sessionStorage.getItem(RELOAD_KEY) === '1'; if (!reloaded) sessionStorage.setItem(RELOAD_KEY, '1'); } catch { /* without storage never reload in a loop */ }
      if (!reloaded) { location.reload(); return new Promise<never>(() => {}); }
      throw e;
    }
  });
  /**
   * A page already loaded renders directly, without suspending once more (that would
   * show the loading notice for a moment). The choice is fixed per mounted page, so a
   * page that started through `Lazy` is never remounted when its module arrives.
   */
  return function LazyPage(props: ComponentProps<C>) {
    const [Page] = useState<ComponentType<ComponentProps<C>>>(() => (loaded ?? Lazy) as ComponentType<ComponentProps<C>>);
    return <Page {...props} />;
  };
}

/**
 * Loads every page ahead, one after another in idle time, once the start is done:
 * the first visit of a page then shows it at once instead of a loading notice, while
 * the start itself still only waits for the shell. Failures are ignored here; the
 * visit itself loads again and handles errors.
 */
export function preloadPages(): void {
  const queue = [...loaders];
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200));
  const next = () => { const load = queue.shift(); if (load) void load().catch(() => {}).finally(() => idle(next)); };
  idle(next);
}
