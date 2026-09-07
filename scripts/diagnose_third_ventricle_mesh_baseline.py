"""Read the mesh's original git-era label source and explain baseline drift."""
import gzip
import json
import struct
import subprocess
import numpy as np
import build_specimen_blocks as blocks
from prepare_cerebellar_island_meshes import encode
from stage_third_ventricle_core_repair import ROOT, WORK, digest


def main():
    out = WORK/'third-ventricle-mesh-baseline-v1.json'
    if out.exists():
        raise ValueError('Evidence exists')
    commit = subprocess.check_output(['git', 'rev-parse', 'a6b2809'], cwd=ROOT, text=True).strip()
    path = 'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
    data = subprocess.check_output(['git', 'show', f'{commit}:{path}'], cwd=ROOT)
    decoded = gzip.decompress(data)
    if decoded[:4] != b'BBS1':
        raise ValueError('Wrong historical volume')
    dims = struct.unpack('<3H', decoded[4:10])
    historical = np.frombuffer(decoded, dtype=np.uint8, offset=10).reshape(dims[::-1])[::2,::2,::2]
    current, _ = blocks.read_volume(WORK/'third-ventricle-core-stage-v1/base.bin.gz', b'BBS1')
    raw, _ = blocks.read_volume(blocks.BIGBRAIN, b'BBV1')
    raw = raw[::2,::2,::2]
    def part(seg):
        return next(p for p in blocks.specimen_definitions(raw, seg)['diencephalon'] if p.key == 'third-ventricle')
    previous = part(historical)
    now = part(current[::2,::2,::2])
    reproduced = encode(blocks.mesh_from_mask(previous.mask, raw, False))
    installed = (ROOT/'public/atlas/block-diencephalon-third-ventricle.mesh').read_bytes()
    points = np.argwhere(previous.mask != now.mask)
    record = dict(sourceCommit=commit, historicalVolumeSha256=digest(data), installedMeshSha256=digest(installed),
        historicalReproducedSha256=digest(reproduced), historicalReproducesInstalled=(reproduced == installed),
        changedCoarseMaskPointsZYX=points.tolist(),
        changes=[dict(zyx=p.tolist(), before=bool(previous.mask[tuple(p)]), after=bool(now.mask[tuple(p)])) for p in points],
        mutation=False)
    out.write_text(json.dumps(record, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(record, indent=2))


if __name__ == '__main__':
    main()
