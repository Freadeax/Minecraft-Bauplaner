"""Independent Python/struct writer for the Litematic contract fixture.

Not production code and not an exporter: it writes committed raw NBT hex that the
TypeScript reader is tested against. Layout after Litematica's LitematicaSchematic
and LitematicaBitArray (tight little-endian packing across longs). GZip is added
separately in tests.
"""
from pathlib import Path
import struct


def mutf(text):
    units = struct.unpack('>' + str(len(text.encode('utf-16-be', 'surrogatepass')) // 2) + 'H', text.encode('utf-16-be', 'surrogatepass'))
    out = bytearray()
    for n in units:
        if 0 < n < 128: out.append(n)
        elif n < 2048: out.extend([192 | (n >> 6), 128 | (n & 63)])
        else: out.extend([224 | (n >> 12), 128 | ((n >> 6) & 63), 128 | (n & 63)])
    return struct.pack('>H', len(out)) + out


def data(kind, value):
    if kind == 1: return struct.pack('>b', value)
    if kind == 3: return struct.pack('>i', value)
    if kind == 4: return struct.pack('>q', value)
    if kind == 6: return struct.pack('>d', value)
    if kind == 8: return mutf(value)
    if kind == 9:
        element, items = value
        return bytes([element]) + struct.pack('>i', len(items)) + b''.join(data(element, v) for v in items)
    if kind == 10: return b''.join(bytes([t]) + mutf(k) + data(t, v) for k, t, v in value) + b'\0'
    if kind in (11, 12): return struct.pack('>i', len(value)) + b''.join(struct.pack('>i' if kind == 11 else '>q', v) for v in value)
    raise ValueError(kind)


def pack(values, bits):
    """LitematicaBitArray: value i occupies stream bits i*bits.., bit k of the stream is bit k%64 of long k//64."""
    total = 0
    for i, v in enumerate(values):
        total |= v << (i * bits)
    count = -(-len(values) * bits // 64)
    longs = [(total >> (64 * k)) & (2**64 - 1) for k in range(count)]
    return [n - 2**64 if n >= 2**63 else n for n in longs]


def bits_for(n):
    return max(2, (n - 1).bit_length())


def state(name, **props):
    entry = [('Name', 8, name)]
    if props:
        entry.append(('Properties', 10, [(k, 8, v) for k, v in sorted(props.items())]))
    return entry


def xyz(x, y, z):
    return [('x', 3, x), ('y', 3, y), ('z', 3, z)]


# Region "Haus": Position (4,0,1), Size (3,2,-4) -> minimum corner (4,0,-2), 3x2x4, index y*12 + z*3 + x.
haus_palette = [state('minecraft:air'), state('minecraft:stone'), state('minecraft:oak_planks'),
                state('minecraft:oak_stairs', facing='east', half='bottom', shape='straight', waterlogged='false'),
                state('minecraft:chest', facing='north', type='single', waterlogged='false'),
                state('example:machine', powered='true')]
haus = [1, 1, 1,  1, 2, 1,  4, 0, 3,  1, 1, 5,   # y=0, z=0..3
        0, 2, 0,  3, 0, 2,  0, 5, 0,  5, 0, 3]   # y=1; index 21 (value 5) straddles long 0/1
chest = xyz(0, 0, 2) + [('id', 8, 'minecraft:chest'), ('Items', 9, (10, [])), ('CustomName', 8, 'Ä\0😀'), ('Lock', 8, '')]
armor_stand = [('id', 8, 'minecraft:armor_stand'), ('Pos', 9, (6, [5.5, 1.0, -0.5]))]
tick = [('Block', 8, 'minecraft:oak_planks'), ('Priority', 3, 0), ('SubTick', 4, 0), ('Time', 3, 5)] + xyz(1, 0, 1)
haus_region = [('BlockStatePalette', 9, (10, haus_palette)), ('BlockStates', 12, pack(haus, bits_for(len(haus_palette)))),
               ('TileEntities', 9, (10, [chest])), ('PendingBlockTicks', 9, (10, [tick])), ('PendingFluidTicks', 9, (0, [])),
               ('Entities', 9, (10, [armor_stand])), ('Position', 10, xyz(4, 0, 1)), ('Size', 10, xyz(3, 2, -4))]

# Region "Turm": Position (1,0,0), Size (-2,3,1) -> minimum corner (0,0,0), 2x3x1, index y*2 + x.
turm_palette = [state('minecraft:air'), state('minecraft:cobblestone'), state('minecraft:stone')]
turm = [1, 1,  1, 0,  2, 1]
turm_region = [('BlockStatePalette', 9, (10, turm_palette)), ('BlockStates', 12, pack(turm, bits_for(len(turm_palette)))),
               ('TileEntities', 9, (0, [])), ('PendingBlockTicks', 9, (0, [])), ('PendingFluidTicks', 9, (0, [])),
               ('Entities', 9, (0, [])), ('Position', 10, xyz(1, 0, 0)), ('Size', 10, xyz(-2, 3, 1))]

metadata = [('Name', 8, 'Vertragsfixture'), ('Author', 8, 'Own synthetic contract fixture'), ('Description', 8, 'Ä\0😀'),
            ('RegionCount', 3, 2), ('TotalVolume', 3, 30), ('TotalBlocks', 3, 22),
            ('TimeCreated', 4, 1761523200000), ('TimeModified', 4, 9223372036854775807),
            ('EnclosingSize', 10, xyz(7, 3, 4)), ('PreviewImageData', 11, [0, -1])]
root = [('MinecraftDataVersion', 3, 3465), ('Version', 3, 6), ('SubVersion', 3, 1), ('Metadata', 10, metadata),
        ('Regions', 10, [('Haus', 10, haus_region), ('Turm', 10, turm_region)])]
raw = bytes([10]) + mutf('') + data(10, root)
p = Path(__file__).resolve().parents[1] / 'fixtures/litematic/multiregion.nbt.hex'
p.write_text('\n'.join(raw[i:i + 24].hex() for i in range(0, len(raw), 24)) + '\n')
print(f'{len(raw)} independent raw NBT bytes written')
