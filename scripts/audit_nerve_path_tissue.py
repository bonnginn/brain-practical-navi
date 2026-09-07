"""Sample existing nerve centrelines in source tissue; never infer nerve anatomy."""
import json
import hashlib
import numpy as np
from scipy.ndimage import map_coordinates
from audit_nerve_origin_context import ROOT,LABEL_SHA,read_rings,display_affine
from build_section_structure_meshes import ORIGIN_ZYX
from build_orthogonal_review_bundle import DEFAULT_LABELS,DEFAULT_IMAGE,MAGIC_LABELS,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume


def sample_path(centers,inverse,raw,labels):
    """Sample ring centres only; reject invalid coordinates instead of clipping."""
    centers=np.asarray(centers,dtype=float)
    inverse=np.asarray(inverse,dtype=float)
    if centers.ndim!=2 or centers.shape[1]!=3 or len(centers)<2 or not np.isfinite(centers).all():
        raise ValueError('Invalid path centres')
    if inverse.shape!=(4,4) or not np.isfinite(inverse).all() or not np.allclose(inverse[3],[0,0,0,1]):
        raise ValueError('Invalid inverse affine')
    if raw.ndim!=3 or raw.shape!=labels.shape:raise ValueError('Volume shape mismatch')
    coords=centers@inverse[:3,:3].T+inverse[:3,3]
    if np.any(coords<0) or np.any(coords>np.array(raw.shape)-1):raise ValueError('Path outside source')
    intensity=map_coordinates(raw,coords.T,order=1,prefilter=False,output=np.float32)
    values=map_coordinates(labels,coords.T,order=0,prefilter=False)
    distances=np.r_[0,np.cumsum(np.linalg.norm(np.diff(centers,axis=0),axis=1))]
    return [dict(ringIndex=i,distanceFromOriginMm=float(distances[i]),appXYZ=coords[i].tolist(),sourceGray=float(intensity[i]),label=int(values[i])) for i in range(len(coords))]


def main():
    out=ROOT/'work/anatomy-review/nerve-path-tissue-v1.json'
    if out.exists():raise ValueError('Evidence exists')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine=display_affine(geometry['affine'],ORIGIN_ZYX[::-1]);inverse=np.linalg.inv(affine)
    source=ROOT/'work/anatomy-review/nerve-origin-context-v2.json'
    if hashlib.sha256(source.read_bytes()).hexdigest()!='790e28acc889afe13e9c0ea393a959c35e421c3973807c68c8e3cc929a6c2faf':raise ValueError('Origin record changed')
    origins=json.loads(source.read_text(encoding='utf-8'))
    report=dict(sourceImageSha256=EXPECTED_IMAGE_SHA256,labelsSha256=LABEL_SHA,originRecordSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
        mutation=False,expertReviewed=False,displayAffine=affine.tolist(),
        caveat='Intensity and label intersections identify review sites, not real nerve fibres, a true root exit, or permission to trim/move a path.',paths=[])
    for entry in origins['origins']:
        data=(ROOT/'public/atlas'/entry['file']).read_bytes()
        expected=next(m['sha256'] for m in origins['meshes'] if m['file']==entry['file'])
        if hashlib.sha256(data).hexdigest()!=expected:raise ValueError('Mesh changed')
        centers=read_rings(data,entry['id']).mean(1)
        samples=sample_path(centers,inverse,raw,labels)
        values=np.array([sample['label'] for sample in samples])
        report['paths'].append(dict(id=entry['id'],name=entry['name'],meshSha256=expected,samples=samples,
            labelIntersectionCounts={str(v):int((values==v).sum()) for v in np.unique(values)},
            scope='Only sampled existing ring centres; not the whole tube surface or continuous histological tracing'))
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for path in report['paths'][:2]:print(json.dumps(path,ensure_ascii=False))


if __name__=='__main__':main()
