#!/usr/bin/env bash
# Real-server test of the planner's emergency way to the web map (MAP-02, KARTE-08, no Build Studio plugin): the exported
# BlueMap `marker-sets` block in maps/world.conf of BlueMap 5.29 on Paper 26.3 and the exported `dmarker` lines in the
# console of Dynmap 3.7-beta-8 on Paper 1.21.4. Needs `npm run build:core`, JDK 21 and 25, network to fill.papermc.io,
# the Modrinth CDN and the Mojang servers. Not part of `npm run check`.
# Usage: scripts/mod/test_bridge_paper_mapfallback.sh [bluemap|dynmap ...]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
kinds=("$@"); [ ${#kinds[@]} -eq 0 ] && kinds=(bluemap dynmap)
java25=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1)}
java21=${BAUPLANER_JAVA21:-$(ls -d /usr/lib/jvm/java-21-openjdk-*/bin/java 2>/dev/null | head -1)}
for k in "${kinds[@]}"; do
  case "$k" in bluemap) v=26.3; j=${java25:?JDK 25 fehlt} ;; dynmap) v=1.21.4; j=${java21:-java} ;; *) echo "unbekannt: $k"; exit 2 ;; esac
  echo "Paper $v mit $k (Notfallweg ohne Plugin)"
  node scripts/mod/bridge_papermapfallback.mjs "$work" "$v" "$j" "$k"
done
