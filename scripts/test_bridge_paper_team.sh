#!/usr/bin/env bash
# Real-server test of the Teambau module of the Paper plugin (COOP-02, docs/architecture/TEAMBAU.md).
# Builds the plugin and plays a building day with console commands on real Paper servers
# (default: oldest and newest tested version that this machine has a JDK for). Needs `npm run build:core`,
# network to repo.papermc.io, fill.papermc.io and the Mojang servers. Not part of `npm run check`.
# Usage: scripts/test_bridge_paper_team.sh [version ...]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
versions=("$@")
java25=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1)}
java21=${BAUPLANER_JAVA21:-$(ls -d /usr/lib/jvm/java-21-openjdk-*/bin/java 2>/dev/null | head -1)}
java21=${java21:-java}
if [ ${#versions[@]} -eq 0 ]; then versions=(1.18.2 1.21.11); [ -n "$java25" ] && versions+=(26.3); fi
(cd mods/bauplaner-bridge && ./gradlew -q -PwithPaper :paper:build --console=plain)
jar=mods/bauplaner-bridge/paper/build/libs/bauplaner-bridge-paper-$(cat mods/bauplaner-bridge/VERSION).jar
for v in "${versions[@]}"; do
  case "$v" in 1.*) j=$java21 ;; *) j=${java25:?JDK 25 fehlt für Minecraft $v} ;; esac
  echo "Paper $v (Teambau) mit $("$j" -version 2>&1 | grep -m1 version)"
  node scripts/bridge_paperteam.mjs "$work" "$jar" "$v" "$j"
done
