#!/usr/bin/env python3
"""Independent region-file fixture for the world excerpt reader (WORLD-IMPORT-01).

Written from the format description in docs/architecture/welt/WORLD_IMPORT.md, without
the TypeScript reader: own NBT writer, own section packing, own LZ4 encoder and
XXH32. Writes a small world folder plus the expected blocks as JSON.

    python3 scripts/fixtures/make_region_fixture.py <out-dir>

Contents (world coordinates):
  r.0.0.mca
    chunk 0/0   26.x layout, zlib, DataVersion 5023: stone floor y=64, 16 wool
                colours + stairs + chest (20 palette entries, 5 bits) at y=65/66,
                deepslate at y=-60, bare default ids and mixed {"": id} lists
    chunk 1/0   1.21 layout ({Name, Properties}), gzip, DataVersion 3953
    chunk 2/0   26.x layout, LZ4 (lz4-java block stream: one LZ4 block, one raw block)
    chunk 0/1   uncompressed, Status minecraft:noise (not fully generated)
    chunk 1/1   absent (never generated)
  r.-1.-1.mca
    chunk -1/-1 1.17 layout (Level, Sections, Palette/BlockStates), zlib, DataVersion 2730
"""
import gzip, json, math, os, struct, sys, zlib

# ------------------------------------------------------------------ NBT writer
END, BYTE, SHORT, INT, LONG, FLOAT, DOUBLE, BARR, STRING, LIST, COMPOUND, IARR, LARR = range(13)

def s_utf(s):
    b = s.encode('utf-8')  # fixture strings are ASCII, identical to modified UTF-8
    return struct.pack('>H', len(b)) + b

class Tag:
    def __init__(self, t, v, elem=None):
        self.t, self.v, self.elem = t, v, elem

def payload(tag):
    t, v = tag.t, tag.v
    if t == BYTE: return struct.pack('>b', v)
    if t == SHORT: return struct.pack('>h', v)
    if t == INT: return struct.pack('>i', v)
    if t == LONG: return struct.pack('>q', v)
    if t == STRING: return s_utf(v)
    if t == LARR: return struct.pack('>i', len(v)) + b''.join(struct.pack('>q', x) for x in v)
    if t == LIST:
        return struct.pack('>bi', tag.elem if v else END, len(v)) + b''.join(payload(x) for x in v)
    if t == COMPOUND:
        out = b''
        for k, x in v.items():
            out += struct.pack('>b', x.t) + s_utf(k) + payload(x)
        return out + b'\x00'
    raise ValueError(t)

def root(c): return struct.pack('>b', COMPOUND) + s_utf('') + payload(c)
def C(**kw): return Tag(COMPOUND, kw)
def Cd(d): return Tag(COMPOUND, d)
def S(v): return Tag(STRING, v)
def I(v): return Tag(INT, v)
def B(v): return Tag(BYTE, v)
def L(v): return Tag(LONG, v)
def Lst(elem, items): return Tag(LIST, items, elem)

# ------------------------------------------------------------------ blocks
def state(text):
    """'minecraft:x[a=b,c=d]' -> (id, {props})."""
    if '[' in text:
        bid, rest = text.split('[', 1)
        props = dict(p.split('=') for p in rest[:-1].split(','))
    else:
        bid, props = text, {}
    return bid, props

def canonical(text):
    bid, props = state(text)
    return bid + ('[' + ','.join(f'{k}={props[k]}' for k in sorted(props)) + ']' if props else '')

# Default states as printed by the official 26.3 block report (the reader's table must agree).
DEFAULTS = {
    'minecraft:chest': {'facing': 'north', 'type': 'single', 'waterlogged': 'false'},
    'minecraft:oak_stairs': {'facing': 'north', 'half': 'bottom', 'shape': 'straight', 'waterlogged': 'false'},
    'minecraft:oak_log': {'axis': 'y'},
    'minecraft:deepslate': {'axis': 'y'},
}

def pack(indices, bits):
    """Non-spanning packing (1.16+): floor(64/bits) entries per long, lowest bits first."""
    per = 64 // bits
    longs = []
    for start in range(0, 4096, per):
        v = 0
        for k, idx in enumerate(indices[start:start + per]):
            v |= idx << (k * bits)
        longs.append(v - (1 << 64) if v >= 1 << 63 else v)
    return longs

def sections_of(blocks, cx, cz, min_sy, max_sy):
    """blocks: {(x,y,z): text} absolute → {sy: (palette texts, indices)} including air."""
    out = {}
    for sy in range(min_sy, max_sy + 1):
        palette, indices, seen = [], [], {}
        for i in range(4096):
            x, z, y = i & 15, (i >> 4) & 15, sy * 16 + (i >> 8)
            text = blocks.get((cx * 16 + x, y, cz * 16 + z), 'minecraft:air')
            if text not in seen:
                seen[text] = len(palette); palette.append(text)
            indices.append(seen[text])
        out[sy] = (palette, indices)
    return out

def bits_for(n): return max(4, math.ceil(math.log2(n)))

def entry_old(text):
    bid, props = state(text)
    d = {'Name': S(bid)}
    if props: d['Properties'] = Cd({k: S(v) for k, v in props.items()})
    return Cd(d)

def palette_26(texts):
    """26.x: bare id for a default state, {id, properties} otherwise; mixed lists wrap strings as {"": id}."""
    def is_default(text):
        bid, props = state(text)
        return props == DEFAULTS.get(bid, {}) or (not props and bid not in DEFAULTS)
    if all(is_default(t) for t in texts):
        return Lst(STRING, [S(state(t)[0]) for t in texts])
    items = []
    for t in texts:
        bid, props = state(t)
        if is_default(t): items.append(Cd({'': S(bid)}))
        else: items.append(Cd({'id': S(bid), 'properties': Cd({k: S(v) for k, v in props.items()})}))
    return Lst(COMPOUND, items)

def chunk_flat(blocks, cx, cz, dv, status, layout26, bes=()):
    secs = []
    for sy, (pal, idx) in sorted(sections_of(blocks, cx, cz, -4, 19).items()):
        bs = {'palette': palette_26(pal) if layout26 else Lst(COMPOUND, [entry_old(t) for t in pal])}
        if len(pal) > 1: bs['data'] = Tag(LARR, pack(idx, bits_for(len(pal))))
        secs.append(Cd({'Y': B(sy), 'block_states': Cd(bs), 'SkyLight': Tag(BARR, b'')}))
    return root(Cd({'DataVersion': I(dv), 'xPos': I(cx), 'zPos': I(cz), 'yPos': I(-4), 'Status': S(status), 'LastUpdate': L(1234),
                    'sections': Lst(COMPOUND, secs), 'block_entities': Lst(COMPOUND, list(bes)),
                    'Heightmaps': Cd({}), 'isLightOn': B(1)}))

def chunk_level(blocks, cx, cz, dv, bes=()):
    secs = [Cd({'Y': B(-1), 'SkyLight': Tag(BARR, b'')})]  # light-only section without palette
    for sy, (pal, idx) in sorted(sections_of(blocks, cx, cz, 0, 15).items()):
        if pal == ['minecraft:air']: continue
        secs.append(Cd({'Y': B(sy), 'Palette': Lst(COMPOUND, [entry_old(t) for t in pal]), 'BlockStates': Tag(LARR, pack(idx, bits_for(len(pal))))}))
    return root(Cd({'DataVersion': I(dv), 'Level': Cd({'xPos': I(cx), 'zPos': I(cz), 'Status': S('full'),
                    'Sections': Lst(COMPOUND, secs), 'TileEntities': Lst(COMPOUND, list(bes))})}))

# BARR payload helper (byte arrays are only light here)
_payload = payload
def payload(tag):  # noqa: F811 - extend with byte arrays
    if tag.t == BARR: return struct.pack('>i', len(tag.v)) + tag.v
    return _payload(tag)

# ------------------------------------------------------------------ LZ4 (lz4-java block stream)
P1, P2, P3, P4, P5 = 2654435761, 2246822519, 3266489917, 668265263, 374761393
M = 0xFFFFFFFF
def rotl(x, r): return ((x << r) | (x >> (32 - r))) & M
def xxh32(data, seed):
    n, i = len(data), 0
    if n >= 16:
        v = [(seed + P1 + P2) & M, (seed + P2) & M, seed & M, (seed - P1) & M]
        while i <= n - 16:
            for k in range(4):
                lane = struct.unpack_from('<I', data, i)[0]; i += 4
                v[k] = (rotl((v[k] + lane * P2) & M, 13) * P1) & M
        h = (rotl(v[0], 1) + rotl(v[1], 7) + rotl(v[2], 12) + rotl(v[3], 18)) & M
    else:
        h = (seed + P5) & M
    h = (h + n) & M
    while i + 4 <= n:
        h = (rotl((h + struct.unpack_from('<I', data, i)[0] * P3) & M, 17) * P4) & M; i += 4
    while i < n:
        h = (rotl((h + data[i] * P5) & M, 11) * P1) & M; i += 1
    h ^= h >> 15; h = (h * P2) & M; h ^= h >> 13; h = (h * P3) & M; h ^= h >> 16
    return h

def lz4_block(src):
    """Greedy LZ4 block encoder (hash of 4 bytes, last 12 bytes as literals, as the format requires)."""
    out, anchor, i, table, n = bytearray(), 0, 0, {}, len(src)
    def length_bytes(x):
        b = bytearray()
        while x >= 255: b.append(255); x -= 255
        b.append(x); return b
    while i + 12 < n:
        key = src[i:i + 4]; cand = table.get(key); table[key] = i
        if cand is not None and i - cand <= 65535:
            m = 4
            while i + m + 5 < n and src[cand + m] == src[i + m]: m += 1
            lit = i - anchor
            token = (min(lit, 15) << 4) | min(m - 4, 15)
            out.append(token)
            if lit >= 15: out += length_bytes(lit - 15)
            out += src[anchor:i]
            out += struct.pack('<H', i - cand)
            if m - 4 >= 15: out += length_bytes(m - 4 - 15)
            i += m; anchor = i
        else:
            i += 1
    lit = n - anchor
    out.append(min(lit, 15) << 4)
    if lit >= 15: out += length_bytes(lit - 15)
    out += src[anchor:]
    return bytes(out)

def lz4_stream(data):
    SEED = 0x9747B28C
    out, half = b'', len(data) // 2
    for part, method in ((data[:half], 0x20), (data[half:], 0x10)):
        body = lz4_block(part) if method == 0x20 else part
        out += b'LZ4Block' + bytes([method | 6]) + struct.pack('<iii', len(body), len(part), xxh32(part, SEED) & 0x0FFFFFFF) + body
    return out + b'LZ4Block' + bytes([0x16]) + struct.pack('<iii', 0, 0, 0)

# ------------------------------------------------------------------ region writer
def region(chunks):
    """chunks: {(lx, lz): (type, compressed bytes)} → region file bytes."""
    loc, ts, body, sector = bytearray(4096), bytearray(4096), b'', 2
    for (lx, lz), (ctype, data) in sorted(chunks.items()):
        rec = struct.pack('>ib', len(data) + 1, ctype) + data
        rec += b'\x00' * (-len(rec) % 4096)
        n = len(rec) // 4096
        i = lx + lz * 32
        struct.pack_into('>I', loc, i * 4, (sector << 8) | n)
        struct.pack_into('>I', ts, i * 4, 1_700_000_000 + i)
        body += rec; sector += n
    return bytes(loc) + bytes(ts) + body

def main(out):
    os.makedirs(out, exist_ok=True)
    blocks, expected_be = {}, []
    # chunk 0/0
    for x in range(16):
        for z in range(16): blocks[(x, 64, z)] = 'minecraft:stone'
    wool = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']
    for i, c in enumerate(wool): blocks[(i, 66, 8)] = f'minecraft:{c}_wool'
    blocks[(1, 65, 1)] = 'minecraft:oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]'
    blocks[(2, 65, 1)] = 'minecraft:chest[facing=north,type=single,waterlogged=false]'
    blocks[(5, -60, 5)] = 'minecraft:deepslate[axis=y]'
    chest = C(id=S('minecraft:chest'), x=I(2), y=I(65), z=I(1), keepPacked=B(0),
              Items=Lst(COMPOUND, [C(Slot=B(0), id=S('minecraft:diamond'), count=I(3))]))
    expected_be.append({'pos': [2, 65, 1], 'id': 'minecraft:chest'})
    c00 = chunk_flat(blocks, 0, 0, 5023, 'minecraft:full', True, [chest])
    # chunk 1/0 (older chunk, full properties)
    for x in range(16, 32):
        for z in range(16): blocks[(x, 64, z)] = 'minecraft:stone'
    blocks[(20, 65, 3)] = 'minecraft:oak_stairs[facing=north,half=top,shape=straight,waterlogged=false]'
    c10 = chunk_flat(blocks, 1, 0, 3953, 'minecraft:full', False)
    # chunk 2/0 (LZ4)
    for x in range(32, 48):
        for z in range(16): blocks[(x, 64, z)] = 'minecraft:grass_block[snowy=false]'
    blocks[(40, 65, 8)] = 'minecraft:oak_log[axis=y]'
    blocks[(41, 65, 8)] = 'minecraft:oak_log[axis=x]'
    c20 = chunk_flat(blocks, 2, 0, 5023, 'minecraft:full', True)
    # chunk 0/1 (not fully generated: reader must treat it as unknown)
    noise = {(x, 60, z): 'minecraft:stone' for x in range(16) for z in range(16, 32)}
    c01 = chunk_flat(noise, 0, 1, 5023, 'minecraft:noise', True)
    with open(os.path.join(out, 'r.0.0.mca'), 'wb') as f:
        f.write(region({(0, 0): (2, zlib.compress(c00)), (1, 0): (1, gzip.compress(c10, mtime=0)),
                        (2, 0): (4, lz4_stream(c20)), (0, 1): (3, c01)}))
    # r.-1.-1, chunk -1/-1 in the 1.17 layout
    old = {(-3, 70, -5): 'minecraft:oak_log[axis=x]', (-4, 70, -5): 'minecraft:oak_sign[rotation=4,waterlogged=false]'}
    for x in range(-16, 0):
        for z in range(-16, 0): old[(x, 69, z)] = 'minecraft:dirt'
    sign = C(id=S('minecraft:sign'), x=I(-4), y=I(70), z=I(-5), keepPacked=B(0))
    expected_be.append({'pos': [-4, 70, -5], 'id': 'minecraft:sign'})
    cm = chunk_level(old, -1, -1, 2730, [sign])
    with open(os.path.join(out, 'r.-1.-1.mca'), 'wb') as f:
        f.write(region({(31, 31): (2, zlib.compress(cm))}))
    blocks.update(old)
    # an empty region file, as the game leaves for untouched regions
    open(os.path.join(out, 'r.5.5.mca'), 'wb').close()
    expected = {
        'blocks': sorted([[x, y, z, canonical(t)] for (x, y, z), t in blocks.items()]),
        'blockEntities': expected_be,
        'chunks': {'0,0': 'ok', '1,0': 'ok', '2,0': 'ok', '0,1': 'incomplete', '1,1': 'missing', '-1,-1': 'ok'},
        'dataVersions': [2730, 3953, 5023],
    }
    with open(os.path.join(out, 'expected.json'), 'w') as f: json.dump(expected, f)

if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(sys.argv[1])
