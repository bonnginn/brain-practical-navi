"""Compare stored MINC geometry with an explicit nominal-grid hypothesis; no mutation."""
import json
import h5py
import numpy as np
from diagnose_cavity_partial_volume import weighted_support
from audit_inferior_horn_cavity_grid import support_record
from explore_inferior_horn_cavity import connected_trial
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_third_ventricle_core_repair import digest


def main():
    work=ROOT/'work/anatomy-review';out=work/'inferior-horn-residual-107-grid-precision-v1.json'
    if out.exists():raise ValueError('Preserve evidence')
    data=(work/'inferior-horn-residual-107-partial-volume-v1.json').read_bytes()
    if digest(data)!='398392684a4afac54f7b8e88974ded4a4f2831f6413ad8ab47e6369e840edb97':raise ValueError('Diagnostic changed')
    r=json.loads(data)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,r['labelSha256'])
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    nominal_start=np.array([-98.1,-134.1,-72.1]);nominal_step=np.array([.3,.3,.3])
    metadata=[]
    with h5py.File(SOURCE/IMAGE_NAME) as f:
        for axis,name in enumerate(('xspace','yspace','zspace')):
            attrs=f['minc-2.0/dimensions'][name].attrs
            for key,stored,nominal in [('start',start[axis],nominal_start[axis]),('step',step[axis],nominal_step[axis])]:
                metadata.append(dict(axis=name,attribute=key,storageType=str(attrs.get_id(key).dtype),stored=float(stored),
                                     nominalHypothesis=float(nominal),equalsFloat32Nominal=bool(stored==float(np.float32(nominal)))))
    lo=np.array([416,407,162]);hi=np.array([445,425,196])
    mask,_=connected_trial(raw[tuple(slice(a,b) for a,b in zip(lo,hi))],np.array([429,417,175])-lo,65000)
    geo=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine=np.array(geo['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    records=[]
    for item in r['records']:
        p=np.array(item['xyz']);center=(p*spacing+origin-start)/step;nominal_center=(p*spacing+origin-nominal_start)/nominal_step
        if labels[tuple(p)]!=item['currentLabel']:raise ValueError('Label changed')
        actual=weighted_support(center,spacing/step,mask,lo)
        if actual!=item['weighted']['65000']:raise ValueError('Stored geometry replay differs')
        alt=weighted_support(nominal_center,spacing/nominal_step,mask,lo)
        support=support_record(nominal_center,spacing/nominal_step,mask,lo)
        cell_faces=np.stack([center-spacing/step/2,center+spacing/step/2])
        delta_mm=(cell_faces*step+start)-(cell_faces*nominal_step+nominal_start)
        records.append(dict(xyz=item['xyz'],currentLabel=item['currentLabel'],storedFullySupported=item['fullySupported'],
                            storedFraction=actual['locatorVolumeFraction'],nominalFraction=alt['locatorVolumeFraction'],
                            nominalFullySupported=support['fullySupported'],maxFaceDisplacementMm=float(np.abs(delta_mm).max()),
                            selectedForPriorVisualReview=bool(item['currentLabel']==0 and not item['touchesCropFace'] and actual['outsideCropVolumeFraction']==0 and actual['locatorVolumeFraction']>=.99)))
    reviewed=[p for p in records if p['selectedForPriorVisualReview']]
    summary=dict(reviewedCount=len(reviewed),reviewedStoredFull=sum(p['storedFullySupported'] for p in reviewed),
                 reviewedNominalFull=sum(p['nominalFullySupported'] for p in reviewed),
                 allUnlabelledNominalFull=sum(p['currentLabel']==0 and p['nominalFullySupported'] for p in records),
                 maxReviewedFaceDisplacementMm=max(p['maxFaceDisplacementMm'] for p in reviewed))
    result=dict(inputReportSha256=digest(data),sourceSha256=IMAGE_SHA,labelSha256=r['labelSha256'],metadata=metadata,
                summary=summary,records=records,mutation=False,adopted=False,
                limitation='Nominal geometry is a diagnostic hypothesis, not a replacement transform. Stored attributes remain authoritative. Float32-roundtrip equality is evidence of representation precision, not proof of anatomical boundary or permission to round all coordinates.')
    out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(metadata=metadata,summary=summary)))


if __name__=='__main__':main()
