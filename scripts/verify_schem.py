#!/usr/bin/env python3
"""Independent Sponge Schematic v3 verifier (stdlib only: gzip + struct).

Shares no code with the TypeScript reader/writer. Checks the file against the
Sponge v3 layout and prints a JSON summary that tests compare with values they
derive by hand:

    python3 scripts/verify_schem.py file.schem [--expect expected.json]

Exit code 0 = valid (and matching --expect), 1 = invalid, 2 = usage error.
"""
import gzip
import json
import struct
import sys
from collections import Counter


class Invalid(Exception):
    pass


class Reader:
    def __init__(self, data):
        self.d = data
        self.p = 0

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
            if a < 0x80 and a != 0:
                units.append(a); i += 1
            elif a >> 5 == 0b110 and i + 1 < len(raw) and raw[i + 1] >> 6 == 0b10:
                units.append(((a & 0x1F) << 6) | (raw[i + 1] & 0x3F)); i += 2
            elif a >> 4 == 0b1110 and i + 2 < len(raw) and raw[i + 1] >> 6 == 0b10 and raw[i + 2] >> 6 == 0b10:
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
        if depth > 512:
            raise Invalid('too deep')
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
            if et > 12 or (et == 0 and n):
                raise Invalid('bad list type')
            return ('list', [self.payload(et, depth + 1) for _ in range(n)], et)
        if t == 10:
            out = {}
            while True:
                ct = self.unpack('B')
                if ct == 0:
                    return ('compound', out)
                if ct > 12:
                    raise Invalid(f'unknown tag type {ct}')
                name = self.mutf8()
                if name in out:
                    raise Invalid(f'duplicate key {name}')
                out[name] = self.payload(ct, depth + 1)
        if t == 11: return ('intArray', list(struct.unpack('>%di' % (n := self.length()), self.take(4 * n))))
        if t == 12: return ('longArray', list(struct.unpack('>%dq' % (n := self.length()), self.take(8 * n))))
        raise Invalid(f'unknown tag type {t}')


def need(compound, key, kind, path):
    tag = compound.get(key)
    if tag is None or tag[0] != kind:
        raise Invalid(f'{path}.{key}: {kind} expected')
    return tag[1]


def verify(data):
    if data[:2] != b'\x1f\x8b':
        raise Invalid('not gzip')
    try:
        raw = gzip.decompress(data)
    except Exception as e:  # noqa: BLE001 - any decompression failure is invalid
        raise Invalid(f'gzip: {e}') from e
    r = Reader(raw)
    if r.unpack('B') != 10:
        raise Invalid('root is not a compound')
    r.mutf8()
    root = r.payload(10)[1]
    if r.p != len(raw):
        raise Invalid('trailing bytes after root')
    s = need(root, 'Schematic', 'compound', 'Root')
    if need(s, 'Version', 'int', 'Schematic') != 3:
        raise Invalid('Version must be 3')
    data_version = need(s, 'DataVersion', 'int', 'Schematic')
    w, h, l = (need(s, k, 'short', 'Schematic') & 0xFFFF for k in ('Width', 'Height', 'Length'))
    if min(w, h, l) < 1:
        raise Invalid('dimension 0')
    offset = need(s, 'Offset', 'intArray', 'Schematic') if 'Offset' in s else [0, 0, 0]
    if len(offset) != 3:
        raise Invalid('Offset needs 3 ints')
    blocks = need(s, 'Blocks', 'compound', 'Schematic')
    pal = need(blocks, 'Palette', 'compound', 'Blocks')
    ids = {}
    for state, tag in pal.items():
        if tag[0] != 'int':
            raise Invalid(f'palette {state}: int expected')
        if tag[1] in ids:
            raise Invalid(f'duplicate palette id {tag[1]}')
        ids[tag[1]] = state
    if sorted(ids) != list(range(len(ids))):
        raise Invalid('palette ids are not contiguous 0..n-1')
    raw_data = bytes(b & 0xFF for b in need(blocks, 'Data', 'byteArray', 'Blocks'))
    volume = w * h * l
    values, p = [], 0
    while p < len(raw_data):
        v = shift = 0
        while True:
            if p >= len(raw_data):
                raise Invalid('truncated varint')
            b = raw_data[p]; p += 1
            v |= (b & 0x7F) << shift
            if not b & 0x80:
                break
            shift += 7
            if shift > 28:
                raise Invalid('varint longer than 5 bytes')
        if v not in ids:
            raise Invalid(f'unknown palette id {v}')
        values.append(v)
    if len(values) != volume:
        raise Invalid(f'{len(values)} block values for volume {volume}')
    counts = Counter(ids[v] for v in values)
    if any(n == 0 for n in (counts[s] for s in pal)):
        raise Invalid('unused palette entry')
    entities = []
    seen = set()
    for i, be in enumerate(need(blocks, 'BlockEntities', 'list', 'Blocks') if 'BlockEntities' in blocks else []):
        if be[0] != 'compound':
            raise Invalid('BlockEntity must be compound')
        c = be[1]
        pos = need(c, 'Pos', 'intArray', f'BlockEntities[{i}]')
        ident = need(c, 'Id', 'string', f'BlockEntities[{i}]')
        if 'Data' in c and c['Data'][0] != 'compound':
            raise Invalid('BlockEntity Data must be compound')
        if len(pos) != 3 or not all(0 <= pos[k] < (w, h, l)[k] for k in range(3)):
            raise Invalid(f'BlockEntity {pos} outside the box')
        if tuple(pos) in seen:
            raise Invalid(f'two BlockEntities at {pos}')
        seen.add(tuple(pos))
        state = ids[values[pos[0] + pos[2] * w + pos[1] * w * l]]
        if state.split('[')[0] in ('minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'):
            raise Invalid(f'BlockEntity {pos} on air')
        entities.append({'pos': pos, 'id': ident, 'state': state, 'dataKeys': sorted(c['Data'][1]) if 'Data' in c else []})
    meta = need(s, 'Metadata', 'compound', 'Schematic') if 'Metadata' in s else {}
    return {
        'version': 3,
        'dataVersion': data_version,
        'size': [w, h, l],
        'offset': offset,
        'paletteSize': len(ids),
        'counts': dict(sorted(counts.items())),
        'blockEntities': entities,
        'metadataKeys': sorted(meta),
        'cells': {f'{x},{y},{z}': ids[values[x + z * w + y * w * l]] for y in range(h) for z in range(l) for x in range(w)} if volume <= 4096 else None,
    }


def main(argv):
    if len(argv) not in (2, 4) or (len(argv) == 4 and argv[2] != '--expect'):
        print(__doc__, file=sys.stderr)
        return 2
    with open(argv[1], 'rb') as f:
        data = f.read()
    try:
        summary = verify(data)
    except (Invalid, struct.error) as e:
        print(json.dumps({'valid': False, 'error': str(e)}))
        return 1
    summary = {'valid': True, **summary}
    if len(argv) == 4:
        with open(argv[3], encoding='utf-8') as f:
            expect = json.load(f)
        diff = {k: {'expected': v, 'actual': summary.get(k)} for k, v in expect.items() if summary.get(k) != v}
        if diff:
            print(json.dumps({'valid': False, 'error': 'mismatch', 'diff': diff}, ensure_ascii=False))
            return 1
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
