"""Independent Python/struct fixture writer, not production JS code or an exporter.
Writes committed raw NBT hex. Compression is performed separately in tests/build.
"""
from pathlib import Path
import struct

def mutf(text):
    units=struct.unpack('>'+str(len(text.encode('utf-16-be','surrogatepass'))//2)+'H',text.encode('utf-16-be','surrogatepass'))
    out=bytearray()
    for n in units:
        if 0<n<128: out.append(n)
        elif n<2048: out.extend([192|(n>>6),128|(n&63)])
        else: out.extend([224|(n>>12),128|((n>>6)&63),128|(n&63)])
    return struct.pack('>H',len(out))+out

def data(kind,value):
    if kind==1:return struct.pack('>b',value)
    if kind==2:return struct.pack('>h',value)
    if kind==3:return struct.pack('>i',value)
    if kind==4:return struct.pack('>q',value)
    if kind==5:return struct.pack('>f',value)
    if kind==6:return struct.pack('>d',value)
    if kind==7:return struct.pack('>i',len(value))+bytes(v&255 for v in value)
    if kind==8:return mutf(value)
    if kind==9:
        element,items=value
        return bytes([element])+struct.pack('>i',len(items))+b''.join(data(element,v) for v in items)
    if kind==10:return b''.join(bytes([t])+mutf(k)+data(t,v) for k,t,v in value)+b'\0'
    if kind in (11,12):return struct.pack('>i',len(value))+b''.join(struct.pack('>i' if kind==11 else '>q',v) for v in value)
    raise ValueError(kind)

def varints(values):
    out=[]
    for n in values:
        while n>=128:out.append((n&127)|128);n>>=7
        out.append(n)
    return out

palette=[('minecraft:air',3,0),('minecraft:stone',3,7),('example:machine[facing=north,powered=false]',3,130),('minecraft:barrel[facing=east,open=false]',3,2)]
entry=[('Pos',11,[0,0,1]),('Id',8,'minecraft:barrel'),('Data',10,[('Items',9,(10,[])),('Seed',4,9223372036854775807),('Name',8,'Ä\0😀'),('Bytes',7,[-128,127]),('Ints',11,[-2147483648,2147483647]),('Longs',12,[-9223372036854775808,9223372036854775807])]),('Extension',8,'preserve me')]
schematic=[('Version',3,3),('DataVersion',3,3465),('Width',2,3),('Height',2,2),('Length',2,2),('Offset',11,[-10,64,30]),('Metadata',10,[('Author',8,'Own synthetic contract fixture'),('Date',4,9223372036854775807)]),('Blocks',10,[('Palette',10,palette),('Data',7,varints([7,0,130,2,7,0,0,7,130,0,0,7])),('BlockEntities',9,(10,[entry]))]),('Biomes',10,[('Palette',10,[('minecraft:plains',3,0)]),('Data',7,[0]*12)]),('Entities',9,(10,[[('Id',8,'minecraft:armor_stand'),('Pos',9,(6,[1.5,0.0,1.5])),('Data',10,[])]])),('CustomField',8,'retained in source')]
root=[('Schematic',10,schematic)]
raw=bytes([10])+mutf('')+data(10,root)
p=Path(__file__).resolve().parents[1]/'fixtures/schem/asymmetric.nbt.hex'
p.write_text('\n'.join(raw[i:i+24].hex() for i in range(0,len(raw),24))+'\n')
print(f'{len(raw)} independent raw NBT bytes written')
