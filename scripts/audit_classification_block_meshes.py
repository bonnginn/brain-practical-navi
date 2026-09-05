"""Compare every block mask across the exact 47-voxel classification repair.

Generate changed meshes under work only. Never install or deploy automatically.
"""
import hashlib
import json
import argparse
import numpy as np
import build_specimen_blocks as b


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--install', action='store_true', help='Install only reproduced changed meshes into the development tree')
    parser.add_argument('--callosal', action='store_true', help='Compare the later 1605-voxel callosal repair, keeping the ventricle set unchanged')
    args = parser.parse_args()
    original_atlas = b.ATLAS
    old_path = b.ROOT / ('tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz' if args.callosal else 'tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz')
    new_path = b.SEGMENTATION if args.callosal else b.ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz'
    assert sha(old_path) == ('930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7' if args.callosal else 'b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3')
    assert sha(new_path) == ('5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3' if args.callosal else '930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7')
    raw, _ = b.read_volume(b.BIGBRAIN, b'BBV1')
    old, _ = b.read_volume(old_path, b'BBS1')
    new, _ = b.read_volume(new_path, b'BBS1')
    raw = raw[::2, ::2, ::2].copy()
    # Reproduce the previous generator's ventricle set for the old baseline.
    b.VENTRICLES = (23, 24, 25, 26, 41) if args.callosal else (23, 24, 25, 26)
    before = b.specimen_definitions(raw, old[::2, ::2, ::2])
    b.VENTRICLES = (23, 24, 25, 26, 41)
    after = b.specimen_definitions(raw, new[::2, ::2, ::2])
    out = b.ROOT / ('work/anatomy-review/callosal-block-meshes-v1' if args.callosal else 'work/anatomy-review/classification-block-meshes-v1')
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for key, parts in before.items():
        assert [p.key for p in parts] == [p.key for p in after[key]]
        for previous, current in zip(parts, after[key]):
            name = f'block-{key}-{current.key}'
            row = dict(file=name+'.mesh', changedMaskVoxels=int(np.count_nonzero(previous.mask != current.mask)))
            if row['changedMaskVoxels']:
                b.ATLAS = out
                b.write_mesh(name+'-before', b.mesh_from_mask(previous.mask, raw, previous.material == 'specimen'))
                row['oldReproducedSha256'] = sha(out/(name+'-before.mesh'))
                row['currentSha256'] = sha(original_atlas/(name+'.mesh'))
                assert row['oldReproducedSha256'] == row['currentSha256'], name+' current mesh is not reproduced'
                row['newMetadata'] = b.write_mesh(name, b.mesh_from_mask(current.mask, raw, current.material == 'specimen'))
                row['newSha256'] = sha(out/(name+'.mesh'))
            rows.append(row)
            print(name, row['changedMaskVoxels'], flush=True)
    report = dict(oldLabelsSha256=sha(old_path), newLabelsSha256=sha(new_path), parts=rows, installed=False)
    if args.install:
        metadata_path = original_atlas/'specimen-blocks.json'
        metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
        changed = [r for r in rows if r['changedMaskVoxels']]
        targets = [p for parts in metadata['specimens'].values() for p in parts]
        for row in changed:
            matches = [p for p in targets if p['file'] == row['file']]
            assert len(matches) == 1
            assert sha(original_atlas/row['file']) == row['currentSha256']
            matches[0].update(row['newMetadata'])
        for row in changed:
            (original_atlas/row['file']).write_bytes((out/row['file']).read_bytes())
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        report['installed'] = True
    (out/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    main()
