"""Check local Markdown file links and that no GitHub Actions workflows exist."""
from pathlib import Path
import os
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
errors = []
workflow_dir = ROOT / '.github/workflows'
if workflow_dir.exists() and any(p.is_file() for p in workflow_dir.rglob('*')):
    errors.append('GitHub Actions are disabled for this project; remove workflow files.')
sources = []
for directory, subdirectories, files in os.walk(ROOT):
    subdirectories[:] = [name for name in subdirectories if name not in {'.git', 'node_modules', 'dist', '.venv'}]
    sources.extend(Path(directory) / name for name in files if name.endswith('.md'))
for source in sources:
    for target in re.findall(r'\]\(([^)]+)\)', source.read_text(encoding='utf-8')):
        if '://' in target or target.startswith('#'):
            continue
        path = (source.parent / target.split('#')[0]).resolve()
        if not path.is_relative_to(ROOT) or not (path.is_file() or path.is_dir()):
            errors.append(f'{source.relative_to(ROOT)}: missing local target {target}')
if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print(f'Documentation links valid in {len(sources)} Markdown files.')
