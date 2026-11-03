import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './app/context';
import { ErrorBoundary } from './app/ErrorBoundary';
import { installErrorCapture } from './app/errorLog';
import { initTextures } from './blockmodels/assets';
import { TextureDialog } from './blockmodels/TexturePanel';
import { useRoute } from './app/router';
import type { Route } from './app/router';
import { Shell } from './app/Shell';
import { CommandPalette } from './app/CommandPalette';
import { ProjectsView } from './views/ProjectsView';
import { installDiagnostics } from './app/diagnostics';
import { lazyPage } from './app/lazyPage';
import './style.css';
import './catalog.css';
import './schem.css';
import './theme/theme.css';
import './blockmodels/blocks.css';
import './shell.css';

// PERF-05: pages load when opened; the start needs only the shell and the project centre.
const LibraryView = lazyPage(() => import('./views/LibraryView').then(m => m.LibraryView));
const ProjectView = lazyPage(() => import('./views/project/ProjectView').then(m => m.ProjectView));
const ViewerView = lazyPage(() => import('./views/ViewerView').then(m => m.ViewerView));
const SystemView = lazyPage(() => import('./views/SystemView').then(m => m.SystemView));
const TestphaseView = lazyPage(() => import('./testing/TestphaseView').then(m => m.TestphaseView));
const WorldMapView = lazyPage(() => import('./views/map/WorldMapView').then(m => m.WorldMapView));
const TeamJoinView = lazyPage(() => import('./views/project/TeamJoinView').then(m => m.TeamJoinView));
const ModView = lazyPage(() => import('./views/mod/ModView').then(m => m.ModView));
const WorkshopPage = lazyPage(() => import('./editor/WorkshopPage').then(m => m.WorkshopPage));
const WorldImportView = lazyPage(() => import('./views/world/WorldImportView').then(m => m.WorldImportView));

function Page({ route }: { route: Route }) {
  switch (route.view) {
    case 'projects': return <ProjectsView />;
    case 'library': return <LibraryView projectId={route.projectId} page={route.page} id={route.id} sub={route.sub} search={route.search} />;
    case 'viewer': return <main><ViewerView /></main>;
    case 'system': return <SystemView />;
    case 'testphase': return <TestphaseView search={route.search} />;
    case 'map': return <WorldMapView search={route.search} />;
    case 'mod': return <ModView search={route.search} />;
    case 'team-join': return <TeamJoinView search={route.search ?? ''} />;
    case 'workshop': return <WorkshopPage key={route.versionId ?? 'neu'} versionId={route.versionId} />;
    case 'world': return <WorldImportView />;
    case 'project': return <ProjectView key={route.projectId} projectId={route.projectId} tab={route.tab} />;
    case 'not-found': return <div className="page"><div className="notice warning" role="alert">Seite „{route.path}“ gibt es nicht. <a href="#/">Zur Projektzentrale</a></div></div>;
  }
}

function App() {
  const route = useRoute();
  return <Shell route={route}>
    <AppProvider><CommandPalette /><ErrorBoundary resetKey={window.location.hash}><Suspense key={route.view} fallback={<div className="loading" role="status" data-page-loading="">Seite wird geladen …</div>}><Page route={route} /></Suspense></ErrorBoundary></AppProvider>
    <TextureDialog />
  </Shell>;
}

installErrorCapture();
installDiagnostics();
initTextures();
createRoot(document.getElementById('root')!).render(<App />);
