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
import { LibraryView } from './views/LibraryView';
import { ProjectView } from './views/project/ProjectView';
import { ViewerView } from './views/ViewerView';
import { SystemView } from './views/SystemView';
import { WorldMapView } from './views/map/WorldMapView';
import { ModView } from './views/mod/ModView';
import { WorkshopPage } from './editor/WorkshopPage';
import './style.css';
import './catalog.css';
import './schem.css';
import './theme/theme.css';
import './blockmodels/blocks.css';
import './shell.css';

function Page({ route }: { route: Route }) {
  switch (route.view) {
    case 'projects': return <ProjectsView />;
    case 'library': return <LibraryView projectId={route.projectId} page={route.page} id={route.id} sub={route.sub} search={route.search} />;
    case 'viewer': return <main><ViewerView /></main>;
    case 'system': return <SystemView />;
    case 'map': return <WorldMapView search={route.search} />;
    case 'mod': return <ModView search={route.search} />;
    case 'workshop': return <WorkshopPage key={route.versionId ?? 'neu'} versionId={route.versionId} />;
    case 'project': return <ProjectView key={route.projectId} projectId={route.projectId} tab={route.tab} />;
    case 'not-found': return <div className="page"><div className="notice warning" role="alert">Seite „{route.path}“ gibt es nicht. <a href="#/">Zur Projektzentrale</a></div></div>;
  }
}

function App() {
  const route = useRoute();
  return <Shell route={route}>
    <AppProvider><CommandPalette /><ErrorBoundary resetKey={window.location.hash}><Page route={route} /></ErrorBoundary></AppProvider>
    <TextureDialog />
  </Shell>;
}

installErrorCapture();
initTextures();
createRoot(document.getElementById('root')!).render(<App />);
