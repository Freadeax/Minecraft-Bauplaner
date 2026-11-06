#!/usr/bin/env bash
# BLOCK-01/02 Spielprüfstand: setzt Katalog-Gebäude und Generator-Fälle (oder andere Sätze aus
# scripts/mod/game_placement.mjs) in einen echten Paper-26.3-Server, lässt jede Zelle vom Spiel
# aktualisieren (Formupdates, neighborChanged, geplante Ticks, Schwerkraft, Wasser) und meldet jeden
# Block, der abfällt, sich umwandelt, anders verbindet, ausläuft oder als Drop endet.
# Braucht JDK 25 (BAUPLANER_JAVA25 oder /usr/lib/jvm/java-25-openjdk-*), Netz zu fill.papermc.io und den
# Mojang-Servern (nur beim ersten Lauf, danach Cache) und `npm run build:core`.
# Aufruf: scripts/mod/test_game_placement.sh [satz ...]   (Standard: catalog generators)
# Bericht: $BAUPLANER_PLACEMENT_OUT/bericht.md (Standard: ein Temp-Ordner, der erhalten bleibt, wenn etwas abweicht).
# Nicht Teil von `npm run check` (einige Minuten).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
version=26.3
java=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1)}
: "${java:?JDK 25 fehlt}"
jbin=$(dirname "$java")
cache=${XDG_CACHE_HOME:-$HOME/.cache}/bauplaner-paper
work=${BAUPLANER_PLACEMENT_OUT:-$(mktemp -d)}
mkdir -p "$cache" "$work"

# Paper (newest stable build, checksum-checked, cached) and the jars Paperclip unpacks for compiling.
jar=$(node --input-type=module -e "
import { createHash } from 'node:crypto'; import { existsSync, writeFileSync } from 'node:fs';
const builds = await (await fetch('https://fill.papermc.io/v3/projects/paper/versions/$version/builds')).json();
const b = builds.find(b => b.channel === 'STABLE') ?? builds[0], d = b.downloads['server:default'], f = '$cache/' + d.name;
if (!existsSync(f)) { const bytes = Buffer.from(await (await fetch(d.url)).arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== d.checksums.sha256) throw new Error('Prüfsumme Paper');
  writeFileSync(f, bytes); }
console.log(f);")
server=$work/server
mkdir -p "$server/plugins/PlacementProbe" "$work/plugin"
(cd "$server" && [ -d versions ] || "$java" -Dpaperclip.patchonly=true -jar "$jar" >/dev/null)
cp=$(find "$server/versions" "$server/libraries" -name '*.jar' | tr '\n' ':')
"$jbin/javac" -nowarn -cp "$cp" -d "$work/plugin" scripts/mod/probe/PlacementProbe.java
printf 'name: PlacementProbe\nversion: 1\nmain: PlacementProbe\napi-version: "26.3"\n' >"$work/plugin/plugin.yml"
"$jbin/jar" cf "$server/plugins/placement-probe.jar" -C "$work/plugin" .

probe=$server/plugins/PlacementProbe
rm -rf "$probe/jobs" "$probe/results" "$probe/done.txt" "$server/world"*
node scripts/mod/game_placement.mjs prepare "$probe" "$@"
echo eula=true >"$server/eula.txt"
cat >"$server/server.properties" <<EOF
online-mode=false
server-port=$((25600 + RANDOM % 300))
level-type=minecraft\:flat
generate-structures=false
spawn-protection=0
view-distance=2
simulation-distance=2
spawn-monsters=false
spawn-animals=false
EOF
(cd "$server" && "$java" -Xmx3G -Dfile.encoding=UTF-8 -jar "$jar" --nogui </dev/null >"$work/server.log" 2>&1) || true
if ! grep -qx ok "$probe/done.txt" 2>/dev/null; then
  cat "$probe/done.txt" 2>/dev/null || tail -40 "$work/server.log"
  echo "Spielprüfung nicht durchgelaufen (Protokoll $work/server.log)"; exit 1
fi
grep -E "WARN|ERROR" "$work/server.log" | grep -i placementprobe && { echo "Warnungen des Test-Plugins"; exit 1; }
node scripts/mod/game_placement.mjs verify "$probe"
