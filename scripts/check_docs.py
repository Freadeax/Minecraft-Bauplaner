"""Check local Markdown file links and the GPT project instruction limit."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
workflow_dir = ROOT / '.github/workflows'
if workflow_dir.exists() and any(p.is_file() for p in workflow_dir.rglob('*')):
    errors.append('GitHub Actions are disabled for this project; remove workflow files.')
for source in ROOT.rglob('*.md'):
    for target in re.findall(r'\]\(([^)]+)\)', source.read_text(encoding='utf-8')):
        if '://' in target or target.startswith('#'):
            continue
        path = (source.parent / target.split('#')[0]).resolve()
        if not path.is_relative_to(ROOT) or not path.is_file():
            errors.append(f'{source.relative_to(ROOT)}: missing local target {target}')
instructions = ROOT / 'docs/project/GPT_PROJECT_INSTRUCTIONS.md'
length = len(instructions.read_text(encoding='utf-8'))
if length > 8000:
    errors.append(f'GPT project instructions exceed 8000 characters: {length}')
if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print(f'Documentation links valid; GPT instructions: {length}/8000 characters.')
