"""Extract the homepage's anatomical surfaces from the Brain Project GLB.

Usage: python3 scripts/prepare-brain-model.py source.glb output.glb
Geometry remains CC BY-SA 4.0; see public/models/brain/ATTRIBUTION.md.
Retains original Draco bytes; removes unused anatomy, materials and editor metadata.
"""
import copy
import json
import struct
import sys
from pathlib import Path

source = Path(sys.argv[1]).read_bytes()
json_length = struct.unpack_from('<I', source, 12)[0]
doc = json.loads(source[20:20 + json_length])
binary = source[28 + json_length:]
selected = [n for n in doc['nodes'] if n.get('extras', {}).get('bx_cat') in ('cortex', 'cerebellum') or n.get('extras', {}).get('bx_label') in ('Medulla oblongata', 'Pons', 'Midbrain')]
out = {'asset': {'version': '2.0', 'generator': 'Mind Palace surface subset', 'copyright': 'Z-Anatomy / BodyParts3D, DBCLS. CC BY-SA 4.0. Derived from itayinbarr/brainproject.'}, 'extensionsUsed': ['KHR_draco_mesh_compression'], 'extensionsRequired': ['KHR_draco_mesh_compression'], 'scene': 0, 'scenes': [{'nodes': list(range(len(selected)))}], 'nodes': [], 'meshes': [], 'accessors': [], 'bufferViews': [], 'buffers': []}
blob = bytearray()
accessor_map, view_map = {}, {}

def view(index):
    if index not in view_map:
        original = doc['bufferViews'][index]
        offset, length = original.get('byteOffset', 0), original['byteLength']
        while len(blob) % 4:
            blob.append(0)
        updated = dict(original, buffer=0, byteOffset=len(blob))
        blob.extend(binary[offset:offset + length])
        view_map[index] = len(out['bufferViews'])
        out['bufferViews'].append(updated)
    return view_map[index]

def accessor(index):
    if index not in accessor_map:
        item = copy.deepcopy(doc['accessors'][index])
        if 'bufferView' in item:
            item['bufferView'] = view(item['bufferView'])
        assert 'sparse' not in item, 'Sparse accessors require explicit handling'
        accessor_map[index] = len(out['accessors'])
        out['accessors'].append(item)
    return accessor_map[index]

for node in selected:
    mesh = copy.deepcopy(doc['meshes'][node['mesh']])
    for primitive in mesh['primitives']:
        primitive.pop('material', None)
        primitive['attributes'] = {key: accessor(value) for key, value in primitive['attributes'].items()}
        if 'indices' in primitive:
            primitive['indices'] = accessor(primitive['indices'])
        draco = primitive['extensions']['KHR_draco_mesh_compression']
        draco['bufferView'] = view(draco['bufferView'])
    out['meshes'].append(mesh)
    item = {k: copy.deepcopy(v) for k, v in node.items() if k not in ('mesh', 'extras', 'children')}
    item['mesh'] = len(out['meshes']) - 1
    item['extras'] = {k: v for k, v in node.get('extras', {}).items() if k.startswith('bx_')}
    out['nodes'].append(item)

out['buffers'] = [{'byteLength': len(blob)}]
encoded = json.dumps(out, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
blob.extend(b'\0' * (-len(blob) % 4))
result = struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(blob)) + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + struct.pack('<II', len(blob), 0x004E4942) + blob
Path(sys.argv[2]).write_bytes(result)
print(f'{len(selected)} surfaces; {len(source):,} -> {len(result):,} bytes')
