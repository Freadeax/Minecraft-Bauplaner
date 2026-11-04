#!/usr/bin/env bash
# Real-server test of „Server ohne Befehle“ (LINK-01/02, docs/architecture/AUTO_LINK.md): a protocol client speaks
# the team channel like the mod, pairs the server as operator and changes it by signed control messages.
# Needs `npm run build:core`, network to fill.papermc.io, the Mojang servers and the npm registry
# (minecraft-protocol, installed into the work folder only). Not part of `npm run check`.
# Optional BAUPLANER_ROOM=<url of a running team room, e.g. http://127.0.0.1:8787 from npx wrangler dev> also tests
# the second way: control messages through the team room (LINK-05).
# Usage: scripts/test_bridge_paper_link.sh [version ...]   (default 1.21.11; the client library decides which versions work)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
versions=("$@")
[ ${#versions[@]} -eq 0 ] && versions=(1.21.11)
java21=${BAUPLANER_JAVA21:-$(ls -d /usr/lib/jvm/java-21-openjdk-*/bin/java 2>/dev/null | head -1)}
java25=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1)}
java21=${java21:-${java25:-java}}
(cd mods/bauplaner-bridge && ./gradlew -q -PwithPaper :paper:build --console=plain)
jar=mods/bauplaner-bridge/paper/build/libs/bauplaner-bridge-paper-$(cat mods/bauplaner-bridge/VERSION).jar
node scripts/bridge_gametest.mjs prepare "$work" >/dev/null   # plan.schem for the plan step (LINK-06)
mkdir -p "$work/mcp" && (cd "$work/mcp" && npm init -y >/dev/null && npm install --silent --no-audit --no-fund minecraft-protocol@1 >/dev/null)
for v in "${versions[@]}"; do
  case "$v" in 1.*) j=$java21 ;; *) j=${java25:?JDK 25 fehlt für Minecraft $v} ;; esac
  echo "Paper $v (Server ohne Befehle) mit $("$j" -version 2>&1 | grep -m1 version)"
  node scripts/bridge_paperlink.mjs "$work" "$jar" "$v" "$j" "$work/mcp" "${BAUPLANER_ROOM:-}"
done
