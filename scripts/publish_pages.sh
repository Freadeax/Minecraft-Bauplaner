#!/usr/bin/env bash
# Publishes the checked static build of the current main commit to gh-pages.
# No GitHub Actions: run locally right after pushing main (see HOSTING.md).
#   1. requires a clean work tree whose HEAD equals origin/main
#   2. builds dist-web from exactly that commit
#   3. commits only dist-web on top of origin/gh-pages (never force)
#   4. refuses to replace a newer deployed main commit with an older build
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

git fetch -q origin main gh-pages
head=$(git rev-parse HEAD)
if [ "$head" != "$(git rev-parse origin/main)" ]; then
  echo "Abbruch: HEAD ($head) ist nicht origin/main. Erst main integrieren und pushen." >&2; exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "Abbruch: Arbeitsbaum nicht sauber; nur committete, gepushte Stände veröffentlichen." >&2; exit 1
fi

LMNT_SOURCE_SHA=$head npm run -s build:web >/dev/null
node --test tests/pages.test.mjs >/dev/null

for attempt in 1 2 3; do
  base=$(git rev-parse origin/gh-pages)
  deployed=$(git show "$base:deployment.json" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).sourceCommit)}catch{console.log("")}})')
  if [ "$deployed" = "$head" ]; then echo "gh-pages enthält bereits $head."; exit 0; fi
  if [ -n "$deployed" ] && git cat-file -e "$deployed" 2>/dev/null && git merge-base --is-ancestor "$head" "$deployed"; then
    echo "Abbruch: gh-pages enthält bereits den neueren Stand $deployed." >&2; exit 1
  fi
  index=$(mktemp); rm -f "$index"
  GIT_INDEX_FILE=$index git --work-tree=dist-web add -A -f .
  tree=$(GIT_INDEX_FILE=$index git write-tree); rm -f "$index"
  commit=$(git commit-tree "$tree" -p "$base" -m "deploy: main ${head:0:7}" -m "Static Pages artifact built locally from main $head. No GitHub Actions.")
  if git push -q origin "$commit:refs/heads/gh-pages"; then
    echo "Veröffentlicht: gh-pages $commit (Quelle $head). Liveprüfung: https://freadeax.github.io/Minecraft-Bauplaner/deployment.json"
    exit 0
  fi
  echo "gh-pages wurde zwischenzeitlich geändert, neuer Versuch ($attempt) …" >&2
  git fetch -q origin gh-pages
done
echo "Abbruch: gh-pages konnte nicht ohne Force aktualisiert werden." >&2; exit 1
