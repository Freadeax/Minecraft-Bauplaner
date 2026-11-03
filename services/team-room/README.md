# Team-Raum (COOP-07)

Kleiner Dienst, über den Planer und Paper-Plugin eines Teams live synchron bleiben, ohne Dateien
(Konzept und Protokoll: `docs/architecture/TEAM_LIVE.md`). Ein Raum je Team, als Cloudflare Durable Object
mit SQLite. Läuft im kostenlosen Workers-Tarif.

## Einrichten (einmal, durch die Bauleitung)

1. Kostenloses Konto auf https://dash.cloudflare.com anlegen.
2. Im Repository:
   ```
   cd services/team-room
   npx wrangler login
   npx wrangler deploy
   ```
   Am Ende steht die Adresse, z. B. `https://bauplaner-team.<name>.workers.dev`.
3. Im Planer: Projekt → Reiter „Team“ → „Team live“ → Adresse eintragen → **Live schalten**.
4. Den **Einladungslink** an die Mitspieler schicken. Den **Link für den Server** auf dem Server mit
   `/bauplaner team verbinden <Link>` eingeben (nicht weitergeben).

Eigene Planer-Adressen außer `https://freadeax.github.io` erlaubt `ALLOWED_ORIGINS` in `wrangler.toml`.

## Lokal prüfen

```
npx wrangler dev --port 8787          # in services/team-room
node scripts/team_room_smoke.mjs http://127.0.0.1:8787   # im Repository-Wurzelordner
```

Die Raumlogik (`src/core.js`) hat keine Cloudflare-Abhängigkeit und wird in `tests/team-room.test.mjs` und
`tests/e2e/team-room.e2e.mjs` direkt geprüft.

## Grenzen

20 000 Ereignisse je Raum, 4 KB je Ereignis, 200 je Stapel, Planstand bis 25 MB (die neuesten drei bleiben).
