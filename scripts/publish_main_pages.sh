#!/usr/bin/env bash
# Active publisher: Pages main/(root), verified from the GitHub internal build log on 2026-10-31.
# Builds source C, then publishes artifact-only child D on main. Never force.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
if [ "$(git branch --show-current)" != main ]; then echo 'Abbruch: main muss ausgecheckt sein.' >&2; exit 1; fi
if [ -n "$(git status --porcelain)" ]; then echo 'Abbruch: Arbeitsbaum nicht sauber.' >&2; exit 1; fi
git fetch -q origin main
source=$(git rev-parse HEAD)
if [ "$source" != "$(git rev-parse origin/main)" ]; then echo 'Abbruch: HEAD ist nicht origin/main; erst regulär integrieren.' >&2; exit 1; fi

# Core tests, strict types, web build and artifact/documentation checks.
LMNT_SOURCE_SHA=$source npm run check
index=$(mktemp); rm -f "$index"
trap 'rm -f "$index" "$index.lock"' EXIT
tree=$(node scripts/prepare_main_pages.mjs "$source" dist-web "$index")
# A changing source/remote invalidates the build rather than publishing stale code.
if [ "$source" != "$(git rev-parse HEAD)" ] || [ -n "$(git status --porcelain)" ]; then echo 'Abbruch: Quellstand wurde während des Builds verändert.' >&2; exit 1; fi
git fetch -q origin main
if [ "$source" != "$(git rev-parse origin/main)" ]; then echo 'Abbruch: main wurde zwischenzeitlich verändert; neuen Stand integrieren und neu bauen.' >&2; exit 1; fi
commit=$(git commit-tree "$tree" -p "$source" -m "deploy: main ${source:0:7} in repository root" -m "Artifact-only child of checked source $source. Source files retained. No custom GitHub Actions.")
# The normal non-force push rejects every competing main update.
git push origin "$commit:refs/heads/main"
# Keep the caller's checkout coherent without resetting any concurrent edits.
if [ "$source" = "$(git rev-parse HEAD)" ] && [ -z "$(git status --porcelain)" ]; then
  git merge --ff-only "$commit"
else
  echo "Main veröffentlicht ($commit), lokaler Checkout inzwischen verändert; kein Reset ausgeführt." >&2
fi
echo "Main-Artefaktcommit: $commit; geprüfter Quellcommit: $source."
echo 'Liveprüfung noch erforderlich: https://freadeax.github.io/Minecraft-Bauplaner/deployment.json'
