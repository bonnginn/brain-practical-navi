"""Finite application-cell mapping of the bounded cavity exploration, not adoption."""
import json
import argparse
import numpy as np
from explore_inferior_horn_cavity import connected_trial
from audit_fornix_draft_grid import intersecting_cells
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from diagnose_inferior_horn_sampling import SHA
from stage_third_ventricle_core_repair import digest

REPORT_SHA='8f9bcf86be166c660c0ae8e18bcd10a2e97277bf2a17ad386a6212d723d31180'


def support_record(center,spacing_ratio,mask,low):
    cells=np.asarray(intersecting_cells(center-spacing_ratio/2,center+spacing_ratio/2),dtype=int)
    local=cells-low
    inside=np.all((local>=0)&(local<np.array(mask.shape)),axis=1)
    supported=np.zeros(len(cells),dtype=bool)
    supported[inside]=mask[tuple(local[inside].T)]
    edge=np.any((local==0)|(local==np.array(mask.shape)-1),axis=1)&inside
    return dict(sourceCells=len(cells),outsideCropCells=int((~inside).sum()),
                outsideExplorationCells=int((~supported).sum()),touchesCropFace=bool(edge.any()),
                fullySupported=bool(supported.all() and not edge.any()))


def weighted_support_record(center,spacing_ratio,mask,low):
    """Exact geometric overlap of finite cells; not an anatomical decision."""
    center=np.asarray(center,dtype=float);ratio=np.asarray(spacing_ratio,dtype=float)
    low=np.asarray(low,dtype=int)
    if center.shape!=(3,) or ratio.shape!=(3,) or low.shape!=(3,) or not np.isfinite(center).all() or not np.isfinite(ratio).all() or np.any(ratio<=0):
        raise ValueError('Invalid finite-cell geometry')
    lo=center-ratio/2;hi=center+ratio/2
    cells=np.asarray(intersecting_cells(lo,hi),dtype=int)
    widths=np.maximum(0,np.minimum(hi,cells+.5)-np.maximum(lo,cells-.5))
    volumes=np.prod(widths,axis=1);total=float(np.prod(ratio))
    if not np.isclose(volumes.sum(),total,rtol=1e-9,atol=1e-10):raise ValueError('Incomplete cell overlap')
    local=cells-low;inside=np.all((local>=0)&(local<np.asarray(mask.shape)),axis=1)
    supported=np.zeros(len(cells),dtype=bool);supported[inside]=mask[tuple(local[inside].T)]
    return dict(weightedSupportFraction=float(np.clip(volumes[supported].sum()/total,0,1)),
                weightedOutsideCropFraction=float(np.clip(volumes[~inside].sum()/total,0,1)))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--outer-after19',action='store_true')
    parser.add_argument('--residual-51',action='store_true')
    parser.add_argument('--residual-27',action='store_true')
    parser.add_argument('--residual-107',action='store_true')
    args=parser.parse_args()
    if sum([args.residual_51,args.residual_27,args.residual_107,args.outer_after19])>1:parser.error('Select one residual mode')
    report_sha='63a97f23913bad8038cbfd4a6fd232a62855c94e207b9072f65e450b4a9e5572' if args.residual_51 else REPORT_SHA
    label_sha='5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba' if args.residual_51 else SHA
    if args.residual_27:
        report_sha='1f407c19380f040d3f4bec96cb9efd2f767ad5d250ae9096f0f74811ed5b5a59'
        label_sha='681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88'
    out=ROOT/'work/anatomy-review/inferior-horn-cavity-grid-v1.json'
    if args.residual_107:
        report_sha='6a07f6317214640d5d432b9d300e22c525614f695a92700a7f3ca362e1ba26e4'
        label_sha='ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb'
        out=ROOT/'work/anatomy-review/inferior-horn-residual-107-grid-v1.json'
    if args.residual_51:out=ROOT/'work/anatomy-review/inferior-horn-residual-51-grid-v1.json'
    if args.residual_27:out=ROOT/'work/anatomy-review/inferior-horn-residual-27-grid-v1.json'
    if args.outer_after19:
        report_sha='e759bd719aeb572cf2b06b0cc1ea22ad1d355425d3a4e25563fec49e5935693a'
        label_sha='58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7'
        out=ROOT/'work/anatomy-review/inferior-horn-outer-after19-grid-v1.json'
    if out.exists():raise ValueError('Preserve evidence')
    path=ROOT/'work/anatomy-review/inferior-horn-cavity-exploration-v1/report.json'
    if args.residual_107:path=ROOT/'work/anatomy-review/inferior-horn-residual-107-exploration-v1/report.json'
    if args.residual_51:path=ROOT/'work/anatomy-review/inferior-horn-residual-51-exploration-v1/report.json'
    if args.residual_27:path=ROOT/'work/anatomy-review/inferior-horn-residual-27-exploration-v1/report.json'
    if args.outer_after19:path=ROOT/'work/anatomy-review/inferior-horn-outer-after19-exploration-v1/report.json'
    if digest(path.read_bytes())!=report_sha:raise ValueError('Exploration report changed')
    report=json.loads(path.read_text(encoding='utf-8'))
    if report['labelSha256']!=label_sha or report['sourceSha256']!=IMAGE_SHA:raise ValueError('Input identity mismatch')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,label_sha)
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    low=np.array(report['cropNativeXYZ']['low']);high=np.array(report['cropNativeXYZ']['highExclusive'])
    crop=raw[tuple(slice(a,b) for a,b in zip(low,high))]
    mask,faces=connected_trial(crop,np.array(report['seedNativeXYZ'])-low,65000)
    if int(mask.sum())!=report['trials']['65000']['count'] or faces!=report['trials']['65000']['cropFaceContacts']:
        raise ValueError('Exploration replay mismatch')
    geo=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine=np.asarray(geo['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    if not np.allclose(affine[:3,:3],np.diag(spacing)) or np.any(spacing<=0) or np.any(step<=0):raise ValueError('Unsupported geometry')
    points=np.argwhere(mask)+low
    mapped=np.unique(np.rint((points*step+start-origin)/spacing).astype(int),axis=0)
    records=[]
    for p in mapped:
        if np.any(p<0) or np.any(p>=labels.shape):raise ValueError('Outside application grid')
        center=(p*spacing+origin-start)/step
        support=support_record(center,spacing/step,mask,low)
        records.append(dict(xyz=p.tolist(),currentLabel=int(labels[tuple(p)]),sourceCenter=center.tolist(),**support))
    candidates=[r['xyz'] for r in records if r['currentLabel']==0 and r['fullySupported']]
    counts=dict(mappedAppVoxels=len(records),finiteSupported=sum(r['fullySupported'] for r in records),
                unlabelledFiniteCandidates=len(candidates),nonzeroOtherLabels=sum(r['currentLabel'] not in [0,24] for r in records),
                cropEdgeOrOutside=sum(r['touchesCropFace'] or r['outsideCropCells']>0 for r in records))
    result=dict(explorationReportSha256=report_sha,labelSha256=label_sha,sourceSha256=IMAGE_SHA,
                counts=counts,records=records,candidateAppXYZ=candidates,mutation=False,adopted=False,
                limitation='Finite support is inside a threshold exploration, not proof of an anatomical boundary. Candidate application-cell differences still require raw/adjacent/orthogonal review. Crop-edge cells excluded rather than silently truncated.')
    out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(counts))


if __name__=='__main__':main()
