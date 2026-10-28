import { useEffect, useRef, useState } from 'react';
import type { VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { renderThumbnail } from './iso';

/**
 * Lazily rendered preview image. Versions are immutable and content-addressed,
 * so a rendered image is cached for the session under its key (version id or
 * project revision). Rendering waits until the card is near the viewport and
 * runs one image per idle slot, so a long grid never blocks input.
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

export function Thumb({ cacheKey, payload, alt, width = 320, height = 220, className = 'thumb' }: {
  cacheKey: string;
  payload: () => Pick<VoxelPayload, 'cells' | 'palette'> | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const key = `${cacheKey}@${width}x${height}`;
  const [src, setSrc] = useState(() => cache.get(key) ?? null);
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef(payload);
  latest.current = payload;
  useEffect(() => {
    const hit = cache.get(key);
    if (hit !== undefined) { setSrc(hit); return; }
    setSrc(null);
    let cancelled = false;
    const job = () => {
      if (cancelled) return;
      let url = '';
      try { const p = latest.current(); url = p ? renderThumbnail(p, width, height) : ''; } catch { url = ''; }
      cache.set(key, url);
      if (!cancelled) setSrc(url);
    };
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { queue.push(job); pump(); return () => { cancelled = true; }; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); queue.push(job); pump(); }
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); };
  }, [key, width, height]);
  return <div ref={ref} className={`${className}${src === null ? ' loading' : ''}`}>
    {src ? <img src={src} alt={alt} width={width} height={height} decoding="async" draggable={false} />
      : src === '' ? <span className="thumb-empty" aria-label={`${alt}: keine Vorschau`}>keine Vorschau</span> : null}
  </div>;
}
