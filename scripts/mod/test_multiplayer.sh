#!/usr/bin/env bash
# Multiplayer acceptance on real Paper servers (Roadmap block 4): real players as bots (mineflayer) and the team room.
# Plays TEAMBAU-06, LINK-12, LINK-01 and LINK-04 end to end (scripts/mod/bridge_multiplayer.mjs, bench scripts/mod/lib/multiplayer.mjs).
# Needs `npm run build:core`, network to fill.papermc.io, the Mojang servers and the npm registry (mineflayer is
# installed into the work folder only). Starts its own team room with `npx wrangler dev` unless BAUPLANER_ROOM is set.
# Not part of `npm run check`.
# Usage: scripts/mod/test_multiplayer.sh [version ...]   (default 1.21.11 and 26.1.2 if JDK 25 is there; the bot library
# mineflayer decides which versions work: 26.1.x is played with its protocol 26.1, 26.3 is not supported by it yet)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; rm -rf "$work"; }
trap cleanup EXIT
versions=("$@")
java21=${BAUPLANER_JAVA21:-$(ls -d /usr/lib/jvm/java-21-openjdk-*/bin/java 2>/dev/null | head -1)}
java25=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1)}
java21=${java21:-${java25:-java}}
if [ ${#versions[@]} -eq 0 ]; then versions=(1.21.11); [ -n "$java25" ] && versions+=(26.1.2); fi
(cd mods/bauplaner-bridge && ./gradlew -q -PwithPaper :paper:build -x test --console=plain)
jar=mods/bauplaner-bridge/paper/build/libs/bauplaner-bridge-paper-$(cat mods/bauplaner-bridge/VERSION).jar
mkdir -p "$work/bots" && (cd "$work/bots" && npm init -y >/dev/null && npm install --silent --no-audit --no-fund mineflayer@4 >/dev/null)
room=${BAUPLANER_ROOM:-}
if [ -z "$room" ]; then
  port=$((8800 + RANDOM % 100))
  (cd services/team-room && exec npx -y wrangler@4.160.0 dev --port "$port" --ip 127.0.0.1 >"$work/wrangler.log" 2>&1) & pids+=($!)
  for _ in $(seq 1 120); do grep -q "Ready on" "$work/wrangler.log" 2>/dev/null && break; sleep 1; done
  grep -q "Ready on" "$work/wrangler.log" || { cat "$work/wrangler.log"; echo "Team-Raum (wrangler dev) startet nicht"; exit 1; }
  room=http://127.0.0.1:$port
fi
for v in "${versions[@]}"; do
  case "$v" in 1.*) j=$java21 ;; *) j=${java25:?JDK 25 fehlt für Minecraft $v} ;; esac
  echo "Paper $v (Mehrspieler mit echten Spielern und Team-Raum $room) mit $("$j" -version 2>&1 | grep -m1 version)"
  case "$v" in 26.1.*) client=26.1 ;; *) client=$v ;; esac
  node scripts/mod/bridge_multiplayer.mjs "$work" "$jar" "$v" "$j" "$work/bots" "$room" "$client"
done
