"""Reversible work-only stage of the eight visually reviewed fringe voxels."""
import gzip
import hashlib
import json
from pathlib import Path
import numpy as np
from diagnose_third_detached_support import SHA, ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

POINTS = [(193,243,173),(193,244,173),(193,245,173),(194,243,173),
          (194,244,173),(195,243,172),(195,244,172),(195,259,164)]


def replay(labels, reverse=False):
    if labels.shape != (394,466,378) or labels.dtype != np.uint8:
        raise ValueError('Unexpected label array')
    points = np.array(POINTS)
    if np.any(labels[tuple(points.T)] != (25 if reverse else 0)):
        raise ValueError('Existing label conflict')
    result = labels.copy()
    result[tuple(points.T)] = 0 if reverse else 25
    return result


def digest(data):return hashlib.sha256(data).hexdigest()


def main():
    out = ROOT/'work/anatomy-review/third-detached8-stage-v1'
    if out.exists():raise ValueError('Preserve existing evidence')
    support = ROOT/'work/anatomy-review/third-detached137-support-v1.json'
    support_bytes = support.read_bytes()
    if digest(support_bytes) != '627c4b06bf36a9b30b804c9c1a28f2bbe064beafa1e877b10b1aee7e1885f2cc':
        raise ValueError('Evidence changed')
    measured = [r['xyz'] for r in json.loads(support_bytes)['groups']['zeroFaceFringe']['records'] if r['finiteMinimum'] >= 65000]
    if measured != [list(p) for p in POINTS]:raise ValueError('Point set changed')
    review_path = ROOT/'work/anatomy-review/third-detached8-difference-v1/report.json'
    review_bytes = review_path.read_bytes(); review = json.loads(review_bytes)
    if review['points'] != measured or review['inputSha256'] != SHA:raise ValueError('Review changed')
    for f in review['figures']:
        if digest((review_path.parent/f['path']).read_bytes()) != f['sha256']:raise ValueError('Image changed')
    _, _, before = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, SHA)
    after = replay(before)
    if not np.array_equal(replay(after, True), before):raise ValueError('Not reversible')
    compressed = DEFAULT_LABELS.read_bytes(); raw = gzip.decompress(compressed)
    after_raw = raw[:10] + after.tobytes(order='F')
    staged = gzip.compress(after_raw, mtime=0)
    report = dict(beforeSha256=SHA, afterSha256=digest(staged), afterRawVoxelSha256=digest(after_raw[10:]),
        points=measured, transition='0->25', count=8, supportSha256=digest(support_bytes),
        differenceReportSha256=digest(review_bytes), status='AI-image-reviewed-work-stage-only',
        adopted=False, expertReviewed=False, publicMutation=False,
        evidence='SECTION_VENTRICLE_MESH_SYNC.md; all 13 difference PNGs / 36 planes visually reviewed. Native100 two-point context is not all-eight-voxel validation.',
        limitation='Local fringe correction only, not a bridge or complete ventricular segmentation. Mesh impact and integration verification pending.')
    out.mkdir()
    (out/'before.bin.gz').write_bytes(compressed)
    (out/'labels.bin.gz').write_bytes(staged)
    (out/'repair.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':main()
