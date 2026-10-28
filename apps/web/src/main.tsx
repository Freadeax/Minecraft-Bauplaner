import { createRoot } from 'react-dom/client';
import { AppProvider } from './app/context';
import { useRoute } from './app/router';
import type { Route } from './app/router';
import { Cube, REPO_URL } from './app/ui';
import { ProjectsView } from './views/ProjectsView';
import { LibraryView } from './views/LibraryView';
import { ProjectView } from './views/project/ProjectView';
import { ViewerView } from './views/ViewerView';
import './style.css';
import './catalog.css';
import './schem.css';

function Page({ route }: { route: Route }) {
  switch (route.view) {
    case 'projects': return <ProjectsView />;
    case 'library': return <LibraryView projectId={route.projectId} page={route.page} id={route.id} sub={route.sub} search={route.search} />;
    case 'viewer': return <main><ViewerView /></main>;
    case 'project': return <ProjectView key={route.projectId} projectId={route.projectId} tab={route.tab} />;
    case 'not-found': return <div className="page"><div className="notice warning" role="alert">Seite „{route.path}“ gibt es nicht. <a href="#/">Zur Projektzentrale</a></div></div>;
  }
}

function App() {
  const route = useRoute();
  const area = route.view === 'project' ? 'projects' : route.view;
  return <>
    <a className="skip" href="#inhalt" onClick={e => { e.preventDefault(); document.getElementById('inhalt')?.focus(); }}>Zum Inhalt</a>
    <header className="topbar"><a className="brand" href="#/"><span className="brand-icon"><Cube /></span><span>LMNT <strong>BUILD STUDIO</strong><small>DEIN MINECRAFT-BAUHELFER</small></span></a>
      <nav aria-label="Hauptnavigation">
        <a href="#/" aria-current={area === 'projects' ? 'page' : undefined}>Projekte</a>
        <a href="#/bibliothek" aria-current={area === 'library' ? 'page' : undefined}>Bibliothek</a>
        <a href="#/betrachter" aria-current={area === 'viewer' ? 'page' : undefined}>Betrachter</a>
        <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
      </nav><span className="version"><span /> Vorabversion 0.2</span></header>
    <div id="inhalt" tabIndex={-1} className="content"><AppProvider><Page route={route} /></AppProvider></div>
    <footer><span>LMNT BUILD STUDIO <span className="footer-dot">·</span> Mit Plan gebaut.</span><span>Unabhängiges Projekt · kein offizielles Minecraft-Produkt</span></footer>
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
