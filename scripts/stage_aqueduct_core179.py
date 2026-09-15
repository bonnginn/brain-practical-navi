"""Stage a reviewed partial aqueduct core, preserving both unresolved transitions."""
import gzip
import json
import numpy as np
from scipy import ndimage
from explore_aqueduct_continuity import SHA as SOURCE_SHA
from stage_lateral_crop34 import ROOT, digest, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_lateral_detached547 import validate_review

LOCATOR='work/anatomy-review/aqueduct-enclosed-continuity-2026-09-08-majority-v1/candidate.json'
LOCATOR_SHA='400c889260474100be776389bcb9819e3e442c5381fce40d406283708cc37f44'
REVIEWS={
    'x':'5bb26f58c852eb93a46c2a2025fcac643120ebd31410006a3d3bcc7f774dd871',
    'y':'b4a558cccca3078570f90b8726837110ad1afb018eb9821a2f3995c4a610b06a',
    'z':'66b007528e90de44bcd1f7063d77e6d0f3b231e0a7dc350b66e0c939d87007a7',
}


def replay(labels, entries, reverse=False):
    if (len(entries)!=179 or any(type(p.get('before')) is not int or p['before'] not in (0,27)
            or type(p.get('after')) is not int or p['after']!=41 for p in entries)
            or sum(p['before']==0 for p in entries)!=64):
        raise ValueError('Expected exactly 64 zero and 115 brainstem cells to partial ID41')
    points=np.asarray([p['xyz'] for p in entries])
    if (points.shape!=(179,3) or points.dtype.kind not in 'iu' or len(np.unique(points,axis=0))!=179
            or np.any(points<0) or np.any(points>=labels.shape)):
        raise ValueError('Invalid coordinates')
    old=np.asarray([p['before'] for p in entries],dtype=np.uint8)
    if np.any(labels[tuple(points.T)]!=(41 if reverse else old)):
        raise ValueError('Conflicting source labels')
    out=labels.copy();out[tuple(points.T)]=old if reverse else 41
    return out


def reviewed_entries():
    data=(ROOT/LOCATOR).read_bytes();locator=json.loads(data)
    if (digest(data)!=LOCATOR_SHA or locator['inputSha256']!=SOURCE_SHA
            or locator['candidateCount']!=273 or locator['adopted'] or locator['labelMutation']):
        raise ValueError('Locator changed')
    all_points=[p['xyz'] for p in locator['points']]
    # This bounds a deliberately PARTIAL reviewed core, not the anatomical ends.
    # The complete 273-cell locator was inspected in XYZ before this selection.
    chosen=[p for p in locator['points'] if 124<=p['xyz'][2]<=135]
    if len(chosen)!=179 or any(p['weightedSupportFraction']<.5 or p['weightedOutsideCropFraction']!=0 for p in chosen):
        raise ValueError('Reviewed core changed')
    entries=[dict(xyz=p['xyz'],before=p['before'],after=41) for p in chosen]
    evidence=[dict(path=LOCATOR,sha256=LOCATOR_SHA,scope='Enclosed-lumen locator and finite volume overlap; not sole anatomical evidence')]
    for axis,sha in REVIEWS.items():
        path=ROOT/f'work/anatomy-review/aqueduct273-2026-09-08-series-{axis}-v1/report.json'
        data=path.read_bytes();report=json.loads(data)
        if digest(data)!=sha or report.get('labelId')!=41:
            raise ValueError('Review changed')
        points=validate_review(report,axis,expected_sha=SOURCE_SHA,expected_count=273)
        if points.tolist()!=all_points or report['candidateBeforeLabels']!=[p['before'] for p in locator['points']]:
            raise ValueError('Reviewed candidate set differs')
        for figure in report['figures']:
            if digest((path.parent/figure['path']).read_bytes())!=figure['sha256']:raise ValueError('Figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=sha,
            visuallyInspectedFigures=report['figures'],scope='All candidate extent reviewed; adoption is only the explicit 179-cell subset'))
    prior=[];selected={tuple(p['xyz']) for p in entries}
    for path in sorted((ROOT/'segmentation-patches/review').glob('brainstem-*-adoption-*.json')):
        data=path.read_bytes();record=json.loads(data)
        points=record.get('points',[])
        if not points:raise ValueError('Cannot inspect earlier brainstem correction')
        xyz=[p['xyz'] if isinstance(p,dict) else p for p in points]
        overlap=sorted(selected.intersection(map(tuple,xyz)))
        if overlap:raise ValueError('Prior brainstem repair overlaps; explicit reassessment required')
        prior.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(data),overlapCount=0))
    return entries,evidence,prior


def main():
    out=ROOT/'work/anatomy-review/aqueduct-core179-stage-v1'
    if out.exists():raise ValueError('Preserve prior stage')
    entries,evidence,prior=reviewed_entries()
    _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,SOURCE_SHA)
    after=replay(before,entries)
    if np.count_nonzero(after!=before)!=179 or not np.array_equal(replay(after,entries,True),before):raise ValueError('Full-volume replay failed')
    cc,count=ndimage.label(after==41,ndimage.generate_binary_structure(3,1))
    if count!=1 or int(np.count_nonzero(cc))!=195:raise ValueError('Partial aqueduct continuity differs')
    compressed=DEFAULT_LABELS.read_bytes();raw=gzip.decompress(compressed)
    staged=gzip.compress(raw[:10]+after.tobytes(order='F'),mtime=0)
    record=dict(beforeSha256=SOURCE_SHA,afterSha256=digest(staged),afterRawVoxelSha256=digest(after.tobytes(order='F')),
        points=entries,count=179,transition='mixed-to-41',evidence=evidence,priorBrainstemRepairs=prior,
        countsBefore={str(k):int((before==k).sum()) for k in (0,27,41)},
        countsAfter={str(k):int((after==k).sum()) for k in (0,27,41)},sixNeighbourComponentsAfter=1,
        heldLocatorCount=94,partialExtent=True,status='AI-image-reviewed-work-stage-only',adopted=False,expertReviewed=False,publicMutation=False,
        rationale='All 37 raw300 comparison sheets (111 planes: X318–335, Y330–368, Z180–233) reviewed. '
          'The selected central 179 cells follow the visible lumen between tectal and tegmental tissue, continuous with retained partial ID41. '
          '64 omissions and 115 existing brainstem-labelled lumen cells are reclassified. Finite native-cell overlap supports the inspected cavity margins. '
          'The working extent app Z124–135 is deliberately inside the reviewed channel, not a proposed anatomical start or end.',
        limitation='Not expert review or complete aqueduct segmentation. Other 94 locator cells, both ventricular transitions and partial-volume margins '
          'remain unadopted; no threshold-driven naming of connected cavities. Original 16 ID41 cells are preserved, not newly validated as full boundaries. '
          'No new native100 review. Procedural block aqueduct is a separate schematic, not this image-derived segmentation. '
          'Mesh synchronization and product adoption pending.')
    out.mkdir();(out/'before.bin.gz').write_bytes(compressed);(out/'labels.bin.gz').write_bytes(staged)
    (out/'repair.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in record.items() if k not in ('points','evidence','priorBrainstemRepairs')}))
    print('recordSha256',digest((out/'repair.json').read_bytes()))


if __name__=='__main__':main()
