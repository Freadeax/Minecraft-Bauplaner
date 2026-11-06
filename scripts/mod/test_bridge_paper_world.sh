#!/usr/bin/env bash
# Real-server test of WORLD-SHARE-01: Weltplan from the Team-Raum into BlueMap (Paper 26.3) and Dynmap (Paper 1.21.4),
# written by the plugin itself. Needs a running team room (BAUPLANER_ROOM, default http://127.0.0.1:8787, e.g.
# npx wrangler dev in services/team-room), `npm run build:core`, JDK 21 and 25, network to fill.papermc.io, the
# Modrinth CDN and the Mojang servers. Not part of `npm run check`.
# Usage: scripts/mod/test_bridge_paper_world.sh [bluemap|dynmap ...]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
kinds=("$@"); [ ${#kinds[@]} -eq 0 ] && kinds=(bluemap dynmap)
java25=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1)}
java21=${BAUPLANER_JAVA21:-$(ls -d /usr/lib/jvm/java-21-openjdk-*/bin/java 2>/dev/null | head -1)}
(cd mods/bauplaner-bridge && ./gradlew -q -PwithPaper :paper:build --console=plain)
jar=mods/bauplaner-bridge/paper/build/libs/bauplaner-bridge-paper-$(cat mods/bauplaner-bridge/VERSION).jar
for k in "${kinds[@]}"; do
  case "$k" in bluemap) v=26.3; j=${java25:?JDK 25 fehlt} ;; dynmap) v=1.21.4; j=${java21:-java} ;; *) echo "unbekannt: $k"; exit 2 ;; esac
  echo "Paper $v mit $k (Weltplan aus dem Team-Raum)"
  node scripts/mod/bridge_paperworld.mjs "$work" "$jar" "$v" "$j" "$k" "${BAUPLANER_ROOM:-http://127.0.0.1:8787}"
done
