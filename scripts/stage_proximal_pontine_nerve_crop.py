"""Candidate only: retain the existing proximal VII/VIII rings, without moving roots."""
import json
import struct
import hashlib
import numpy as np
from scipy.ndimage import map_coordinates
from audit_nerve_origin_context import ROOT,LABEL_SHA,display_affine
from build_section_structure_meshes import ORIGIN_ZYX
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume


def crop_rings(data,last_ring=7):
    if not isinstance(last_ring,int) or isinstance(last_ring,bool) or not 1<=last_ring<15:raise ValueError('Invalid cutoff')
    if len(data)<12 or data[:4]!=b'BNM3':raise ValueError('Invalid BNM3')
    n,f=struct.unpack_from('<II',data,4)
    if len(data)!=12+n*32+f*12:raise ValueError('Invalid BNM3 size')
    xyz=np.frombuffer(data,'<f4',n*3,12).reshape(n,3)
    normals=np.frombuffer(data,'<f4',n*3,12+n*12).reshape(n,3)
    shade=np.frombuffer(data,'<f4',n,12+n*24)
    regions=np.frombuffer(data,'<f4',n,12+n*28)
    faces=np.frombuffer(data,'<u4',f*3,12+n*32).reshape(f,3)
    if not np.isfinite(xyz).all() or np.any(faces>=n):raise ValueError('Invalid geometry')
    keep=np.ones(n,dtype=bool)
    for region in [34,35,36,37]:
        ids=np.flatnonzero(regions==region)
        if len(ids)!=160 or not np.all(np.diff(ids)==1):raise ValueError('Expected sixteen contiguous ten-sided rings')
        keep[ids[(last_ring+1)*10:]]=False
    lookup=np.full(n,-1,dtype=int);lookup[keep]=np.arange(keep.sum())
    retained_faces=lookup[faces[np.all(keep[faces],axis=1)]]
    out=b'BNM3'+struct.pack('<II',int(keep.sum()),len(retained_faces))
    for a in [xyz[keep],normals[keep],shade[keep],regions[keep]]:out+=a.astype('<f4').tobytes()
    out+=retained_faces.astype('<u4').tobytes()
    return out,xyz[:,[2,1,0]],regions,keep


def main():
    out=ROOT/'work/anatomy-review/proximal-pontine-crop-v1'
    if out.exists():raise ValueError('Evidence exists')
    source=ROOT/'public/atlas/overlay-nerves-pontine.mesh';data=source.read_bytes()
    origins=json.loads((ROOT/'work/anatomy-review/nerve-origin-context-v2.json').read_text(encoding='utf-8'))
    expected=next(m['sha256'] for m in origins['meshes'] if m['file']==source.name)
    if hashlib.sha256(data).hexdigest()!=expected:raise ValueError('Source mesh changed')
    candidate,xyz,regions,keep=crop_rings(data)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    inverse=np.linalg.inv(display_affine(geometry['affine'],ORIGIN_ZYX[::-1]))
    coords=xyz@inverse[:3,:3].T+inverse[:3,3]
    if np.any(coords<0) or np.any(coords>np.array(raw.shape)-1):raise ValueError('Mesh outside raw image')
    values=map_coordinates(raw,coords.T,order=1,prefilter=False,output=np.float32)
    records=[]
    for region in [34,35,36,37]:
        indices=np.flatnonzero(regions==region).reshape(16,10)
        records.append(dict(id=region,lastRetainedRing=7,rings=[dict(index=i,kept=bool(keep[ids[0]]),minRaw=float(values[ids].min()),maxRaw=float(values[ids].max()),surfaceVerticesBelow250=int((values[ids]<250).sum()),centerXYZ=coords[ids].mean(0).tolist()) for i,ids in enumerate(indices)]))
    out.mkdir(parents=True);(out/'before.mesh').write_bytes(data);(out/source.name).write_bytes(candidate)
    report=dict(adopted=False,expertReviewed=False,labelsSha256Context=LABEL_SHA,imageSha256=EXPECTED_IMAGE_SHA256,beforeSha256=expected,afterSha256=hashlib.sha256(candidate).hexdigest(),
        rationale='Investigate removal of unsupported distal extension while preserving existing proximal coordinates, radius and normals. Cutoff is a display scope, NOT an observed nerve endpoint. No root exit or full nerve is validated.',
        caveat='Raw intensity is only a collision screen; original anatomy and tube-surface review still required. Candidate is not installed.',paths=records)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps([dict(id=p['id'],terminal=p['rings'][7]) for p in records],indent=2))


if __name__=='__main__':main()
