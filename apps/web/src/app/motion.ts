import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/**
 * UI-04 · Bewegung der Oberfläche (LMNT-Auftritt).
 *
 * Alles hier ist Zugabe: Ohne dieses Modul (oder mit „Bewegung reduzieren“) steht jede Seite sofort
 * vollständig da. Die Regeln dazu stehen in docs/architecture/planer/UI.md, Abschnitt „LMNT-Auftritt“.
 *  - `data-reveal` an einem Element: blendet es ein, sobald es ins Bild kommt. Das Modul setzt dafür
 *    `data-revealed` (ein Attribut, das React bei späteren Renderläufen nicht wieder entfernt).
 *  - `html[data-motion=on]` schaltet das Verstecken vor dem Einblenden erst ein, wenn der Beobachter läuft.
 *  - `html[data-scrolled]` meldet der Kopfzeile, dass die Seite gescrollt ist.
 */
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Einmal in der App-Hülle: Scrollzustand der Kopfzeile und Einblenden beim Scrollen. */
export function useShellMotion(): void {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; root.toggleAttribute('data-scrolled', window.scrollY > 24); }); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    if (reduced() || typeof IntersectionObserver !== 'function' || typeof MutationObserver !== 'function') {
      return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
    }
    const seen = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.setAttribute('data-revealed', ''); seen.unobserve(entry.target); }
    }, { threshold: 0.06, rootMargin: '0px 0px -4% 0px' });
    const watch = (node: ParentNode) => { for (const el of node.querySelectorAll('[data-reveal]:not([data-revealed])')) seen.observe(el); };
    const added = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('[data-reveal]:not([data-revealed])')) seen.observe(node);
        watch(node);
      }
    });
    watch(document);
    added.observe(document.body, { childList: true, subtree: true });
    root.dataset.motion = 'on';
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); seen.disconnect(); added.disconnect(); delete root.dataset.motion; };
  }, []);
}

/** Kippt eine Bühne leicht zum Zeiger (Startseite); schreibt nur CSS-Variablen, kein Renderlauf. */
export function useTilt(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !matchMedia('(hover: hover)').matches) return;
    const move = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5, y = (event.clientY - box.top) / box.height - 0.5;
      el.style.setProperty('--tilt-x', `${(y * -8).toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${(x * 10).toFixed(2)}deg`);
      el.style.setProperty('--pointer-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--pointer-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    };
    const leave = () => { el.style.setProperty('--tilt-x', '0deg'); el.style.setProperty('--tilt-y', '0deg'); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [ref]);
}

/** Zählt eine Kennzahl einmal hoch, sobald sie bekannt ist; bei „Bewegung reduzieren“ steht sie sofort. */
export function useCountUp(target: number | null, ms = 900): number | null {
  const [value, setValue] = useState<number | null>(target);
  const from = useRef(0);
  useEffect(() => {
    if (target === null || reduced() || target === from.current) { setValue(target); if (target !== null) from.current = target; return; }
    const start = performance.now(), a = from.current, b = target;
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / ms), eased = 1 - (1 - t) ** 3;
      setValue(Math.round(a + (b - a) * eased));
      if (t < 1) frame = requestAnimationFrame(step); else from.current = b;
    });
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}
