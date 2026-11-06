import { iconPath } from '../../app/icons';
import type { IconName } from '../../app/icons';
import type { GuideScene } from './guideSteps';

/** Linke obere Ecke des Symbols (24er-Raster × 1,35) je Szene: Mitte der Karte bzw. des Himmels. */
const ICON_AT: Readonly<Record<GuideScene, readonly [number, number]>> = { planer: [82, 41], spiel: [64, 9], launcher: [82, 44] };

/**
 * GUIDE-01: kleine Grafik je Schritt. Drei Szenen (Planer-Fenster, Spielwelt, Launcher) zeigen sofort, WO
 * der Schritt passiert; das Symbol in der Mitte, WAS passiert; eine Tastenkappe, welche Taste. Alles zeichnet
 * mit Theme-Farben (currentColor, --mint, --panel …), damit hell und dunkel gleich gut aussehen.
 */
export function GuideArt({ scene, icon, keyCap, step }: { scene: GuideScene; icon: IconName; keyCap?: string | undefined; step?: number }) {
  const label = scene === 'spiel' ? 'im Spiel' : scene === 'launcher' ? 'im Launcher' : 'im Planer';
  const capW = keyCap ? Math.max(22, keyCap.length * 8 + 12) : 0;
  return <svg className={`guide-art guide-art-${scene}`} viewBox="0 0 160 100" role="img" aria-label={`Bild: ${label}`} data-scene={scene}>
    {scene === 'planer' && <g className="ga-frame">
      <rect x="4" y="6" width="152" height="88" rx="9" className="ga-window" />
      <path d="M4 15a9 9 0 0 1 9-9h134a9 9 0 0 1 9 9v7H4z" className="ga-bar" />
      <circle cx="14" cy="14" r="2.4" className="ga-dot" /><circle cx="22" cy="14" r="2.4" className="ga-dot" /><circle cx="30" cy="14" r="2.4" className="ga-dot" />
      <rect x="10" y="28" width="30" height="5" rx="2.5" className="ga-line" /><rect x="10" y="38" width="24" height="5" rx="2.5" className="ga-line" /><rect x="10" y="48" width="27" height="5" rx="2.5" className="ga-line" />
      <rect x="48" y="28" width="100" height="58" rx="6" className="ga-card" />
    </g>}
    {scene === 'spiel' && <g className="ga-frame">
      <rect x="4" y="6" width="152" height="88" rx="9" className="ga-sky" />
      <path d="M4 66h152v19a9 9 0 0 1-9 9H13a9 9 0 0 1-9-9z" className="ga-dirt" />
      <path d="M4 62h152v8H4z" className="ga-grass" />
      {[16, 30, 116, 130].map(x => <rect key={x} x={x} y={48} width="14" height="14" className="ga-block" />)}
      <rect x="116" y="34" width="14" height="14" className="ga-block" />
      {[56, 70, 84, 98].map(x => <rect key={x} x={x} y={48} width="14" height="14" className="ga-ghost" />)}
    </g>}
    {scene === 'launcher' && <g className="ga-frame">
      <rect x="4" y="6" width="152" height="88" rx="9" className="ga-window" />
      <rect x="4" y="6" width="36" height="88" rx="9" className="ga-bar" />
      {[18, 34, 50].map(y => <rect key={y} x="12" y={y} width="20" height="10" rx="3" className="ga-line" />)}
      <rect x="48" y="16" width="100" height="12" rx="4" className="ga-line" />
      <rect x="48" y="34" width="100" height="52" rx="6" className="ga-card" />
      <path d="M128 72l12 7-12 7z" className="ga-play" />
    </g>}
    <g className="ga-icon" transform={`translate(${ICON_AT[scene][0]} ${ICON_AT[scene][1]}) scale(1.35)`}>
      <circle cx="12" cy="12" r="15" className="ga-halo" />
      <path d={iconPath(icon)} />
    </g>
    {keyCap && <g className="ga-key" transform={`translate(${152 - capW} ${scene === 'spiel' ? 68 : 66})`}>
      <rect width={capW} height="22" rx="5" /><text x={capW / 2} y="15" textAnchor="middle">{keyCap}</text>
    </g>}
    {step !== undefined && <g className="ga-step"><circle cx="16" cy={scene === 'planer' ? 80 : 22} r="10" /><text x="16" y={scene === 'planer' ? 84 : 26} textAnchor="middle">{step}</text></g>}
  </svg>;
}
