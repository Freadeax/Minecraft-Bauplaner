#!/usr/bin/env bash
# Real-player test of the storage chests and yield stores of the Paper plugin (COOP-05, COOP-08, PROD-05; Testfälle
# LAGER-01..05, -07, -10, -11): two mineflayer bot players on a real Paper server, the team comes from a local team room.
# Starts `npx wrangler dev` in services/team-room unless BAUPLANER_ROOM names a running one. Needs `npm run build:core`,
# network to fill.papermc.io, the Mojang servers and the npm registry (mineflayer, only into the work folder).
# Server and team room come from the shared bench scripts/mod/lib/multiplayer.mjs. Not part of `npm run check`.
# Usage: scripts/mod/test_bridge_paper_bots.sh [lager|farm|alle] [version ...]
#   (default: alle on 1.21.11 and, with JDK 25, 26.1.2 – mineflayer 4.39 speaks up to 26.1, not yet 26.3)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
part=${1:-alle}; shift || true
versions=("$@")
work=$(mktemp -d)
wrangler_pid=
cleanup() { [ -n "$wrangler_pid" ] && kill -- "-$wrangler_pid" 2>/dev/null; sleep 1; rm -rf "$work"; }
trap cleanup EXIT
java25=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1)}
java21=${BAUPLANER_JAVA21:-$(ls -d /usr/lib/jvm/java-21-openjdk-*/bin/java 2>/dev/null | head -1)}
java21=${java21:-java}
if [ ${#versions[@]} -eq 0 ]; then versions=(1.21.11); [ -n "$java25" ] && versions+=(26.1.2); fi
(cd mods/bauplaner-bridge && ./gradlew -q -PwithPaper :paper:build --console=plain)
jar=mods/bauplaner-bridge/paper/build/libs/bauplaner-bridge-paper-$(cat mods/bauplaner-bridge/VERSION).jar
mkdir -p "$work/bots" && (cd "$work/bots" && npm init -y >/dev/null && npm install --silent --no-audit --no-fund mineflayer@4.39.0 vec3@0.1 >/dev/null)
room=${BAUPLANER_ROOM:-}
if [ -z "$room" ]; then
  roomport=$((8800 + RANDOM % 100))
  (cd services/team-room && exec setsid npx --yes wrangler@4 dev --port "$roomport" --ip 127.0.0.1 --persist-to "$work/room" >"$work/wrangler.log" 2>&1) &
  wrangler_pid=$!
  room=http://127.0.0.1:$roomport
  for _ in $(seq 1 120); do grep -q "Ready on" "$work/wrangler.log" 2>/dev/null && break; sleep 1; done
  grep -q "Ready on" "$work/wrangler.log" || { cat "$work/wrangler.log"; echo "Team-Raum (wrangler dev) startet nicht"; exit 1; }
fi
parts=("$part"); [ "$part" = alle ] && parts=(lager farm)
for v in "${versions[@]}"; do
  case "$v" in 1.*) j=$java21 ;; *) j=${java25:?JDK 25 fehlt für Minecraft $v} ;; esac
  for p in "${parts[@]}"; do
    echo "Paper $v ($p, zwei Spieler) mit $("$j" -version 2>&1 | grep -m1 version)"
    node scripts/mod/bridge_paperbots.mjs "$work" "$jar" "$v" "$j" "$work/bots" "$room" "$p"
  done
done
