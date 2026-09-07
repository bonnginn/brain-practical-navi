"""Exact box overlap with threshold locators; diagnostic, never anatomical adoption."""
import json
import numpy as np
from audit_fornix_draft_grid import intersecting_cells
from explore_inferior_horn_cavity import connected_trial
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_third_ventricle_core_repair import digest


def weighted_support(center, size, mask, crop_low):
    center=np.asarray(center,dtype=float);size=np.asarray(size,dtype=float)
    if center.shape!=(3,) or size.shape!=(3,) or not np.isfinite([center,size]).all() or np.any(size<=0):
        raise ValueError('Invalid cell geometry')
    if mask.ndim!=3 or mask.dtype!=np.bool_:raise ValueError('Expected boolean 3D mask')
    low=center-size/2;high=center+size/2
    cells=np.asarray(intersecting_cells(low,high),dtype=int)
    weights=np.prod(np.maximum(0,np.minimum(high,cells+.5)-np.maximum(low,cells-.5)),axis=1)
    total=float(np.prod(size))
    if not np.isclose(weights.sum(),total,rtol=1e-10,atol=1e-10):raise ValueError('Incomplete overlap enumeration')
    local=cells-np.asarray(crop_low,dtype=int)
    inside=np.all((local>=0)&(local<np.asarray(mask.shape)),axis=1)
    selected=np.zeros(len(cells),bool);selected[inside]=mask[tuple(local[inside].T)]
    return dict(locatorVolumeFraction=float(weights[selected].sum()/total),
                outsideCropVolumeFraction=float(weights[~inside].sum()/total),
                sourceCellCount=len(cells),unweightedLocatorFraction=float(selected.mean()))


def main():
    work=ROOT/'work/anatomy-review';out=work/'inferior-horn-residual-107-partial-volume-v1.json'
    if out.exists():raise ValueError('Preserve evidence')
    grid_path=work/'inferior-horn-residual-107-grid-v1.json'
    grid_bytes=grid_path.read_bytes()
    if digest(grid_bytes)!='ee1e8249830e3441d745fefe1089dcd04b7e83b9c1fb266519eae41d3764ba2d':raise ValueError('Grid changed')
    grid=json.loads(grid_bytes)
    exploration_bytes=(work/'inferior-horn-residual-107-exploration-v1/report.json').read_bytes()
    if digest(exploration_bytes)!=grid['explorationReportSha256']:raise ValueError('Exploration changed')
    e=json.loads(exploration_bytes)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,grid['labelSha256'])
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    low=np.array(e['cropNativeXYZ']['low']);high=np.array(e['cropNativeXYZ']['highExclusive'])
    crop=raw[tuple(slice(a,b) for a,b in zip(low,high))]
    geo=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine=np.array(geo['affine']);spacing=np.diag(affine)[:3];origin=affine[:3,3]
    if not np.allclose(affine[:3,:3],np.diag(spacing)) or np.any(spacing<=0) or np.any(step<=0):raise ValueError('Unsupported geometry')
    masks={}
    for threshold in [64500,65000,65400]:
        mask,faces=connected_trial(crop,np.array(e['seedNativeXYZ'])-low,threshold)
        if int(mask.sum())!=e['trials'][str(threshold)]['count'] or faces!=e['trials'][str(threshold)]['cropFaceContacts']:raise ValueError('Replay mismatch')
        masks[threshold]=mask
    records=[]
    for r in grid['records']:
        p=np.array(r['xyz']);center=(p*spacing+origin-start)/step
        if int(labels[tuple(p)])!=r['currentLabel'] or not np.allclose(center,r['sourceCenter']):raise ValueError('Grid coordinate mismatch')
        weighted={str(t):weighted_support(center,spacing/step,mask,low) for t,mask in masks.items()}
        records.append(dict(xyz=r['xyz'],currentLabel=r['currentLabel'],touchesCropFace=r['touchesCropFace'],
                            fullySupported=r['fullySupported'],weighted=weighted))
    interior=[r for r in records if r['currentLabel']==0 and not r['touchesCropFace'] and r['weighted']['65000']['outsideCropVolumeFraction']==0]
    distribution={str(t):{str(f):sum(r['weighted'][str(t)]['locatorVolumeFraction']>=f for r in interior) for f in [.5,.75,.9,.95,.99]} for t in masks}
    result=dict(gridSha256=digest(grid_bytes),labelSha256=grid['labelSha256'],sourceSha256=IMAGE_SHA,
                records=records,unlabelledInteriorCount=len(interior),cumulativeDiagnosticCounts=distribution,
                adopted=False,mutation=False,
                limitation='Fractions measure overlap with a threshold locator, not true CSF probability or an anatomical boundary. No fraction is an adoption criterion. Crop-clipped cells remain distinguishable. No interpolation, label overwrite or bridge.')
    out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(unlabelledInteriorCount=len(interior),cumulativeDiagnosticCounts=distribution)))


if __name__=='__main__':main()
