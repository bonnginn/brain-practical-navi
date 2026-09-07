"""Stage only the fixed visually reviewed precision-exception cells; never install."""
import json
import numpy as np
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_lateral_fringe_repair import replay, encode
from stage_third_ventricle_core_repair import digest, checked_report
from diagnose_inferior_horn_sampling import topology
from locate_inferior_horn_fragments import fragment_records

BASE = 'ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb'
BASE_RAW = '2b870431f39cb214d01a8cfc49bbd37f0cb5f23b23264615bbb256329f112d6a'
PRECISION = 'f58b187e44994214b940322aa92a67085132b7869a9f3042bdaf77b6204c3327'
XYZ = [(251,245,111),(251,248,110),(252,245,113),(252,248,109),
       (253,245,111),(254,245,111),(254,251,103),(255,245,111),
       (255,248,108),(255,251,104),(256,248,108),(256,251,104),
       (258,251,102),(258,251,103),(263,251,101),(264,251,101),
       (264,253,98),(265,245,107),(265,251,101)]


def validated_points(report, cells):
    if report['labelSha256'] != BASE or cells['labelSha256'] != BASE:
        raise ValueError('Wrong baseline')
    selected = [r for r in report['records'] if r['selectedForPriorVisualReview']]
    if len(selected) != 19 or {tuple(r['xyz']) for r in selected} != set(XYZ):
        raise ValueError('Fixed reviewed set differs')
    if len(cells['figures']) != 19 or {tuple(f['appXYZ']) for f in cells['figures']} != set(XYZ):
        raise ValueError('Individual review set differs')
    if sum(len(f['views']) for f in cells['figures']) != 271:
        raise ValueError('Individual view coverage differs')
    for r in selected:
        if r['currentLabel'] != 0 or not r['nominalFullySupported']:
            raise ValueError('Evidence contradicts selected point')
    return [dict(xyz=list(p), before=0, after=24) for p in XYZ]


def main():
    work = ROOT/'work/anatomy-review'
    out = work/'inferior-horn-partial19-stage-v1'
    if out.exists():
        raise ValueError('Preserve existing evidence')
    path = work/'inferior-horn-residual-107-grid-precision-v1.json'
    data = path.read_bytes()
    if digest(data) != PRECISION:
        raise ValueError('Precision evidence changed')
    report = json.loads(data)
    evidence = [checked_report(*entry) for entry in [
        ('inferior-horn-residual-107-partial-cells-v1','74b25efc71ae7b4061b195930e7e8d4c9d96030a34648d55a1a610e9d5252af4',19),
        ('inferior-horn-residual-107-partial19-union-v1','d9bfd57194e8b94d70240a6374490bd1f2be973b78272edccecb5abf02e77af1',65),
        ('inferior-horn-residual-107-gap-native-v1','51e78eae73681b4141f2cc7cd360812f9a85c2c6d19d18c87131d50ceb4e853a',8),
        ('inferior-horn-residual-107-gap-sagittal-v1','67ce0876fa4670ca6455bf7b11f4af0fb6dc233e488bcaf0ae57669a2ba18cc2',10),
    ]]
    points = validated_points(report, evidence[0]['report'])
    _, _, before = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, BASE)
    if digest(before.tobytes(order='F')) != BASE_RAW:
        raise ValueError('Raw baseline differs')
    after = replay(before, points)
    if np.count_nonzero(before != after) != 19 or not np.array_equal(replay(after, points, True), before):
        raise ValueError('Difference/reverse mismatch')
    lo = np.array([202,170,72]); hi = np.array([283,303,143])
    crop = tuple(slice(int(a),int(b)) for a,b in zip(lo,hi))
    connectivity = {}
    for name, volume in [('before',before),('after',after)]:
        complete = volume == 24
        mask = complete[crop]
        connectivity[name] = dict(totalLabel24=int(complete.sum()), cropTopology=topology(mask),
            groups=fragment_records(mask,lo,complete,3))
    compressed = encode(after)
    result = dict(inputCompressedSha256=BASE,inputRawSha256=BASE_RAW,
        outputCompressedSha256=digest(compressed),outputRawSha256=digest(after.tobytes(order='F')),
        changedVoxelCount=19,transitions={'0->24':19},points=points,
        precisionEvidence=dict(path=path.relative_to(ROOT).as_posix(),sha256=PRECISION),
        reviewEvidence=[{k:e[k] for k in ['path','sha256']} for e in evidence],
        connectivity=connectivity,cropAppXYZ=dict(min=lo.tolist(),maxExclusive=hi.tolist()),
        status='AI-image-reviewed-development-repair-staged',adopted=False,installed=False,
        published=False,expertReviewed=False,
        rationale='Fixed 19 localized cavity omissions reviewed individually and as a union. Sub-resolution boundary intersections explained by stored coordinate precision; no global rounding or threshold change.',
        limitations=['Not full inferior-horn completion or expert ground truth.',
                     'Nominal geometry is a diagnostic hypothesis, not a replacement affine.',
                     'No interpolation of remaining gaps; mesh/integration/browser checks pending.'])
    out.mkdir()
    (out/'base.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes())
    (out/'labels.bin.gz').write_bytes(compressed)
    (out/'repair.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:result[k] for k in ['outputCompressedSha256','outputRawSha256','changedVoxelCount']}))
    print(json.dumps({k:dict(total=v['totalLabel24'],topology=v['cropTopology']) for k,v in connectivity.items()}))


if __name__ == '__main__':
    main()
