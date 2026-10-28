import { useEffect, useRef, useState } from 'react';
import type { VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { renderShot } from './iso';
import type { ShotOptions } from './iso';

/**
 * Lazily rendered preview image. Versions are immutable and content-addressed,
 * so a rendered image is cached for the session under its key (version id or
 * project revision) plus view, cut and size. Rendering waits until the card is
 * near the viewport and runs one image per idle slot, so a long grid never
 * blocks input. Callers that pass `colorOf` must put its meaning into cacheKey.
 */
const cache = new Map<string, string>();
const queue: (() => void)[] = [];
let running = false;

function pump(): void {
  if (running) return;
  const next = queue.shift();
  if (!next) return;
  running = true;
  const run = () => { try { next(); } finally { running = false; pump(); } };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 120 }); else setTimeout(run, 0);
}

/** Cached or freshly rendered image (synchronous; for downloads). */
export function shotUrl(cacheKey: string, payload: Pick<VoxelPayload, 'cells' | 'palette'>, width: number, height: number, options: ShotOptions = {}): string {
  const key = `${cacheKey}:${options.view ?? 'so'}:${options.cutY ?? ''}@${width}x${height}`;
  let url = cache.get(key);
  if (url === undefined) { url = renderShot(payload, width, height, options); cache.set(key, url); }
  return url;
}

export function Thumb({ cacheKey, payload, alt, width = 320, height = 220, className = 'thumb', view, cutY, colorOf, eager = false }: {
  cacheKey: string;
  payload: () => Pick<VoxelPayload, 'cells' | 'palette'> | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  view?: ShotOptions['view'];
  cutY?: number | undefined;
  colorOf?: ShotOptions['colorOf'];
  /** Render without waiting for visibility (gallery main image). */
  eager?: boolean;
}) {
  const key = `${cacheKey}:${view ?? 'so'}:${cutY ?? ''}@${width}x${height}`;
  const [src, setSrc] = useState(() => cache.get(key) ?? null);
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef({ payload, colorOf });
  latest.current = { payload, colorOf };
  useEffect(() => {
    const hit = cache.get(key);
    if (hit !== undefined) { setSrc(hit); return; }
    setSrc(null);
    let cancelled = false;
    const job = () => {
      if (cancelled) return;
      let url = '';
      try {
        const p = latest.current.payload();
        url = p ? renderShot(p, width, height, { ...(view && { view }), ...(cutY !== undefined && { cutY }), ...(latest.current.colorOf && { colorOf: latest.current.colorOf }) }) : '';
      } catch { url = ''; }
      cache.set(key, url);
      if (!cancelled) setSrc(url);
    };
    const el = ref.current;
    if (eager || !el || !('IntersectionObserver' in window)) { queue.unshift(job); pump(); return () => { cancelled = true; }; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); queue.push(job); pump(); }
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); };
  }, [key, width, height, view, cutY, eager]);
  return <div ref={ref} className={`${className}${src === null ? ' loading' : ''}`}>
    {src ? <img src={src} alt={alt} width={width} height={height} decoding="async" draggable={false} />
      : src === '' ? <span className="thumb-empty" aria-label={`${alt}: keine Vorschau`}>keine Vorschau</span> : null}
  </div>;
}
