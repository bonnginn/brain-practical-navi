"""Separate an anterior-envelope review subset; not an anatomical adoption rule."""
import gzip
import hashlib
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA = '31fae601d232e7d93ee4af5c02bde9d007e3e916d9f5905cfc1a364ac6856ddc'
CANDIDATE_SHA = '0cea75569178c174e34e1aed2aabadf1a341efefc1ea93ac2de18b1297f4040e'


def main():
    source = (ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()
    candidate_path = ROOT/'work/anatomy-review/fourth-ventricle-remaining-wall31fa-candidate-v1/candidate.json'
    candidate_bytes = candidate_path.read_bytes()
    if hashlib.sha256(source).hexdigest() != SOURCE_SHA or hashlib.sha256(candidate_bytes).hexdigest() != CANDIDATE_SHA:
        raise ValueError('Reviewed input changed')
    candidate = json.loads(candidate_bytes)
    labels = np.frombuffer(gzip.decompress(source),np.uint8,offset=10).reshape((394,466,378),order='F')
    selected, other = [], []
    for row in candidate['records']:
        if not row['selected']:
            continue
        x,y,z = row['xyz']
        existing = np.flatnonzero(labels[x,:,z] == 26)
        (selected if len(existing) and y > existing.max() else other).append(row['xyz'])
    if len(selected) != 173 or len(other) != 336:
        raise ValueError('Subset changed')
    report = dict(sourceSha256=SOURCE_SHA,parentCandidateSha256=CANDIDATE_SHA,
        points=selected,otherPoints=other,adopted=False,expertReviewed=False,labelMutation=False,
        rationale='Review grouping only: candidate Y exceeds the anterior-most existing ID26 at the same X/Z. Other candidates are retained in the parent report, not classified as errors.',
        limitation='Geometric grouping does not establish the ventricle boundary. Original-image orthogonal review is required before adoption.')
    out = ROOT/'work/anatomy-review/fourth-remaining-anterior173-candidate-v1.json'
    with out.open('x',encoding='utf-8') as stream:
        json.dump(report,stream,indent=2)
        stream.write('\n')
    print(hashlib.sha256(out.read_bytes()).hexdigest())


if __name__ == '__main__':
    main()
