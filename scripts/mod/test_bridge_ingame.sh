#!/usr/bin/env bash
# Real-game test of the Fabric bridge (GAME-02): starts Minecraft 26.3 with the mod (Fabric client
# game test), builds a website-exported plan with one wrong and one missing block, lets the mod record
# it via typed chat commands and compares the recording like the website does.
# Needs JDK 25, network to maven.fabricmc.net and the Mojang servers, a prior `npm run build:core`
# and a display: an existing DISPLAY/WAYLAND_DISPLAY or, headless, weston (Mesa llvmpipe). Xvfb does
# not work: Minecraft 26.3 asks for an sRGB-capable GL visual that Xvfb's GLX does not offer.
# Optional: BAUPLANER_MODPACK_MODS=<mods folder of a Fabric instance> runs the same test as a production
# start with the built .jar plus every mod of that folder (compatibility with a real modpack).
# Optional: BAUPLANER_SHADERPACK=<shaderpack .zip> (with BAUPLANER_MODPACK_MODS containing Iris) runs the
# modpack test with that shaderpack switched on, so the hologram is checked under shaders too.
# Optional: BAUPLANER_KEEP=<dir> keeps the work folder (game.log, hologramm.png, menue.png, scan) there.
# Optional: BAUPLANER_BROWSER=0 skips the browser part (real planner against this game, block 3 acceptance).
# Optional: BAUPLANER_MC=26.4 runs the same test with the 26.4 adapter (fabric-26.4, snapshot preparation for GAME-11).
# Not part of `npm run check` (several minutes, large downloads on the first run).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
weston_pid=
cleanup() { [ -n "$weston_pid" ] && kill "$weston_pid" 2>/dev/null; [ -n "${BAUPLANER_KEEP:-}" ] && cp -r "$work" "$BAUPLANER_KEEP"; rm -rf "$work"; }
trap cleanup EXIT

node scripts/mod/bridge_gametest.mjs prepare "$work"
# Optional BAUPLANER_ROOM=<running team room, e.g. http://127.0.0.1:8787 from npx wrangler dev>: LINK-07 step (mod ↔ room without a server file).
[ -n "${BAUPLANER_ROOM:-}" ] && node scripts/mod/bridge_room_prepare.mjs "$work" "$BAUPLANER_ROOM"
if [ -z "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
  command -v weston >/dev/null || { echo "Kein Bildschirm und kein weston: sudo apt-get install weston" >&2; exit 2; }
  # SDL 3 waits forever in SDL_CreateWindow when libdecor has no plugin (headless weston): no decorations.
  export XDG_RUNTIME_DIR="$work/xdg" WAYLAND_DISPLAY=bauplaner-test SDL_VIDEO_DRIVER=wayland SDL_VIDEO_WAYLAND_ALLOW_LIBDECOR=0
  mkdir -m 700 "$XDG_RUNTIME_DIR"
  weston --backend=headless --renderer=gl --socket="$WAYLAND_DISPLAY" --width=1280 --height=720 >"$work/weston.log" 2>&1 &
  weston_pid=$!
  for _ in $(seq 50); do [ -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ] && break; sleep 0.2; done
fi
mc=${BAUPLANER_MC:-26.3}
case "$mc" in
  26.3) switch=-PwithFabric ;;
  26.4) switch=-PwithFabric264 ;;
  *) echo "Unbekannte Minecraft-Version $mc (26.3 oder 26.4)" >&2; exit 2 ;;
esac
gradle_args=("$switch" ":fabric-$mc:runClientGameTest")
[ -n "${BAUPLANER_MODPACK_MODS:-}" ] && gradle_args=("$switch" "-PmodpackMods=$BAUPLANER_MODPACK_MODS" ":fabric-$mc:runModpackGameTest")
modpack_run=mods/bauplaner-bridge/fabric-$mc/build/run/modpackGameTest
if [ -n "${BAUPLANER_MODPACK_MODS:-}" ]; then
  mkdir -p "$modpack_run/config" "$modpack_run/shaderpacks"
  if [ -n "${BAUPLANER_SHADERPACK:-}" ]; then
    cp "$BAUPLANER_SHADERPACK" "$modpack_run/shaderpacks/"
    printf 'enableShaders=true\nshaderPack=%s\n' "$(basename "$BAUPLANER_SHADERPACK")" >"$modpack_run/config/iris.properties"
  else
    printf 'enableShaders=false\n' >"$modpack_run/config/iris.properties"
  fi
fi
# Block 3: the real planner in a browser against this game (scripts/mod/bridge_browser.mjs, needs `npm run build`).
# BAUPLANER_BROWSER=0 skips it; the game test then goes on without waiting.
browser_pid=
if [ "${BAUPLANER_BROWSER:-1}" != 0 ] && [ -f dist-web/index.html ]; then
  node scripts/mod/bridge_browser.mjs "$work" >"$work/browser.log" 2>&1 &
  browser_pid=$!
else
  : >"$work/browser-off"
fi
# Some modpack mods keep the game process alive after the test closed the world, so the test counts
# as finished once the game test has handed back its results (state.properties is written last).
(cd mods/bauplaner-bridge && BAUPLANER_GAMETEST_DIR="$work" exec ./gradlew -q "${gradle_args[@]}" --console=plain) >"$work/game.log" 2>&1 &
gradle_pid=$!
while kill -0 "$gradle_pid" 2>/dev/null && [ ! -s "$work/state.properties" ]; do sleep 2; done
if [ -s "$work/state.properties" ]; then
  sleep 10
  for env in /proc/[0-9]*/environ; do
    { tr '\0' '\n' <"$env"; } 2>/dev/null | grep -qx "BAUPLANER_GAMETEST_DIR=$work" && kill "$(basename "$(dirname "$env")")" 2>/dev/null
  done
  wait "$gradle_pid" 2>/dev/null || true
elif ! wait "$gradle_pid"; then
  grep -E "Build Studio|ERROR|Exception|Caused by" "$work/game.log" | tail -40 >&2; exit 1
fi
[ -n "$browser_pid" ] && { wait "$browser_pid" 2>/dev/null || true; cat "$work/browser.log"; }
grep -F '[CHAT] [Build Studio]' "$work/game.log" | sed 's/.*\[CHAT\] /  Spiel: /'
node scripts/mod/bridge_gametest.mjs verify "$work"
