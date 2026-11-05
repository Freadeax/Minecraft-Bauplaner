#!/usr/bin/env bash
# Tests of the game bridge core (B8) plus the cross-language format check.
# Needs a JDK ≥ 21, Gradle (or mods/bauplaner-bridge/gradlew) and a prior `npm run build:core`.
# Not part of `npm run check`, because Java is not required for the website.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
gradle_cmd=(gradle)
[ -x mods/bauplaner-bridge/gradlew ] && gradle_cmd=(./gradlew)
(cd mods/bauplaner-bridge && "${gradle_cmd[@]}" -q :core:test :core:testClasses --console=plain)
cp="mods/bauplaner-bridge/core/build/classes/java/main:mods/bauplaner-bridge/core/build/classes/java/test"
node scripts/mod/bridge_crosscheck.mjs "$cp"
# "Senden" from the world map: what the mod's PlanModel reads equals the planner's world, block by block.
(cd mods/bauplaner-bridge && "${gradle_cmd[@]}" -q :mod-core:testClasses --console=plain)
modcp="mods/bauplaner-bridge/mod-core/build/classes/java/main:mods/bauplaner-bridge/mod-core/build/classes/java/test:mods/bauplaner-bridge/core/build/classes/java/main"
node scripts/mod/bridge_sendcheck.mjs "$modcp" ${BAUPLANER_SENDCHECK_FILE:-}
