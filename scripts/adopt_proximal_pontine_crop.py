"""Reproduce the reviewed VII/VIII display crop; install only with --install."""
import argparse
import contextlib
import hashlib
import io
import json
from pathlib import Path
from unittest.mock import patch
import build_neurovascular_overlays as g

BEFORE = 'a6c912f35ad37e5a98f4f482e72df22a74f7dee22fbc1cb05e07aba050d11b1f'
AFTER = '1244f483c765ef084648a74bbad13cff78ea498d4edb9918e15812709e4fd823'
NAME = 'overlay-nerves-pontine.mesh'
FIXTURE = g.ROOT / 'tests/fixtures/overlay-nerves-pontine-pre-proximal-a6c9.mesh'


def main(output, install=False):
    output = output.resolve()
    if output.exists() or not output.is_relative_to(g.ROOT / 'work'):
        raise ValueError('New work output required')
    sha = lambda b: hashlib.sha256(b).hexdigest()
    before = (g.OUT / NAME).read_bytes()
    if sha(before) != BEFORE:
        raise ValueError('Expected pre-crop public asset')
    if FIXTURE.exists() and FIXTURE.read_bytes() != before:
        raise ValueError('Conflicting fixture')
    record = g.ROOT / 'segmentation-patches/review/pontine-proximal-display-adoption-2026-09-06.json'
    if install and record.exists():
        raise ValueError('Adoption record already exists')
    output.mkdir()
    with patch.object(g, 'OUT', output), contextlib.redirect_stdout(io.StringIO()):
        g.main()
    records = []
    meshes = sorted(output.glob('*.mesh'))
    if len(meshes) != 5:
        raise ValueError('Expected five meshes')
    for file in meshes:
        old = (g.OUT / file.name).read_bytes()
        new = file.read_bytes()
        if file.name == NAME:
            if sha(new) != AFTER:
                raise ValueError('Generator does not reproduce reviewed candidate')
        elif old != new:
            raise ValueError('Unexpected other mesh change: ' + file.name)
        records.append(dict(file=file.name, beforeSha256=sha(old), afterSha256=sha(new), changed=old != new))
    report = dict(developmentOnly=True, expertReviewed=False,
        scope='Remove VII/VIII rings8-15 only; retain original proximal vertices, normals and radius. Display cutoff, not anatomical endpoint or validated root exit.',
        retainedRings=list(range(8)), removedRings=list(range(8,16)), regionIds=[34,35,36,37],
        imageReview='NERVE_ORIGIN_IMAGE_REVIEW.md', sourceImageSha256='c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746',
        candidateBrowserReport='work/proximal-crop-browser-v3.json', meshes=records)
    (output / 'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    if install:
        # All compatibility/hash checks precede any authoritative writes.
        if not FIXTURE.exists():
            FIXTURE.write_bytes(before)
        (g.OUT / NAME).write_bytes((output / NAME).read_bytes())
        (g.OUT / 'neurovascular-overlays.json').write_bytes((output / 'neurovascular-overlays.json').read_bytes())
        with record.open('x', encoding='utf-8') as handle:
            handle.write(json.dumps(report, indent=2)+'\n')
    print(json.dumps(dict(installed=install, meshes=records)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--install', action='store_true')
    args = parser.parse_args()
    main(args.output, args.install)
