#!/usr/bin/env bash
# COMPAT-01: lädt für jede Zielversion den offiziellen Minecraft-Server von Mojang und erzeugt dessen
# Blockbericht (reports/blocks.json). Eingecheckt wird davon nichts; gen_version_compat.mjs leitet
# nur die Unterschiede (fehlende Blöcke, andere Eigenschaften) zum Versionsprofil ab.
#   scripts/gen/fetch_version_reports.sh <arbeitsordner> [version …]
# Java: bis 1.21.x JDK 21, ab 26.x JDK 25 (BAUPLANER_JAVA21 / BAUPLANER_JAVA25 oder /usr/lib/jvm).
set -euo pipefail
work=${1:?Arbeitsordner fehlt}; shift
versions=("$@")
[ ${#versions[@]} -gt 0 ] || versions=(1.20.1 1.20.4 1.20.6 1.21.1 1.21.4 1.21.5 1.21.8 1.21.10 1.21.11 26.1.2 26.2 26.3)
java21=${BAUPLANER_JAVA21:-$(ls -d /usr/lib/jvm/java-21-openjdk-*/bin/java 2>/dev/null | head -1 || true)}
java25=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1 || true)}
mkdir -p "$work"
manifest="$work/version_manifest_v2.json"
[ -s "$manifest" ] || curl -fsSL https://piston-meta.mojang.com/mc/game/version_manifest_v2.json -o "$manifest"
for v in "${versions[@]}"; do
  out="$work/$v"
  if [ -s "$out/reports/blocks.json" ]; then echo "$v: vorhanden"; continue; fi
  mkdir -p "$out"
  meta=$(node -e 'const j=require(process.argv[1]);const v=j.versions.find(x=>x.id===process.argv[2]);if(!v)process.exit(3);console.log(v.url)' "$manifest" "$v")
  curl -fsSL "$meta" -o "$out/version.json"
  read -r url sha dv < <(node -e 'const j=require(process.argv[1]);console.log(j.downloads.server.url, j.downloads.server.sha1, j.javaVersion?.majorVersion ?? 17)' "$out/version.json")
  [ -s "$out/server.jar" ] || curl -fsSL "$url" -o "$out/server.jar"
  echo "$sha  $out/server.jar" | sha1sum -c --quiet
  java=$java21; [ "$dv" -gt 21 ] && java=$java25
  [ -n "$java" ] || { echo "$v: kein JDK für Java $dv" >&2; exit 4; }
  (cd "$out" && "$java" -DbundlerMainClass=net.minecraft.data.Main -jar server.jar --reports --output gen >/dev/null 2>&1)
  mkdir -p "$out/reports"; cp "$out/gen/reports/blocks.json" "$out/reports/blocks.json"
  unzip -p "$out/server.jar" version.json > "$out/game_version.json"
  echo "$sha" > "$out/server.sha1"
  rm -rf "$out/gen" "$out/libraries" "$out/versions" "$out/logs"
  echo "$v: blocks.json $(stat -c%s "$out/reports/blocks.json") Bytes"
done
