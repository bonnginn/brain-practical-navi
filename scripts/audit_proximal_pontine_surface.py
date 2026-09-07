"""Finite surface sampling of the staged VII/VIII crop; not anatomical approval."""
import json,hashlib,struct
import numpy as np
from scipy.ndimage import map_coordinates
from audit_nerve_origin_context import ROOT,display_affine
from build_section_structure_meshes import ORIGIN_ZYX
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume


def main(trigeminal=False):
    folder=ROOT/'work/anatomy-review/proximal-pontine-crop-v1'
    output=folder/('trigeminal-surface-sampling.json' if trigeminal else 'surface-sampling.json')
    if output.exists():raise ValueError('Evidence exists')
    data=(folder/'overlay-nerves-pontine.mesh').read_bytes()
    if hashlib.sha256(data).hexdigest()!='1244f483c765ef084648a74bbad13cff78ea498d4edb9918e15812709e4fd823':raise ValueError('Candidate changed')
    n,f=struct.unpack_from('<II',data,4)
    xyz=np.frombuffer(data,'<f4',n*3,12).reshape(n,3)[:,[2,1,0]]
    regions=np.frombuffer(data,'<f4',n,12+n*28)
    faces=np.frombuffer(data,'<u4',f*3,12+n*32).reshape(f,3)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    inverse=np.linalg.inv(display_affine(geometry['affine'],ORIGIN_ZYX[::-1]))
    report=dict(candidateSha256=hashlib.sha256(data).hexdigest(),imageSha256=EXPECTED_IMAGE_SHA256,adopted=False,expertReviewed=False,
        method='Barycentric triangle grid, subdivisions=ceil(longest edge/0.2mm). Finite samples, not a continuous clearance proof; raw<250 only locates review points.',regions=[])
    for region in ([30,31] if trigeminal else [34,35,36,37]):
        ids=np.flatnonzero(regions==region);triangles=faces[np.all(regions[faces]==region,axis=1)];records=[]
        for strip in range(15 if trigeminal else 7):
            selected=triangles[np.min((triangles-ids[0])//10,axis=1)==strip]
            points=[]
            for tri in xyz[selected]:
                divisions=int(np.ceil(max(np.linalg.norm(tri[a]-tri[b]) for a,b in [(0,1),(1,2),(2,0)])/.2))
                for i in range(divisions+1):
                    for j in range(divisions-i+1):points.append(tri[0]+(tri[1]-tri[0])*i/divisions+(tri[2]-tri[0])*j/divisions)
            coords=np.array(points)@inverse[:3,:3].T+inverse[:3,3]
            if np.any(coords<0) or np.any(coords>np.array(raw.shape)-1):raise ValueError('Outside source')
            values=map_coordinates(raw,coords.T,order=1,prefilter=False,output=np.float32)
            worst=int(np.argmin(values))
            records.append(dict(strip=strip,sampleCount=len(points),below250=int((values<250).sum()),minRaw=float(values[worst]),worstAppXYZ=coords[worst].tolist()))
        report['regions'].append(dict(id=region,strips=records))
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps([dict(id=r['id'],contacts=[s for s in r['strips'] if s['below250']]) for r in report['regions']],indent=2))


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--trigeminal',action='store_true',help='Review unchanged V paths in the same pinned mesh; no crop or adoption')
    main(parser.parse_args().trigeminal)
