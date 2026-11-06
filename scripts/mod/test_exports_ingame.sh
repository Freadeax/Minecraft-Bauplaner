#!/usr/bin/env bash
# Spielprüfung der Planer-Exporte (Roadmap-Block 1: FORMAT-01, FORMAT-02, NBT-01, ENTITY-01, DIFF-01, MAT-04, PROFILE-01).
# Startet Minecraft 26.3 (Fabric-Clientspieltest) zweimal mit Litematica 0.29.1, MaLiLib 0.30.2 und WorldEdit 7.4.6 von Modrinth:
#   Lauf 1: Planer-Exporte (.litematic mit Litematica, .schem mit //schem load + //paste) einfügen, das Spiel selbst dreht und
#           spiegelt den ungedrehten Bau (StructureTemplate), WorldEdit (//copy, //schem save) und Litematica speichern echte
#           Dateien, Truhe und Schild werden im Spiel geändert, Kupfer bekommt schnelle Zufallsticks, Register werden abgezogen.
#   dazwischen: der Planer liest die echten Dateien, übernimmt sie als Bauteil und exportiert sie wieder.
#   Lauf 2: diese Exporte im Spiel einfügen.
# Danach vergleicht scripts/mod/export_check.mjs alles Block für Block, BlockEntity für BlockEntity und Entity für Entity.
# Braucht JDK 25, Netz zu maven.fabricmc.net, api.modrinth.com und den Mojang-Servern, `npm run build:core` vorher und einen
# Bildschirm (vorhandenes DISPLAY/WAYLAND_DISPLAY oder headless weston). Nicht Teil von `npm run check` (einige Minuten).
# Optional: BAUPLANER_KEEP=<Ordner> behält Exporte, Abzüge, Spieldateien, Bilder und bericht.md/json.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
weston_pid=
cleanup() { [ -n "$weston_pid" ] && kill "$weston_pid" 2>/dev/null; [ -n "${BAUPLANER_KEEP:-}" ] && mkdir -p "$BAUPLANER_KEEP" && cp -r "$work"/. "$BAUPLANER_KEEP"; rm -rf "$work"; }
trap cleanup EXIT

node scripts/mod/export_check.mjs prepare "$work"
if [ -z "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
  command -v weston >/dev/null || { echo "Kein Bildschirm und kein weston: sudo apt-get install weston" >&2; exit 2; }
  export XDG_RUNTIME_DIR="$work/xdg" WAYLAND_DISPLAY=bauplaner-export SDL_VIDEO_DRIVER=wayland
  mkdir -m 700 "$XDG_RUNTIME_DIR"
  weston --backend=headless --renderer=gl --socket="$WAYLAND_DISPLAY" --width=1280 --height=720 >"$work/weston.log" 2>&1 &
  weston_pid=$!
  for _ in $(seq 50); do [ -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ] && break; sleep 0.2; done
fi
# Litematica keeps threads alive after the world closed, so the client shutdown watchdog may end the game with an
# error after the test finished: a run counts once its result file says "done" and no step failed.
run() {
  local job=$1 log=$2 result=${1/job/result}
  if ! (cd mods/bauplaner-bridge && BAUPLANER_EXPORTCHECK_DIR="$work" BAUPLANER_EXPORTCHECK_JOB="$job" \
        ./gradlew -q -PwithExportCheck :export-check-26.3:runClientGameTest --console=plain) >"$work/$log" 2>&1 \
     && ! { [ ! -f "$work/fehler.txt" ] && grep -q '"done": true' "$work/$result" 2>/dev/null; }; then
    grep -E "Exportprüfung|ERROR|Exception|Caused by|AssertionError" "$work/$log" | tail -40 >&2
    [ -f "$work/fehler.txt" ] && cat "$work/fehler.txt" >&2
    exit 1
  fi
}
run job.json game.log
node scripts/mod/export_check.mjs between "$work"
run job2.json game2.log
node scripts/mod/export_check.mjs verify "$work"
