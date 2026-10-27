#!/usr/bin/env python3
"""Independent Litematic verifier (stdlib only: gzip + struct).

Shares no code with the TypeScript reader/writer. Decodes every region with
plain integer arithmetic on the whole bit stream and prints a JSON summary
(cells in schematic-origin coordinates) that tests compare with their own
expectations:

    python3 scripts/verify_litematic.py file.litematic

Exit code 0 = valid, 1 = invalid, 2 = usage error.
"""
import gzip
import json
import struct
import sys
from collections import Counter

AIR = ('minecraft:air', 'minecraft:cave_air', 'minecraft:void_air')


class Invalid(Exception):
    pass


class Reader:
    def __init__(self, data):
        self.d, self.p = data, 0

    def take(self, n):
        if n < 0 or self.p + n > len(self.d):
            raise Invalid(f'truncated at byte {self.p}')
        b = self.d[self.p:self.p + n]
        self.p += n
        return b

    def unpack(self, fmt):
        return struct.unpack('>' + fmt, self.take(struct.calcsize('>' + fmt)))[0]

    def mutf8(self):
        raw = self.take(self.unpack('H'))
        units, i = [], 0
        while i < len(raw):
            a = raw[i]
            if 0 < a < 0x80:
                units.append(a); i += 1
            elif a >> 5 == 0b110 and i + 1 < len(raw):
                units.append(((a & 0x1F) << 6) | (raw[i + 1] & 0x3F)); i += 2
            elif a >> 4 == 0b1110 and i + 2 < len(raw):
                units.append(((a & 0x0F) << 12) | ((raw[i + 1] & 0x3F) << 6) | (raw[i + 2] & 0x3F)); i += 3
            else:
                raise Invalid('invalid modified UTF-8')
        return struct.pack('>%dH' % len(units), *units).decode('utf-16-be', 'surrogatepass')

    def length(self):
        n = self.unpack('i')
        if n < 0:
            raise Invalid('negative length')
        return n

    def payload(self, t, depth=0):
        if depth > 512: raise Invalid('too deep')
        if t == 1: return ('byte', self.unpack('b'))
        if t == 2: return ('short', self.unpack('h'))
        if t == 3: return ('int', self.unpack('i'))
        if t == 4: return ('long', self.unpack('q'))
        if t == 5: return ('float', self.unpack('f'))
        if t == 6: return ('double', self.unpack('d'))
        if t == 7: return ('byteArray', list(struct.unpack('>%db' % (n := self.length()), self.take(n))))
        if t == 8: return ('string', self.mutf8())
        if t == 9:
            et, n = self.unpack('B'), self.length()
            if et > 12 or (et == 0 and n): raise Invalid('bad list type')
            return ('list', [self.payload(et, depth + 1) for _ in range(n)], et)
        if t == 10:
            out = {}
            while True:
                ct = self.unpack('B')
                if ct == 0: return ('compound', out)
                if ct > 12: raise Invalid(f'unknown tag type {ct}')
                name = self.mutf8()
                if name in out: raise Invalid(f'duplicate key {name}')
                out[name] = self.payload(ct, depth + 1)
        if t == 11: return ('intArray', list(struct.unpack('>%di' % (n := self.length()), self.take(4 * n))))
        if t == 12: return ('longArray', list(struct.unpack('>%dq' % (n := self.length()), self.take(8 * n))))
        raise Invalid(f'unknown tag type {t}')


def need(c, key, kind, path):
    tag = c.get(key)
    if tag is None or tag[0] != kind:
        raise Invalid(f'{path}.{key}: {kind} expected')
    return tag[1]


def pos(c, path):
    return [need(c, k, 'int', path) for k in 'xyz']


def state_text(entry, path):
    c = entry[1] if entry[0] == 'compound' else None
    if c is None: raise Invalid(f'{path}: compound expected')
    name = need(c, 'Name', 'string', path)
    props = need(c, 'Properties', 'compound', path) if 'Properties' in c else {}
    for k, v in props.items():
        if v[0] != 'string': raise Invalid(f'{path}.Properties.{k}: string expected')
    return name + ('[' + ','.join(f'{k}={v[1]}' for k, v in sorted(props.items())) + ']' if props else '')


def verify(data):
    if data[:2] != b'\x1f\x8b': raise Invalid('not gzip')
    try:
        raw = gzip.decompress(data)
    except Exception as e:  # noqa: BLE001
        raise Invalid(f'gzip: {e}') from e
    r = Reader(raw)
    if r.unpack('B') != 10: raise Invalid('root is not a compound')
    r.mutf8()
    root = r.payload(10)[1]
    if r.p != len(raw): raise Invalid('trailing bytes after root')
    version = need(root, 'Version', 'int', 'Root')
    if not 1 <= version <= 7: raise Invalid(f'unknown Version {version}')
    regions_out, cells, tiles = [], {}, []
    for name, tag in need(root, 'Regions', 'compound', 'Root').items():
        if tag[0] != 'compound': raise Invalid(f'region {name}: compound expected')
        reg, path = tag[1], f'Regions.{name}'
        p, s = pos(need(reg, 'Position', 'compound', path), path), pos(need(reg, 'Size', 'compound', path), path)
        if 0 in s: raise Invalid(f'{path}: zero size')
        lo = [p[i] + s[i] + 1 if s[i] < 0 else p[i] for i in range(3)]
        w, h, l = (abs(n) for n in s)
        palette = [state_text(e, f'{path}.BlockStatePalette[{i}]') for i, e in enumerate(need(reg, 'BlockStatePalette', 'list', path))]
        if not palette: raise Invalid(f'{path}: empty palette')
        bits = max(2, (len(palette) - 1).bit_length())
        longs = need(reg, 'BlockStates', 'longArray', path)
        volume = w * h * l
        if len(longs) != -(-volume * bits // 64): raise Invalid(f'{path}: {len(longs)} longs for {volume} cells at {bits} bits')
        stream = sum((n & (2**64 - 1)) << (64 * k) for k, n in enumerate(longs))
        mask = (1 << bits) - 1
        for i in range(volume):
            v = (stream >> (i * bits)) & mask
            if v >= len(palette): raise Invalid(f'{path}: palette index {v} out of range')
            x, z, y = i % w, (i // w) % l, i // (w * l)
            cells[f'{lo[0] + x},{lo[1] + y},{lo[2] + z}'] = palette[v]
        for i, t in enumerate(need(reg, 'TileEntities', 'list', path) if 'TileEntities' in reg else []):
            rel = pos(t[1], f'{path}.TileEntities[{i}]')
            if not all(0 <= rel[k] < (w, h, l)[k] for k in range(3)): raise Invalid(f'{path}: tile entity {rel} outside the region')
            ident = need(t[1], 'id', 'string', f'{path}.TileEntities[{i}]')
            at = [lo[k] + rel[k] for k in range(3)]
            if cells[f'{at[0]},{at[1]},{at[2]}'].split('[')[0] in AIR: raise Invalid(f'{path}: tile entity {rel} on air')
            tiles.append({'region': name, 'pos': at, 'id': ident, 'keys': sorted(t[1])})
        regions_out.append({'name': name, 'position': p, 'size': s, 'min': lo, 'bits': bits, 'longs': len(longs), 'paletteSize': len(palette), 'palette0': palette[0]})
    meta = need(root, 'Metadata', 'compound', 'Root') if 'Metadata' in root else {}
    return {
        'version': version,
        'subVersion': need(root, 'SubVersion', 'int', 'Root') if 'SubVersion' in root else None,
        'dataVersion': need(root, 'MinecraftDataVersion', 'int', 'Root') if 'MinecraftDataVersion' in root else None,
        'regions': regions_out,
        'counts': dict(sorted(Counter(cells.values()).items())),
        'tileEntities': tiles,
        'metadata': {k: v[1] for k, v in meta.items() if v[0] in ('string', 'int', 'long')},
        'cells': cells if len(cells) <= 4096 else None,
    }


def main(argv):
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    with open(argv[1], 'rb') as f:
        data = f.read()
    try:
        summary = verify(data)
    except (Invalid, struct.error) as e:
        print(json.dumps({'valid': False, 'error': str(e)}))
        return 1
    print(json.dumps({'valid': True, **summary}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
