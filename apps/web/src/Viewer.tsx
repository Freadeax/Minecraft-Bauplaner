import { lazy, Suspense } from 'react';
import type { ViewerProps } from './viewer/types';
export type { ViewerProps } from './viewer/types';

// three.js (~600 kB) is loaded only when a page actually shows a 3D view.
const ThreeViewer = lazy(() => import('./viewer/ThreeViewer'));

/** 3D view with orbit, free flight, view presets, focus and touch; software fallback without WebGL. */
export function Viewer(props: ViewerProps) {
  return <Suspense fallback={<div className="scene"><div className="viewer-loading" role="status">3D-Ansicht wird geladen …</div></div>}>
    <ThreeViewer {...props} />
  </Suspense>;
}
