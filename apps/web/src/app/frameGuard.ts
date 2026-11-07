/**
 * RELEASE-01 Einbettungsschutz im Programm: GitHub Pages kann weder `X-Frame-Options` noch `frame-ancestors`
 * senden. Läuft die Seite in einem Rahmen einer fremden Adresse, startet sie nicht, sondern zeigt nur einen
 * Link zum Öffnen im eigenen Tab. So kann keine fremde Seite Klicks auf Freigaben oder Team-Aktionen unterschieben.
 * Auf Cloudflare Pages blockiert der Browser die Einbettung schon über die Header.
 */
export function framedByOtherSite(win: Window = window): boolean {
  if (win.top === win.self) return false;
  try { return win.top!.location.origin !== win.location.origin; } catch { return true; }
}

/** Ersetzt den Seiteninhalt durch den Hinweis; true, wenn die App nicht starten darf. */
export function blockForeignFrame(win: Window = window): boolean {
  if (!framedByOtherSite(win)) return false;
  const doc = win.document, root = doc.getElementById('root') ?? doc.body;
  const box = doc.createElement('main');
  box.setAttribute('role', 'alert');
  box.style.cssText = 'font:16px system-ui,sans-serif;padding:24px;max-width:36rem';
  const h = doc.createElement('h1');
  h.textContent = 'LMNT — Build Studio läuft nicht in fremden Seiten';
  const p = doc.createElement('p');
  p.textContent = 'Zum Schutz deiner Projekte und Team-Freigaben startet der Planer nur im eigenen Fenster.';
  const a = doc.createElement('a');
  a.href = win.location.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.textContent = 'Im eigenen Tab öffnen ↗';
  box.append(h, p, a);
  root.replaceChildren(box);
  return true;
}
