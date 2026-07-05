#!/usr/bin/env python3
"""Inspecciona un .glb sin dependencias: malla, skeleton (skins) y animation clips.

Uso: python3 tools/inspect_glb.py public/assets/bob/bob.glb
"""
import json
import struct
import sys


def main(path):
    with open(path, 'rb') as f:
        magic, version, _length = struct.unpack('<4sII', f.read(12))
        if magic != b'glTF':
            sys.exit(f'{path}: no es un GLB (magic={magic!r})')
        chunk_len, chunk_type = struct.unpack('<II', f.read(8))
        if chunk_type != 0x4E4F534A:  # 'JSON'
            sys.exit('primer chunk no es JSON')
        gltf = json.loads(f.read(chunk_len))

    print(f'== {path} (glTF v{version}) ==')
    print(f"generador: {gltf.get('asset', {}).get('generator', '¿?')}")

    meshes = gltf.get('meshes', [])
    tris = 0
    skinned = False
    for m in meshes:
        for p in m.get('primitives', []):
            if 'indices' in p:
                tris += gltf['accessors'][p['indices']]['count'] // 3
            if 'JOINTS_0' in p.get('attributes', {}):
                skinned = True
    print(f'meshes: {len(meshes)} · triángulos: ~{tris} · vértices con pesos de hueso: {"SÍ" if skinned else "NO"}')

    skins = gltf.get('skins', [])
    if skins:
        nodes = gltf.get('nodes', [])
        for s in skins:
            joints = s.get('joints', [])
            print(f"skeleton: SÍ — {len(joints)} huesos ({s.get('name', 'sin nombre')})")
            names = [nodes[j].get('name', f'nodo{j}') for j in joints if j < len(nodes)]
            print('  nombres:', ', '.join(names))
    else:
        print('skeleton: NO')

    anims = gltf.get('animations', [])
    if anims:
        print(f'animation clips: {len(anims)}')
        for a in anims:
            # duración = max de los inputs (tiempos) de sus samplers
            dur = 0.0
            for smp in a.get('samplers', []):
                acc = gltf['accessors'][smp['input']]
                dur = max(dur, acc.get('max', [0])[0])
            print(f"  - '{a.get('name', 'sin nombre')}' · {dur:.2f}s · {len(a.get('channels', []))} canales")
    else:
        print('animation clips: NINGUNO')

    # tamaño del modelo (min/max de posiciones de la escena, sin transformar)
    mins, maxs = [1e9] * 3, [-1e9] * 3
    for m in meshes:
        for p in m.get('primitives', []):
            acc = gltf['accessors'][p['attributes']['POSITION']]
            for i in range(3):
                mins[i] = min(mins[i], acc['min'][i])
                maxs[i] = max(maxs[i], acc['max'][i])
    size = [maxs[i] - mins[i] for i in range(3)]
    print(f'bounding box (sin transformar): {size[0]:.2f} x {size[1]:.2f} x {size[2]:.2f} (ancho x alto x prof.)')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'public/assets/bob/bob.glb')
