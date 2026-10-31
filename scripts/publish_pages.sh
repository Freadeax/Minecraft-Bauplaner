#!/usr/bin/env bash
# Canonical entry point: Pages now serves main/(root).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
exec bash scripts/publish_main_pages.sh
