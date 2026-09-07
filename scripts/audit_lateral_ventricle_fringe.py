"""Read-only lateral ventricular fringe inventory; no filling or adoption."""
import json
import numpy as np
from scipy.ndimage import binary_dilation, generate_binary_structure, label
from audit_cerebellar_finite_support import support_corner_minima
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from review_fornix_native300 import CURRENT_SHA


def main():
    out=ROOT/'work/anatomy-review/lateral-ventricle-fringe-v1'
    if out.exists():raise ValueError('Preserve evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,CURRENT_SHA)
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=np.asarray(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    results=[]
    for target in (23,24):
        mask=labels==target
        points=np.argwhere(binary_dilation(mask,structure=generate_binary_structure(3,1))&(labels==0))
        minima=support_corner_minima(raw,((points-.5)*spacing+origin-start)/step,((points+.5)*spacing+origin-start)/step)
        selected=points[minima>=65000]
        candidate=np.zeros(labels.shape,dtype=bool);candidate[tuple(selected.T)]=True
        cc,n=label(candidate,structure=generate_binary_structure(3,1))
        selected_ids=cc[tuple(selected.T)]
        components=[]
        for ident in range(1,n+1):
            p=selected[selected_ids==ident]
            components.append(dict(id=ident,count=len(p),min=p.min(axis=0).tolist(),max=p.max(axis=0).tolist(),points=p.tolist()))
        components.sort(key=lambda c:(-c['count'],c['id']))
        results.append(dict(target=target,considered=len(points),selectedCount=len(selected),components=components))
    out.mkdir()
    report=dict(labelSha256=CURRENT_SHA,sourceSha256=IMAGE_SHA,results=results,mutation=False,adopted=False,
        selection='Single face-neighbour fringe, existing label0, registered300 support corner minimum>=65000; components use6 connectivity.',
        limitation='Exploratory prioritization only. No claim of cavity identity, no closure/flood fill, no repeated growth, no replacement of anatomy with intensity.')
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps([dict(target=r['target'],considered=r['considered'],selected=r['selectedCount'],componentCount=len(r['components']),largest=[{k:c[k] for k in ('id','count','min','max')} for c in r['components'][:5]]) for r in results]))


if __name__=='__main__':main()
