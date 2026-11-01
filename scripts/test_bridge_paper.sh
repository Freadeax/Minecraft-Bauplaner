#!/usr/bin/env bash
# Real-server test of the Paper plugin (GAME-04): builds the plugin once and runs it on real Paper servers
# of several Minecraft versions (default: all in mods/bauplaner-bridge/paper/gradle.properties tested_versions).
# Each server builds a website-exported plan with one wrong and one missing block, the plugin records it
# via console commands (chunks unloaded beforehand, so it has to load them without generating any), and the
# recording is compared like the website's "Spielaufnahme importieren" does.
# Needs JDK 21 (Minecraft ≤ 1.21.x) and JDK 25 (26.x; BAUPLANER_JAVA25 or /usr/lib/jvm/java-25-openjdk-*),
# network to repo.papermc.io, fill.papermc.io and the Mojang servers, and a prior `npm run build:core`.
# Usage: scripts/test_bridge_paper.sh [version ...]. Not part of `npm run check` (minutes, large downloads).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
props=mods/bauplaner-bridge/paper/gradle.properties
versions=("$@")
[ ${#versions[@]} -eq 0 ] && read -r -a versions <<<"$(sed -n 's/^tested_versions=//p' "$props")"
java25=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1)}
java21=${BAUPLANER_JAVA21:-$(ls -d /usr/lib/jvm/java-21-openjdk-*/bin/java 2>/dev/null | head -1)}
java21=${java21:-java}

(cd mods/bauplaner-bridge && ./gradlew -q -PwithPaper :paper:build --console=plain)
jar=$(ls mods/bauplaner-bridge/paper/build/libs/bauplaner-bridge-paper-*.jar | grep -v -- -sources | head -1)
node scripts/bridge_gametest.mjs prepare "$work"
for v in "${versions[@]}"; do
  case "$v" in 1.*) j=$java21 ;; *) j=${java25:?JDK 25 fehlt für Minecraft $v} ;; esac
  echo "Paper $v mit $("$j" -version 2>&1 | grep -m1 version)"
  node scripts/bridge_papertest.mjs "$work" "$jar" "$v" "$j"
  node scripts/bridge_gametest.mjs verify "$work/$v"
done
