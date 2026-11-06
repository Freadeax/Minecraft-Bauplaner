#!/usr/bin/env bash
# Real-server test of MAP-07 (KARTE-07): turned and mirrored world placement block by block against the game's own
# `/place template` on Paper 26.3 – mod rule (mod-core Placement.java) and planner rule (placeToWorld/turnState) must
# both match the game for all 8 placements; the plugin gets a turned and a mirrored team header from the team room and
# its section boxes must lie exactly over the placed blocks. Needs a running team room (BAUPLANER_ROOM, default
# http://127.0.0.1:8787, e.g. npx wrangler dev in services/team-room), `npm run build:core`, JDK 25, network to
# fill.papermc.io. Not part of `npm run check`.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
java25=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1)}
(cd mods/bauplaner-bridge && ./gradlew -q -PwithPaper :mod-core:classes :paper:build --console=plain)
jar=mods/bauplaner-bridge/paper/build/libs/bauplaner-bridge-paper-$(cat mods/bauplaner-bridge/VERSION).jar
node scripts/mod/bridge_paperplacement.mjs "$work" "$jar" 26.3 "${java25:?JDK 25 fehlt}" mods/bauplaner-bridge/mod-core/build/classes/java/main "${BAUPLANER_ROOM:-http://127.0.0.1:8787}"
