#!/usr/bin/env bash
# Multiplayer acceptance with the real game (Roadmap block 4, GAME-02 Mehrspieler, TEAMBAU-06 with the mod, LINK-12):
# Minecraft 26.3 with the Fabric mod (client game test, PaperMultiplayerTest.java) joins a real Paper server with the
# plugin (scripts/mod/bridge_multiplayer_client.mjs) and a team room. Needs JDK 25, a display or weston (see
# test_bridge_ingame.sh), `npm run build:core`, network to maven.fabricmc.net, fill.papermc.io and the Mojang servers.
# Starts its own team room with `npx wrangler dev` unless BAUPLANER_ROOM is set. Not part of `npm run check`.
# Optional: BAUPLANER_KEEP=<dir> keeps the work folder (game.log, server log, screenshot) there.
# Usage: scripts/mod/test_multiplayer_client.sh [paper version]   (default 26.3)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
work=$(mktemp -d)
pids=()
weston_pid=
cleanup() {
  for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done
  [ -n "$weston_pid" ] && kill "$weston_pid" 2>/dev/null
  [ -n "${BAUPLANER_KEEP:-}" ] && cp -r "$work" "$BAUPLANER_KEEP"
  rm -rf "$work"
}
trap cleanup EXIT
version=${1:-26.3}
java25=${BAUPLANER_JAVA25:-$(ls -d /usr/lib/jvm/java-25-openjdk-*/bin/java 2>/dev/null | head -1)}
: "${java25:?JDK 25 fehlt}"
(cd mods/bauplaner-bridge && ./gradlew -q -PwithPaper :paper:build -x test --console=plain)
jar=mods/bauplaner-bridge/paper/build/libs/bauplaner-bridge-paper-$(cat mods/bauplaner-bridge/VERSION).jar
room=${BAUPLANER_ROOM:-}
if [ -z "$room" ]; then
  port=$((8900 + RANDOM % 90))
  (cd services/team-room && exec npx -y wrangler@4 dev --port "$port" --ip 127.0.0.1 >"$work/wrangler.log" 2>&1) & pids+=($!)
  for _ in $(seq 1 120); do grep -q "Ready on" "$work/wrangler.log" 2>/dev/null && break; sleep 1; done
  grep -q "Ready on" "$work/wrangler.log" || { cat "$work/wrangler.log"; echo "Team-Raum (wrangler dev) startet nicht"; exit 1; }
  room=http://127.0.0.1:$port
fi
node scripts/mod/bridge_multiplayer_client.mjs "$work" "$jar" "$version" "$java25" "$room" > >(tee "$work/driver.log") 2>&1 &
driver=$!; pids+=($driver)
for _ in $(seq 1 600); do [ -s "$work/mp-paper.txt" ] && break; kill -0 "$driver" 2>/dev/null || break; sleep 1; done
[ -s "$work/mp-paper.txt" ] || { echo "Paper-Server startet nicht"; wait "$driver"; exit 1; }
if [ -z "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
  command -v weston >/dev/null || { echo "Kein Bildschirm und kein weston: sudo apt-get install weston" >&2; exit 2; }
  export XDG_RUNTIME_DIR="$work/xdg" WAYLAND_DISPLAY=bauplaner-test SDL_VIDEO_DRIVER=wayland
  mkdir -m 700 "$XDG_RUNTIME_DIR"
  weston --backend=headless --renderer=gl --socket="$WAYLAND_DISPLAY" --width=1280 --height=720 >"$work/weston.log" 2>&1 &
  weston_pid=$!
  for _ in $(seq 50); do [ -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ] && break; sleep 0.2; done
fi
(cd mods/bauplaner-bridge && BAUPLANER_GAMETEST_DIR="$work" BAUPLANER_PAPER="$(tr -d '\n' <"$work/mp-paper.txt")" exec ./gradlew -q -PwithFabric :fabric-26.3:runClientGameTest --console=plain) >"$work/game.log" 2>&1 || {
  grep -E "Bauplaner|ERROR|Exception|Caused by" "$work/game.log" | tail -40 >&2; [ -s "$work/mp-fehler.txt" ] && cat "$work/mp-fehler.txt" >&2; exit 1; }
wait "$driver"
grep -E '\[CHAT\]|\(bauplaner\) \[Bauplaner\]' "$work/game.log" | sed -E 's/.*(\[CHAT\]|\(bauplaner\)) /  Spiel: /'
node --input-type=module -e '
import { readFileSync } from "node:fs";
const log = readFileSync(process.argv[1], "utf8");
// Chat lines and the messages of the mod (toasts/notifications are logged as „(bauplaner) [Bauplaner] …“).
const chat = log.split("\n").filter(l => l.includes("[CHAT]") || l.includes("(bauplaner) [Bauplaner]")).join("\n");
const need = [
  [/Teamkanal für diesen Server erlaubt/, "Teamkanal erlaubt"],
  [/Server-Plugin: Mit dem Team-Raum von „Burg am See“ verbunden/, "Mod übergibt den Raum ans Plugin (LINK-12)"],
  [/Abschnitt 1 „Fundament“ übernommen – an den Server geschickt/, "Abschnitt über die Mod genommen"],
  [/Deine Abschnitte: 1 „Fundament“ \(in Arbeit\)/, "Serverstand zurück in der Mod"],
  [/1 in Arbeit[^\n]*vom Server/, "Teamstand live vom Plugin"],
  [/: 3 Blöcke gesetzt/, "Baunachweis zählt die Blöcke des echten Spielers"],
];
const missing = need.filter(([re]) => !re.test(chat)).map(([, what]) => what);
if (missing.length) { console.error("Fehlt im Spielchat: " + missing.join(", ")); process.exit(1); }
console.log("  Spielchat: " + need.map(([, w]) => w).join(" · "));
' "$work/game.log"
