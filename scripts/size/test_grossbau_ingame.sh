#!/usr/bin/env bash
# SIZE-01-S05 and SPLIT-01-S05 automatically, in the real game (Minecraft 26.3, Fabric client game test, headless via weston):
#  1. Basis: the game builds a base (catalogue houses, fields, pen, paths, cellar, bunker, bridge over a stream) into a
#     real world, the mod records it with GET /v1/box; the recording becomes basis-aus-dem-spiel.litematic and goes
#     through „Gebäude herauslösen“ (scripts/size/grossbau_verify.mjs and the browser test tests/big/basis.big.mjs).
#  2. Großbau: a real Chromium on the built website (tests/big/grossbau.big.mjs) imports the 1.45 million block city,
#     edits it in the workshop, makes a project, exports it and sends it over the Weltkarte to the real mod in the game.
#     Game and browser measure time, frame/tick gaps and memory.
# Needs JDK 25, weston, `npm run build` (dist and dist-web) and network to the Fabric/Mojang servers on the first run.
# Optional: BAUPLANER_KEEP=<dir> keeps the work folder (game.log, pictures, measurements, recorded base).
# Not part of `npm run check` (about 10 minutes). `npm run test:grossbau` runs it.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
weston_pid= web_pid= gradle_pid=
cleanup() {
  set +e
  [ -n "$web_pid" ] && kill "$web_pid" 2>/dev/null
  [ -n "$weston_pid" ] && kill "$weston_pid" 2>/dev/null
  rm -rf "$work/xdg"
  [ -n "${BAUPLANER_KEEP:-}" ] && { mkdir -p "$BAUPLANER_KEEP"; cp -r "$work"/. "$BAUPLANER_KEEP"; }
  rm -rf "$work"
}
trap cleanup EXIT

node scripts/size/big_build.mjs "$work"
node scripts/size/grossbau_verify.mjs prepare "$work"
echo '{}' >"$work/grossbau.json"
if [ -z "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
  command -v weston >/dev/null || { echo "Kein Bildschirm und kein weston: sudo apt-get install weston" >&2; exit 2; }
  export XDG_RUNTIME_DIR="$work/xdg" WAYLAND_DISPLAY=bauplaner-test SDL_VIDEO_DRIVER=wayland
  mkdir -m 700 "$XDG_RUNTIME_DIR"
  weston --backend=headless --renderer=gl --socket="$WAYLAND_DISPLAY" --width=1280 --height=720 >"$work/weston.log" 2>&1 &
  weston_pid=$!
  for _ in $(seq 50); do [ -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ] && break; sleep 0.2; done
fi
(cd mods/bauplaner-bridge && BAUPLANER_GAMETEST_DIR="$work" exec ./gradlew -q -PwithFabric :fabric-26.3:runClientGameTest --console=plain) >"$work/game.log" 2>&1 &
gradle_pid=$!
# The browser starts once the game has opened the link for it (pair-code.txt); it writes browser.json or browser-fehler.txt.
while kill -0 "$gradle_pid" 2>/dev/null && [ ! -s "$work/pair-code.txt" ]; do sleep 2; done
if [ -s "$work/pair-code.txt" ]; then
  BAUPLANER_MOD_PORT=47615 node tests/big/grossbau.big.mjs "$work" >"$work/browser.log" 2>&1 &
  web_pid=$!
fi
while kill -0 "$gradle_pid" 2>/dev/null && [ ! -s "$work/state.properties" ]; do sleep 2; done
if [ -s "$work/state.properties" ]; then
  sleep 10
  for env in /proc/[0-9]*/environ; do
    { tr '\0' '\n' <"$env"; } 2>/dev/null | grep -qx "BAUPLANER_GAMETEST_DIR=$work" && kill "$(basename "$(dirname "$env")")" 2>/dev/null
  done
  wait "$gradle_pid" 2>/dev/null || true
elif ! wait "$gradle_pid"; then
  grep -E "Bauplaner|ERROR|Exception|Caused by" "$work/game.log" | tail -40 >&2
  [ -f "$work/browser.log" ] && tail -20 "$work/browser.log" >&2
  exit 1
fi
[ -n "$web_pid" ] && { wait "$web_pid" || { tail -30 "$work/browser.log" >&2; exit 1; }; web_pid=; }
cat "$work/browser.log"
grep -F '[CHAT] [Bauplaner]' "$work/game.log" | sed 's/.*\[CHAT\] /  Spiel: /' | tail -20
node scripts/size/grossbau_verify.mjs verify "$work"
[ -s "$work/basis-aus-dem-spiel.litematic" ] && node tests/big/basis.big.mjs "$work"
