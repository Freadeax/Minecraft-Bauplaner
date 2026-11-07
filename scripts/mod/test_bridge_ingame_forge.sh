#!/usr/bin/env bash
# Real-game test of the NeoForge and Forge bridges (GAME-05): starts a Minecraft 26.3 client with the mod
# and a test-only mod (client-26.3/src/gametest, ClientScenario), creates a flat test world, builds a
# website-exported plan with one wrong and one missing block, sends the /bauplaner commands and compares
# the recording like the website does (scripts/mod/bridge_gametest.mjs, same check as the Fabric test).
# Usage: scripts/mod/test_bridge_ingame_forge.sh neoforge|forge
# Needs JDK 25, network to maven.neoforged.net / maven.minecraftforge.net and the Mojang servers, a prior
# `npm run build:core` and a display (DISPLAY/WAYLAND_DISPLAY or, headless, weston; Xvfb does not work
# for Minecraft 26.3). Not part of `npm run check` (several minutes, large downloads on the first run).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
loader=${1:-}
case "$loader" in
  neoforge) gradle_args=(-PwithNeoForge :neoforge-26.3:runGameTestClient); game_dir=mods/bauplaner-bridge/neoforge-26.3/build/run/gametest ;;
  forge) gradle_args=(-PwithForge -PbauplanerGameTest :forge-26.3:runClient); game_dir=mods/bauplaner-bridge/forge-26.3/run ;;
  *) echo "Aufruf: $0 neoforge|forge" >&2; exit 2 ;;
esac
work=$(mktemp -d)
weston_pid=
cleanup() { [ -n "$weston_pid" ] && kill "$weston_pid" 2>/dev/null; [ -z "${BAUPLANER_KEEP:-}" ] && rm -rf "$work"; return 0; }
trap cleanup EXIT

node scripts/mod/bridge_gametest.mjs prepare "$work"
if [ -z "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
  command -v weston >/dev/null || { echo "Kein Bildschirm und kein weston: sudo apt-get install weston" >&2; exit 2; }
  export XDG_RUNTIME_DIR="$work/xdg" WAYLAND_DISPLAY=bauplaner-test SDL_VIDEO_DRIVER=wayland SDL_VIDEO_WAYLAND_ALLOW_LIBDECOR=0
  mkdir -m 700 "$XDG_RUNTIME_DIR"
  weston --backend=headless --renderer=gl --socket="$WAYLAND_DISPLAY" --width=1280 --height=720 >"$work/weston.log" 2>&1 &
  weston_pid=$!
  for _ in $(seq 50); do [ -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ] && break; sleep 0.2; done
fi
# Headless (weston) the window gets no frame callbacks, so a swap with vsync blocks forever; Forge's early
# loading window is turned off for the same reason. Only the test game directories are touched.
mkdir -p "$game_dir/config"
if [ -f "$game_dir/options.txt" ]; then sed -i 's/^enableVsync:.*/enableVsync:false/' "$game_dir/options.txt"; else echo "enableVsync:false" >"$game_dir/options.txt"; fi
[ "$loader" = forge ] && printf 'earlyWindowControl = false\nversionCheck = false\n' >"$game_dir/config/fml.toml"
status=0
(cd mods/bauplaner-bridge && BAUPLANER_GAMETEST_DIR="$work" timeout --kill-after=20 "${BAUPLANER_TIMEOUT:-1200}" ./gradlew -q "${gradle_args[@]}" --console=plain) >"$work/game.log" 2>&1 || status=$?
if [ "$(cat "$work/done.txt" 2>/dev/null)" != "ok" ]; then
  cat "$work/error.txt" 2>/dev/null >&2 || true
  grep -E "Build Studio|ERROR|Exception|Caused by|went wrong" -A2 "$work/game.log" | tail -40 >&2 || true
  echo "Spieltest $loader fehlgeschlagen (Gradle-Status $status, Protokoll $work/game.log)." >&2
  BAUPLANER_KEEP=1; exit 1
fi
grep -F '[CHAT] [Build Studio]' "$work/game.log" | sed 's/.*\[CHAT\] /  Spiel: /' || true
node scripts/mod/bridge_gametest.mjs verify "$work"
