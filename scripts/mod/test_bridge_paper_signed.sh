#!/usr/bin/env bash
# Real-server test of GAME-06 (docs/architecture/team/SIGNED_EVENTS.md): signed events of the Bauleitung and the
# section protection from the team room on a real Paper server. Needs a running team room (BAUPLANER_ROOM, default
# http://127.0.0.1:8787, e.g. npx wrangler dev in services/team-room), `npm run build:core`, network to repo.papermc.io,
# fill.papermc.io and the Mojang servers. Not part of `npm run check`.
# Usage: scripts/mod/test_bridge_paper_signed.sh [version ...]   (default 1.21.11, plus 26.3 with JDK 25)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
versions=("$@")
java25=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1 || true)}
java21=${BAUPLANER_JAVA21:-$(ls -d /usr/lib/jvm/java-21-openjdk-*/bin/java 2>/dev/null | head -1 || true)}
java21=${java21:-java}
if [ ${#versions[@]} -eq 0 ]; then versions=(1.21.11); [ -n "$java25" ] && versions+=(26.3); fi
(cd mods/bauplaner-bridge && ./gradlew -q -PwithPaper :paper:build --console=plain)
jar=mods/bauplaner-bridge/paper/build/libs/bauplaner-bridge-paper-$(cat mods/bauplaner-bridge/VERSION).jar
for v in "${versions[@]}"; do
  case "$v" in 1.*) j=$java21 ;; *) j=${java25:?JDK 25 fehlt für Minecraft $v} ;; esac
  echo "Paper $v (unterschriebene Ereignisse) mit $("$j" -version 2>&1 | grep -m1 version)"
  node scripts/mod/bridge_papersigned.mjs "$work" "$jar" "$v" "$j" "${BAUPLANER_ROOM:-http://127.0.0.1:8787}"
done
