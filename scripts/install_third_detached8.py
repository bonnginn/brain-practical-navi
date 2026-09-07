"""Validate the reversible eight-voxel repair before any development writes."""
import argparse
import gzip
import json
import numpy as np
from stage_third_detached8 import ROOT, SHA, POINTS, replay, digest
from build_section_ventricle_meshes import build_assets, SOURCE, ATLAS

FINAL = 'b45c0669122b628529f56e73af06fa1cb697b621da99d51c8b921b136ea52463'
RAW = 'e23a6272e399a4ba696c7f60157120281a994f7cc9949a86aaa9dbfbb146bc4c'
def serialized(value):return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')


def plan():
    work = ROOT/'work/anatomy-review'
    stage = work/'third-detached8-stage-v1'
    record_bytes = (stage/'repair.json').read_bytes()
    if digest(record_bytes) != '0841a4435a88132d698d4f905ebfedff028d1e1f589c3ab6359e1a7c76a65ba1':raise ValueError('Stage record changed')
    record = json.loads(record_bytes)
    base = (stage/'before.bin.gz').read_bytes()
    if digest(base) != SHA:raise ValueError('Baseline changed')
    before_raw = gzip.decompress(base)
    before = np.frombuffer(before_raw,np.uint8,offset=10).reshape((394,466,378),order='F')
    after = replay(before)
    data = gzip.compress(before_raw[:10]+after.tobytes(order='F'),mtime=0)
    if digest(data)!=FINAL or digest(after.tobytes(order='F'))!=RAW:raise ValueError('Reconstruction differs')
    if not np.array_equal(replay(after,True),before):raise ValueError('Reverse differs')
    if record['points'] != [list(p) for p in POINTS]:raise ValueError('Stage points differ')
    if digest(SOURCE.read_bytes()) not in (SHA,FINAL):raise ValueError('Unrelated current labels')
    review_path = work/'third-detached8-difference-v1/report.json'
    review_bytes = review_path.read_bytes()
    if digest(review_bytes)!=record['differenceReportSha256']:raise ValueError('Review changed')
    review = json.loads(review_bytes)
    if review['points']!=record['points'] or len(review['figures'])!=13:raise ValueError('Review coverage changed')
    for f in review['figures']:
        if digest((review_path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Figure changed')
    impact = json.loads((work/'third-detached8-meshes-v1/report.json').read_text())
    manifest = json.loads((ATLAS/'specimen-blocks.json').read_text(encoding='utf-8'))
    identities = {(b,p['part']) for b,ps in manifest['specimens'].items() for p in ps}
    rows = impact['blockMaskImpact']
    if len(rows)!=55 or {(r['block'],r['part']) for r in rows}!=identities or any(r['changedMaskVoxels']!=0 for r in rows):raise ValueError('Block impact differs')
    if impact['inputSha256']!=SHA or impact['outputSha256']!=FINAL or impact['installationBlocked']:raise ValueError('Impact baseline differs')
    # All eight coordinates miss the retained 2x subsampling lattice. This
    # independently verifies no coarse input changes, not just report flags.
    if not np.array_equal(before[::2,::2,::2],after[::2,::2,::2]):raise ValueError('Coarse input changed')
    old_report, old_assets = build_assets(base)
    new_report, new_assets = build_assets(data)
    changed = []
    for name,payload in new_assets.items():
        current = (ATLAS/name).read_bytes()
        equal = json.loads(current) in (json.loads(old_assets[name]),json.loads(payload)) if name.endswith('.json') else current in (old_assets[name],payload)
        if not equal:raise ValueError('Unrelated current mesh: '+name)
        if name.endswith('.mesh') and payload!=old_assets[name]:changed.append(name)
    if set(changed)!={'section-current-third-ventricle.mesh','section-current-ventricular-system.mesh'}:raise ValueError('Section impact differs')
    record_path = ROOT/'segmentation-patches/review/third-detached8-adoption-2026-09-07.json'
    record.update(status='AI-image-reviewed-project-adopted-development-only',adopted=True,projectAdopted=True,
        expertReviewed=False,published=False,meshImpact=impact,sectionMeshImpact=dict(before=old_report,after=new_report,changedFiles=changed))
    record['limitation']='Local fringe only; neither a bridge nor complete ventricular segmentation. Integration tests/build/browser recorded separately. Not expert review or publication.'
    record_data = serialized(record)
    meta_path = ATLAS/'bigbrain-practical-segmentation-icbm500-validation.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (digest(before_raw[10:]),RAW):raise ValueError('Metadata baseline differs')
    meta['rawVoxelSha256']=RAW
    for ident in (0,25):meta['labelCounts'][str(ident)]=int(np.count_nonzero(after==ident))
    meta['thirdDetached8Audit']=dict(record=record_path.relative_to(ROOT).as_posix(),recordSha256=digest(record_data),changedVoxelCount=8,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[],changedSectionMeshes=changed)
    retained = [(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-third-detached8-ffb8.bin.gz',base),(record_path,record_data)]
    for path,payload in retained:
        if path.exists() and path.read_bytes()!=payload:raise ValueError('Retained evidence differs')
    return retained+[(SOURCE,data),(meta_path,serialized(meta))]+[(ATLAS/name,payload) for name,payload in new_assets.items()]


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true')
    args=parser.parse_args();changes=plan()
    if args.apply:
        for path,data in changes:path.write_bytes(data)
    print(json.dumps(dict(preflightPassed=True,applied=args.apply,files=[p.relative_to(ROOT).as_posix() for p,_ in changes])))
