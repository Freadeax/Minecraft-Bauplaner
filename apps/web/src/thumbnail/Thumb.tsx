import { useEffect, useRef, useState } from 'react';
import type { VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { readyKit, useRenderKit } from '../blockmodels/assets';
import { STILL_LOOK } from '../blockmodels/graphics';
import type { RenderKit } from '../blockmodels/assets';
import { renderShot } from './iso';
import type { ShotOptions } from './iso';

/**
 * Lazily rendered preview image. Versions are immutable and content-addressed,
 * so a rendered image is cached for the session under its key (version id or
 * project revision) plus block look (own shapes or loaded textures), view, cut
 * and size. Rendering waits until the card is near the viewport and runs one
 * image per idle slot, so a long grid never blocks input. Callers that pass
 * `markOf` must put its meaning into cacheKey.
 *
 * Images come from the shared WebGL still renderer (real block shapes and
 * textures); without WebGL the plain 2D cube renderer stands in.
 */
const cache = new Map<string, string>();
const queue: (() => Promise<void>)[] = [];
let running = false;

type Gl = typeof import('./glShot');
let gl: Promise<Gl | null> | null = null;
function glModule(): Promise<Gl | null> {
  gl ??= (() => {
    try {
      const probe = document.createElement('canvas');
      if (!probe.getContext('webgl2') && !probe.getContext('webgl')) return Promise.resolve(null);
    } catch { return Promise.resolve(null); }
    return import('./glShot').catch(() => null);
  })();
  return gl;
}

function pump(): void {
  if (running) return;
  const next = queue.shift();
  if (!next) return;
  running = true;
  const run = () => { next().finally(() => { running = false; pump(); }); };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 120 }); else setTimeout(run, 0);
}

const keyOf = (cacheKey: string, kit: RenderKit, options: ShotOptions, width: number, height: number) =>
  `${cacheKey}:${kit.key}:${STILL_LOOK}:${options.view ?? 'so'}:${options.cutY ?? ''}@${width}x${height}`;

async function render(payload: Pick<VoxelPayload, 'cells' | 'palette' | 'entities'>, width: number, height: number, kit: RenderKit, options: ShotOptions): Promise<string> {
  const module = await glModule();
  if (module) {
    try { return module.renderGlShot(payload, width, height, kit, options); } catch { /* lost context etc.: plain image */ }
  }
  return renderShot(payload, width, height, options);
}

/** Cached or freshly rendered image (for downloads). */
export async function shotUrl(cacheKey: string, payload: Pick<VoxelPayload, 'cells' | 'palette' | 'entities'>, width: number, height: number, options: ShotOptions = {}): Promise<string> {
  const kit = await readyKit(), key = keyOf(cacheKey, kit, options, width, height);
  let url = cache.get(key);
  if (url === undefined) { url = await render(payload, width, height, kit, options); cache.set(key, url); }
  return url;
}

export function Thumb({ cacheKey, payload, alt, width = 320, height = 220, className = 'thumb', view, cutY, markOf, eager = false }: {
  cacheKey: string;
  payload: () => Pick<VoxelPayload, 'cells' | 'palette' | 'entities'> | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  view?: ShotOptions['view'];
  cutY?: number | undefined;
  markOf?: ShotOptions['markOf'];
  /** Render without waiting for visibility (gallery main image). */
  eager?: boolean;
}) {
  const kit = useRenderKit();
  const options: ShotOptions = { ...(view && { view }), ...(cutY !== undefined && { cutY }) };
  const key = keyOf(cacheKey, kit, options, width, height);
  const [src, setSrc] = useState(() => cache.get(key) ?? null);
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef({ payload, markOf });
  latest.current = { payload, markOf };
  useEffect(() => {
    const hit = cache.get(key);
    if (hit !== undefined) { setSrc(hit); return; }
    setSrc(null);
    let cancelled = false;
    const job = async () => {
      if (cancelled) return;
      let url = '';
      try {
        const p = latest.current.payload();
        url = p ? await render(p, width, height, kit, { ...options, ...(latest.current.markOf && { markOf: latest.current.markOf }) }) : '';
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
  }, [key, width, height, eager]);
  return <div ref={ref} className={`${className}${src === null ? ' loading' : ''}`}>
    {src ? <img src={src} alt={alt} width={width} height={height} decoding="async" draggable={false} />
      : src === '' ? <span className="thumb-empty" aria-label={`${alt}: keine Vorschau`}>keine Vorschau</span> : null}
  </div>;
}
