"""Preflight and install fixed image-reviewed developmental cerebellar repairs."""
import json,hashlib,argparse
import numpy as np
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
from adopt_registered_red_nuclei import encode

BASE_SHA='86e3b22dc7ce69cf31c5ba821e980ce283a366fd952bf46ce880efd8f3127e14'
FINAL_SHA='294379b727b7263b6d60af7f693ebb27ab9e75a149844ff42535d7399dc0acae'
STAGE=ROOT/'work/anatomy-review/cerebellar-support-stage-v1'
RECORD=ROOT/'segmentation-patches/review/cerebellar-support-adoption-2026-09-06.json'
BASE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-support-86e3.bin.gz'
sha=lambda b:hashlib.sha256(b).hexdigest()


def plan(component=2532):
    base_sha,final_sha,stage,record,base=BASE_SHA,FINAL_SHA,STAGE,RECORD,BASE
    count,retained,field=348,211,'cerebellarSupportAudit'
    evidence=ROOT/'work/anatomy-review/cerebellar-support-difference-v2/report.json'
    evidence_sha='c919f87a92c447fcc5bb9ab6f45d6f591f0a472fcd35ada61b232eedf03d2b40'
    location='superior cerebellar surface gap'
    if component==2274:
        base_sha=FINAL_SHA;final_sha='2fc863aee8009ad9280dd2dd5fd2a9e8fa91de7f84a3ec5f59764317972c4cd9'
        stage=ROOT/'work/anatomy-review/cerebellar-support-2274-stage-v1'
        record=ROOT/'segmentation-patches/review/cerebellar-support-2274-adoption-2026-09-06.json'
        base=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-2274-2943.bin.gz'
        count,retained,field=52,376,'cerebellarSupport2274Audit'
        evidence=ROOT/'work/anatomy-review/cerebellar-support-2274-difference-v1/report.json'
        evidence_sha='06fbde1586dd5e8bbbd309eef06e99d0240c151bda7bf1a4dab2a956a5ad4eed'
    elif component==997:
        base_sha='2fc863aee8009ad9280dd2dd5fd2a9e8fa91de7f84a3ec5f59764317972c4cd9'
        final_sha='190f88dc05345e36b2e556829eb7882b6d01d0a67240b7738c1ab58820cd5548'
        stage=ROOT/'work/anatomy-review/cerebellar-support-997-stage-v1'
        record=ROOT/'segmentation-patches/review/cerebellar-support-997-adoption-2026-09-06.json'
        base=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-997-2fc8.bin.gz'
        count,retained,field=259,748,'cerebellarSupport997Audit'
        evidence=ROOT/'work/anatomy-review/cerebellar-support-997-difference-v1/report.json'
        evidence_sha='add17b5be8e679fb3669f1fd2300ff71752815361734fc4b95795c5dc124f5fe'
        location='left inferomedial cerebellar surface spaces'
    elif component==1393:
        base_sha='190f88dc05345e36b2e556829eb7882b6d01d0a67240b7738c1ab58820cd5548'
        final_sha='09088a9cf76b8c0578e96f21b9e35077ef345fd90bebc5294308e1603262bb34'
        stage=ROOT/'work/anatomy-review/cerebellar-support-1393-stage-v1'
        record=ROOT/'segmentation-patches/review/cerebellar-support-1393-adoption-2026-09-06.json'
        base=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-1393-190f.bin.gz'
        count,retained,field=372,571,'cerebellarSupport1393Audit'
        evidence=ROOT/'work/anatomy-review/cerebellar-support-1393-difference-v1/report.json'
        evidence_sha='2c79455c2889f6138e5371bb937f703585d398b55780248834684ac5e339a7b9'
        location='right inferomedial cerebellar surface spaces'
    elif component==1603:
        base_sha='09088a9cf76b8c0578e96f21b9e35077ef345fd90bebc5294308e1603262bb34'
        final_sha='c9899d58afb39c1eb4b9873b0a39ecb5e44c7e0de895874a2284cfa8bd627f56'
        stage=ROOT/'work/anatomy-review/cerebellar-support-1603-stage-v1'
        record=ROOT/'segmentation-patches/review/cerebellar-support-1603-adoption-2026-09-06.json'
        base=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-1603-0908.bin.gz'
        count,retained,field=229,425,'cerebellarSupport1603Audit'
        evidence=ROOT/'work/anatomy-review/cerebellar-support-1603-difference-v1/report.json'
        evidence_sha='d93a7c5a9d170177dae5741974f8f695373ed9134932bf8b021337c5e50857db'
        location='right medial cerebellar surface gap'
    elif component==843:
        base_sha='c9899d58afb39c1eb4b9873b0a39ecb5e44c7e0de895874a2284cfa8bd627f56'
        final_sha='212df1a6130977c23eb4561a5f883a2bd7efecba5f2b870cc1bbc5eae1b80b3b'
        stage=ROOT/'work/anatomy-review/cerebellar-support-843-stage-v1'
        record=ROOT/'segmentation-patches/review/cerebellar-support-843-adoption-2026-09-07.json'
        base=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-843-c989.bin.gz'
        count,retained,field=3353,3914,'cerebellarSupport843Audit'
        evidence=ROOT/'work/anatomy-review/cerebellar-support-843-difference-v1/report.json'
        evidence_sha='edc56ccc4998e96de2b4dab8a8da9dc0f5135fca8e4224a73395523e9e217296'
        location='superior near-midline cerebellar surface spaces; 189 original500 planes, 9 original300 planes and 58 difference planes visually reviewed'
    elif component==1105:
        base_sha='212df1a6130977c23eb4561a5f883a2bd7efecba5f2b870cc1bbc5eae1b80b3b'
        final_sha='777b76921f99e22232dfedd58a165c17544a200101d9a403adc9f16d054d89ea'
        stage=ROOT/'work/anatomy-review/cerebellar-support-1105-stage-v1'
        record=ROOT/'segmentation-patches/review/cerebellar-support-1105-adoption-2026-09-07.json'
        base=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-1105-212d.bin.gz'
        count,retained,field=21290,18701,'cerebellarSupport1105Audit'
        evidence=ROOT/'work/anatomy-review/cerebellar-support-1105-difference-v1/report.json'
        evidence_sha='a1bf732509730e93fb9aff4cdf390b852e7332d4c35c34f96dce7c29a0379e2a'
        location='right outer cerebellar surface spaces; 364 original500 planes, 104 difference planes, 9 initial and 54 targeted original300 planes visually reviewed'
    elif component!=2532:raise ValueError('Unknown reviewed component')
    if sha(DEFAULT_LABELS.read_bytes()) not in (base_sha,final_sha):raise ValueError('Unrelated current volume')
    if sha(evidence.read_bytes())!=evidence_sha:raise ValueError('Review changed')
    review=json.loads(evidence.read_text())
    if len(review['blockMaskImpact'])!=55 or any(r['changedMaskVoxels'] for r in review['blockMaskImpact']):raise ValueError('Mesh impact differs')
    for f in review['figures']:
        if sha((evidence.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Figure changed')
    r=json.loads((stage/'candidate.json').read_text())
    if r['inputCompressedSha256']!=base_sha or r['outputCompressedSha256']!=final_sha or r['retainedFromOriginalComponent']!=retained:raise ValueError('Candidate identity changed')
    _,_,old=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,base_sha)
    _,_,new=read_browser_volume(stage/'labels.bin.gz',MAGIC_LABELS,final_sha)
    if sha(old.tobytes(order='F'))!=r['inputRawSha256']:raise ValueError('Input raw hash differs')
    rebuilt=old.copy()
    for p in r['points']:
        point=tuple(p['xyz'])
        if p['before'] not in (28,29) or p['after']!=0 or rebuilt[point]!=p['before']:raise ValueError('Invalid transition')
        rebuilt[point]=0
    if len(r['points'])!=count or np.count_nonzero(old!=rebuilt)!=count or not np.array_equal(new,rebuilt):raise ValueError('Unexpected difference')
    data=encode(new)
    if sha(data)!=final_sha or sha(new.tobytes(order='F'))!=r['outputRawSha256']:raise ValueError('Replay differs')
    r.update(adopted=True,projectAdopted=True,expertReviewed=False,status='AI-image-reviewed-project-adopted-development-only',
        reviewEvidence=dict(path=evidence.relative_to(ROOT).as_posix(),sha256=sha(evidence.read_bytes()),record=review),
        rationale=f'Image-reviewed {location}; {count} supported removals, {retained} uncertain edge points retained. Not a cortical/parcellation refinement or expert ground truth.')
    if component==1105:
        native=ROOT/'work/anatomy-review/cerebellar-support-1105-native-v1/report.json'
        if sha(native.read_bytes())!='6bf64dd26589f3407e304b3f4742b51408587ac9333af74d597e1b3f363b99ee':raise ValueError('Native review changed')
        native_review=json.loads(native.read_text())
        if native_review['baseSha256']!=base_sha or native_review['candidateSha256']!=final_sha or len(native_review['figures'])!=18:raise ValueError('Native review identity differs')
        for f in native_review['figures']:
            if sha((native.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Native figure changed')
        r['nativeReviewEvidence']=dict(path=native.relative_to(ROOT).as_posix(),sha256=sha(native.read_bytes()),record=native_review,visuallyReviewedPlanes=54)
    rb=(json.dumps(r,indent=2)+'\n').encode();bb=(stage/'base.bin.gz').read_bytes()
    for p,b in [(record,rb),(base,bb)]:
        if p.exists() and p.read_bytes()!=b:raise ValueError('Record or fixture conflict')
    mp=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json';meta=json.loads(mp.read_text(encoding='utf-8'))
    if meta['rawVoxelSha256'] not in (r['inputRawSha256'],r['outputRawSha256']):raise ValueError('Metadata source changed')
    meta['rawVoxelSha256']=r['outputRawSha256']
    for label in [0,28,29]:meta['labelCounts'][str(label)]=int((new==label).sum())
    meta[field]=dict(record=record.relative_to(ROOT).as_posix(),recordSha256=sha(rb),changedVoxelCount=count,projectAdopted=True,expertReviewed=False,changedBlockPartMasks=[])
    return [(base,bb),(record,rb),(DEFAULT_LABELS,data),(mp,(json.dumps(meta,ensure_ascii=False,indent=2)+'\n').encode())]


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--component',type=int,choices=[2532,2274,997,1393,1603,843,1105],default=2532)
    for p,b in plan(parser.parse_args().component):p.write_bytes(b)
    print('Installed developmental cerebellar repair: '+sha(DEFAULT_LABELS.read_bytes()))
