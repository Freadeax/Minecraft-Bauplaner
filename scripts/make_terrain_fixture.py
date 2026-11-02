"""Region file with a hillside for terrain survey tests (TERRAIN-01).

Writes r.2.0.mca (26.x layout, zlib, DataVersion 5023) into the given folder,
plus terrain-expected.json with the hand-computed columns:

    area x 1024 … 1183, z 0 … 79 (10 × 5 chunks), all fully generated
    ground y = 64 + (x - 1024) // 8   (rises eastwards by one every 8 blocks)
    grass_block on top, 3 dirt below, stone down to y 50
    pond: x 1024 … 1031, z 48 … 55: ground 2 lower, water up to the old surface
    oak tree at 1060/?/20: 4 logs, leaves on top (not ground)
    short grass on every 5th column of row z 10 (skipped: plants are no surface)

Usage: python -I scripts/make_terrain_fixture.py <out-dir>
Reuses the NBT, palette and region writers of make_region_fixture.py.
"""
import json
import os
import sys
import zlib

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_region_fixture as fx  # noqa: E402

X0, Z0, W, L = 1024, 0, 160, 80


def ground_of(x, z):
    g = 64 + (x - X0) // 8
    if X0 <= x < X0 + 8 and 48 <= z < 56: g -= 2
    return g


def main(out):
    os.makedirs(out, exist_ok=True)
    blocks = {}
    expected = []
    for z in range(Z0, Z0 + L):
        for x in range(X0, X0 + W):
            g = ground_of(x, z)
            for y in range(50, g - 3): blocks[(x, y, z)] = 'minecraft:stone'
            for y in range(g - 3, g): blocks[(x, y, z)] = 'minecraft:dirt'
            blocks[(x, g, z)] = 'minecraft:grass_block[snowy=false]'
            surface, sid = g, 'minecraft:grass_block'
            if X0 <= x < X0 + 8 and 48 <= z < 56:
                for y in range(g + 1, g + 3): blocks[(x, y, z)] = 'minecraft:water[level=0]'
                surface, sid = g + 2, 'minecraft:water'
            if z == 10 and x % 5 == 0: blocks[(x, g + 1, z)] = 'minecraft:short_grass'
            expected.append({'x': x, 'z': z, 'ground': g, 'surface': surface, 'surfaceId': sid})
    tx, tz = 1060, 20
    tg = ground_of(tx, tz)
    for y in range(tg + 1, tg + 5): blocks[(tx, y, tz)] = 'minecraft:oak_log[axis=y]'
    for dx in (-1, 0, 1):
        for dz in (-1, 0, 1):
            blocks[(tx + dx, tg + 5, tz + dz)] = 'minecraft:oak_leaves[distance=1,persistent=false,waterlogged=false]'
    for e in expected:
        if abs(e['x'] - tx) <= 1 and abs(e['z'] - tz) <= 1:
            e['surface'], e['surfaceId'] = tg + 5, 'minecraft:oak_leaves'
    chunks = {}
    for cz in range(Z0 // 16, (Z0 + L) // 16):
        for cx in range(X0 // 16, (X0 + W) // 16):
            data = fx.chunk_flat(blocks, cx, cz, 5023, 'minecraft:full', True)
            chunks[(cx & 31, cz & 31)] = (2, zlib.compress(data))
    with open(os.path.join(out, 'r.2.0.mca'), 'wb') as f: f.write(fx.region(chunks))
    with open(os.path.join(out, 'terrain-expected.json'), 'w') as f:
        json.dump({'area': {'minX': X0, 'minZ': Z0, 'width': W, 'length': L}, 'tree': [tx, tz, tg], 'columns': expected}, f)


if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(sys.argv[1])
