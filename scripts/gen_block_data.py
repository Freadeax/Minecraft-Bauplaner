#!/usr/bin/env python3
"""Generates the vanilla block list and the average preview colours (Blockdarstellung).

Input: the official Minecraft client jar of the profile version (not part of the
repository; e.g. ~/.minecraft/versions/26.3/26.3.jar or the download from
piston-data.mojang.com) and optionally a Litematica file whose palette adds the
property names that blockstate files do not mention (waterlogged, power …).

Output (committed, no textures or models, only facts):
  packages/voxel/src/blockRegistry.ts   block ids and property values
  apps/web/src/blockmodels/colors26.ts       average colour per block face group

Average colours are one RGB value per face group, computed from the textures
with the fixed plains tint; they cannot reproduce a texture.
Requires Pillow (dev only). Usage:
  python3 scripts/gen_block_data.py <client.jar> [<palette.json>] [--version 26.3]
"""
import io, json, sys, zipfile
from PIL import Image

ROOT = __file__.rsplit('/scripts/', 1)[0]
args = [a for a in sys.argv[1:] if not a.startswith('--')]
version = sys.argv[sys.argv.index('--version') + 1] if '--version' in sys.argv else '26.3'
jar = zipfile.ZipFile(args[0])
extra = json.load(open(args[1])) if len(args) > 1 else []
names = set(jar.namelist())

def read_json(path):
    return json.loads(jar.read(path)) if path in names else None

def strip_ns(s):
    return s.split(':', 1)[1] if ':' in s else s

# ---------------------------------------------------------------- properties
props = {}
for n in sorted(names):
    if not n.startswith('assets/minecraft/blockstates/') or not n.endswith('.json'):
        continue
    block = n.rsplit('/', 1)[1][:-5]
    d = read_json(n)
    p = props.setdefault(block, {})
    def add(k, v):
        for x in str(v).split('|'):
            p.setdefault(k, [])
            if x not in p[k]:
                p[k].append(x)
    if 'variants' in d:
        for key in d['variants']:
            if key:
                for pair in key.split(','):
                    k, v = pair.split('=')
                    add(k, v)
    else:
        def when(w):
            for k, v in w.items():
                if k in ('OR', 'AND'):
                    for sub in v:
                        when(sub)
                else:
                    add(k, v)
        for part in d['multipart']:
            if 'when' in part:
                when(part['when'])
for s in extra:
    block = strip_ns(s['id'])
    if block not in props:
        continue
    for k, v in (s.get('properties') or {}).items():
        props[block].setdefault(k, [])
        if v not in props[block][k]:
            props[block][k].append(v)

def sort_values(vs):
    if set(vs) <= {'true', 'false'}:
        vs = ['true', 'false']  # a boolean seen with one value in a sample palette
    if all(v.lstrip('-').isdigit() for v in vs):
        return sorted(vs, key=int)
    if set(vs) <= {'true', 'false'}:
        return [v for v in ('true', 'false') if v in vs]
    return vs

lines = []
for block in sorted(props):
    p = props[block]
    lines.append(block + ('|' + ';'.join(f'{k}={",".join(sort_values(p[k]))}' for k in sorted(p)) if p else ''))

# ---------------------------------------------------------------- colours
TINT = {'grass': (0x91, 0xbd, 0x59), 'foliage': (0x77, 0xab, 0x2f), 'water': (0x3f, 0x76, 0xe4)}
def tint_for(block):
    if block in ('spruce_leaves',): return (0x61, 0x99, 0x61)
    if block in ('birch_leaves',): return (0x80, 0xa7, 0x55)
    if 'water' in block or block == 'bubble_column': return TINT['water']
    if block.endswith('leaves') or block in ('vine', 'mangrove_leaves'): return TINT['foliage']
    if block in ('lily_pad',): return (0x20, 0x80, 0x30)
    if 'redstone_wire' in block: return (0xd0, 0x20, 0x10)
    if 'stem' in block: return (0xa0, 0xa0, 0x30)
    return TINT['grass']

models = {}
def model(name):
    name = strip_ns(name)
    if name in models:
        return models[name]
    m = read_json(f'assets/minecraft/models/{name}.json') or {}
    parent = model(m['parent']) if 'parent' in m else {'textures': {}, 'elements': None}
    tex = dict(parent['textures'])
    for k, v in (m.get('textures') or {}).items():
        tex[k] = v['sprite'] if isinstance(v, dict) else v
    out = {'textures': tex, 'elements': m.get('elements', parent['elements'])}
    models[name] = out
    return out

def resolve(tex, ref, depth=0):
    while ref.startswith('#') and depth < 20:
        ref = tex.get(ref[1:], ''); depth += 1
    return strip_ns(ref) if ref and not ref.startswith('#') else None

images = {}
def avg(texture, tint):
    key = (texture, tint)
    if key in images:
        return images[key]
    path = f'assets/minecraft/textures/{texture}.png'
    if path not in names:
        images[key] = None; return None
    im = Image.open(io.BytesIO(jar.read(path))).convert('RGBA')
    w, h = im.size
    im = im.crop((0, 0, w, min(w, h)))  # first animation frame
    r = g = b = a = 0
    for (pr, pg, pb, pa) in (im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()):
        r += pr * pa; g += pg * pa; b += pb * pa; a += pa
    if a == 0:
        images[key] = None; return None
    c = [r / a, g / a, b / a]
    if tint:
        c = [c[i] * tint[i] / 255 for i in range(3)]
    images[key] = (c, a / (255 * im.size[0] * im.size[1]))
    return images[key]

def default_models(d):
    if 'variants' in d:
        v = next(iter(d['variants'].values()))
        return [(v[0] if isinstance(v, list) else v)]
    out = []
    for part in d['multipart']:
        a = part['apply']
        out.append(a[0] if isinstance(a, list) else a)
    return out

def parents(name, depth=0):
    name = strip_ns(name)
    m = read_json(f'assets/minecraft/models/{name}.json') or {}
    return [name] + (parents(m['parent'], depth + 1) if 'parent' in m and depth < 30 else [])

def rot_box(b, xq, yq):
    pts = [(x, y, z) for x in (b[0], b[3]) for y in (b[1], b[4]) for z in (b[2], b[5])]
    out = []
    for (x, y, z) in pts:
        x, y, z = x - 8, y - 8, z - 8
        for _ in range(xq): y, z = z, -y
        for _ in range(yq): x, z = -z, x
        out.append((x + 8, y + 8, z + 8))
    return [min(p[0] for p in out), min(p[1] for p in out), min(p[2] for p in out), max(p[0] for p in out), max(p[1] for p in out), max(p[2] for p in out)]

def shape_of(block, d):
    """Silhouette class of the default state: x cross plant, c crop, p potted plant, b<box> (16ths) or '' full."""
    ref = default_models(d)[0]
    chain = parents(ref['model'])
    if any(c in ('block/flower_pot_cross', 'block/tinted_flower_pot_cross') for c in chain): return 'p'
    if any(c in ('block/cross', 'block/tinted_cross', 'block/cross_emissive') for c in chain): return 'x'
    if any(c in ('block/crop', 'block/stem_growth0') for c in chain) or any(c.startswith('block/stem_growth') for c in chain): return 'c'
    els = model(ref['model'])['elements']
    if not els: return ''
    b = [min(e['from'][0] for e in els), min(e['from'][1] for e in els), min(e['from'][2] for e in els),
         max(e['to'][0] for e in els), max(e['to'][1] for e in els), max(e['to'][2] for e in els)]
    b = [max(0, min(16, round(v))) for v in rot_box(b, (ref.get('x', 0) // 90) % 4, (ref.get('y', 0) // 90) % 4)]
    if b == [0, 0, 0, 16, 16, 16]: return ''
    return 'b' + '.'.join(str(v) for v in b)

def hexc(c):
    return '%02x%02x%02x' % tuple(max(0, min(255, round(x))) for x in c)

colours = []
for block in sorted(props):
    d = read_json(f'assets/minecraft/blockstates/{block}.json')
    groups = {'up': [], 'side': [], 'down': []}
    for ref in default_models(d):
        m = model(ref['model'])
        tex = m['textures']
        for e in m['elements'] or []:
            f, t = e['from'], e['to']
            for face, spec in e.get('faces', {}).items():
                tx = resolve(tex, spec['texture'])
                if not tx:
                    continue
                tint = tint_for(block) if 'tintindex' in spec else None
                res = avg(tx, tint)
                if not res:
                    continue
                c, cover = res
                dims = {'up': (t[0]-f[0]) * (t[2]-f[2]), 'down': (t[0]-f[0]) * (t[2]-f[2]),
                        'north': (t[0]-f[0]) * (t[1]-f[1]), 'south': (t[0]-f[0]) * (t[1]-f[1]),
                        'east': (t[2]-f[2]) * (t[1]-f[1]), 'west': (t[2]-f[2]) * (t[1]-f[1])}[face]
                g = face if face in ('up', 'down') else 'side'
                groups[g].append((c, max(dims, 1) * cover))
    if not any(groups.values()):
        m = model(default_models(d)[0]['model'])
        p = resolve(m['textures'], '#particle')
        res = avg(p, TINT['water'] if block in ('water', 'bubble_column') else None) if p else None
        if not res:
            continue
        for g in groups:
            groups[g].append((res[0], 1))
    def mean(lst):
        wsum = sum(w for _, w in lst)
        return [sum(c[i] * w for c, w in lst) / wsum for i in range(3)]
    side = groups['side'] or groups['up'] or groups['down']
    up = groups['up'] or side
    down = groups['down'] or side
    cs = [hexc(mean(up)), hexc(mean(side)), hexc(mean(down))]
    shape = shape_of(block, d)
    colours.append(f'{block}={cs[0] if cs[0] == cs[1] == cs[2] else ",".join(cs)}{"@" + shape if shape else ""}')

with open(f'{ROOT}/packages/voxel/src/blockRegistry.ts', 'w') as out:
    out.write(f'''// Generated by scripts/gen_block_data.py from the official {version} client jar (blockstates) and a
// Litematica palette (additional property names). Facts only: block ids and property values.
// Do not edit by hand; regenerate for a new profile version.

/** Vanilla blocks of the profile version, one per line: `name|prop=v1,v2;prop2=…`. */
const DATA = `{chr(10).join(lines)}`;

export const BLOCK_REGISTRY_VERSION = 'java-{version}';

let parsed: ReadonlyMap<string, Readonly<Record<string, readonly string[]>>> | null = null;
function registry(): ReadonlyMap<string, Readonly<Record<string, readonly string[]>>> {{
  if (parsed) return parsed;
  const map = new Map<string, Record<string, readonly string[]>>();
  for (const line of DATA.split('\\n')) {{
    const [name, spec] = line.split('|') as [string, string | undefined];
    const props: Record<string, readonly string[]> = {{}};
    if (spec) for (const part of spec.split(';')) {{ const [k, v] = part.split('=') as [string, string]; props[k] = v.split(','); }}
    map.set(`minecraft:${{name}}`, props);
  }}
  return parsed = map;
}}

/** All vanilla block ids of the profile version (namespaced, sorted). */
export function vanillaBlockIds(): readonly string[] {{ return [...registry().keys()]; }}
/** Known property values of a vanilla block; undefined for unknown ids. Values seen only in a sample palette may be incomplete. */
export function vanillaBlockProperties(id: string): Readonly<Record<string, readonly string[]>> | undefined {{ return registry().get(id); }}
export function isVanillaBlock(id: string): boolean {{ return registry().has(id); }}
''')

with open(f'{ROOT}/apps/web/src/blockmodels/colors26.ts', 'w') as out:
    out.write(f'''// Generated by scripts/gen_block_data.py: one average colour per face group (top, sides, bottom)
// of every vanilla {version} block (plains tint) and a coarse silhouette class of its default
// state (cross plant, crop, potted plant or bounding box in 1/16). Used when no texture
// source is loaded. Do not edit by hand.

const DATA = `{chr(10).join(colours)}`;

export interface BlockLook {{
  readonly top: string;
  readonly side: string;
  readonly bottom: string;
  /** '' full block, 'x' cross plant, 'c' crop, 'p' potted plant, 'b' box. */
  readonly shape: '' | 'x' | 'c' | 'p' | 'b';
  /** Box from/to in 1/16 for shape 'b'. */
  readonly box?: readonly number[];
}}
let parsed: Map<string, BlockLook> | null = null;
/** Average colours (`#rrggbb`) and silhouette of a vanilla block; undefined for unknown names (without namespace). */
export function blockLook(name: string): BlockLook | undefined {{
  if (!parsed) {{
    parsed = new Map();
    for (const line of DATA.split('\\n')) {{
      const [key, rest] = line.split('=') as [string, string];
      const [colours, shape = ''] = rest.split('@') as [string, string | undefined];
      const c = colours.split(',').map(v => `#${{v}}`);
      const kind = (shape[0] ?? '') as BlockLook['shape'];
      parsed.set(key, {{ top: c[0]!, side: c[1] ?? c[0]!, bottom: c[2] ?? c[0]!, shape: kind, ...(kind === 'b' && {{ box: shape.slice(1).split('.').map(Number) }}) }});
    }}
  }}
  return parsed.get(name);
}}
''')
print(len(lines), 'blocks', len(colours), 'colours')
