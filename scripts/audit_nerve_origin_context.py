"""Measure schematic III-XII origins against current ID27, not anatomical exits."""
import hashlib
import json
import numpy as np
from scipy.ndimage import binary_erosion,generate_binary_structure
from scipy.spatial import cKDTree
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume

LABEL_SHA='86e3b22dc7ce69cf31c5ba821e980ce283a366fd952bf46ce880efd8f3127e14'

def display_affine(source_affine,display_origin):
    result=np.asarray(source_affine,dtype=float).copy()
    if result.shape!=(4,4) or not np.allclose(result[:3,:3],np.eye(3)*.5):raise ValueError('Unexpected label grid')
    result[:3,3]=np.asarray(display_origin,dtype=float)
    return result


def read_rings(data,region,sides=10):
    if data[:4]!=b'BNM3':raise ValueError('Wrong mesh format')
    n,f=np.frombuffer(data,dtype='<u4',count=2,offset=4)
    if len(data)!=12+int(n)*32+int(f)*12:raise ValueError('Mesh length differs')
    vertices=np.frombuffer(data,dtype='<f4',count=int(n)*3,offset=12).reshape(-1,3)[:,[2,1,0]]
    ids=np.frombuffer(data,dtype='<f4',count=int(n),offset=12+int(n)*28)
    selected=vertices[ids==region]
    if not len(selected) or len(selected)%sides or not np.isfinite(selected).all():raise ValueError('Invalid tube vertices')
    return selected.reshape(-1,sides,3)


def main():
    out=ROOT/'work/anatomy-review/nerve-origin-context-v2.json'
    if out.exists():raise ValueError('Evidence exists')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    from build_section_structure_meshes import ORIGIN_ZYX
    affine=display_affine(geometry['affine'],ORIGIN_ZYX[::-1]);inv=np.linalg.inv(affine)
    mask=labels==27
    boundary=mask&~binary_erosion(mask,structure=generate_binary_structure(3,1),border_value=0)
    boundary_xyz=np.argwhere(boundary)
    tree=cKDTree(boundary_xyz@affine[:3,:3].T+affine[:3,3])
    metadata_path=ROOT/'public/atlas/neurovascular-overlays.json'
    metadata=json.loads(metadata_path.read_text(encoding='utf-8'))
    report=dict(labelsSha256=LABEL_SHA,metadataSha256=hashlib.sha256(metadata_path.read_bytes()).hexdigest(),
        mutation=False,expertReviewed=False,labelDisplayAffine=affine.tolist(),
        coordinateContract='Label display uses build_section_structure_meshes.ORIGIN_ZYX, not the original scientific image affine. Mesh coordinates already contain their authored display positions.',
        method='First mesh ring centre (proximal authored knot), distance to nearest 6-neighbor ID27 boundary voxel centre in world mm',
        limitations=['ID27 has known ventral omissions and is not the entire true brainstem boundary',
        'Distance to boundary voxel centres is not continuous mesh distance or anatomical root-exit accuracy',
        'No automatic move to nearest surface; no inferred rootlet counts or root splitting'],meshes=[],origins=[])
    for group in metadata['groups']:
        if not group['file'].startswith('overlay-nerves-'):continue
        data=(ROOT/'public/atlas'/group['file']).read_bytes()
        report['meshes'].append(dict(file=group['file'],sha256=hashlib.sha256(data).hexdigest()))
        for structure in group['structures']:
            if structure['id']<26:continue
            rings=read_rings(data,structure['id'])
            center=rings[0].mean(0)
            coords=center@inv[:3,:3].T+inv[:3,3]
            index=np.rint(coords).astype(int)
            inside=bool(np.all(index>=0) and np.all(index<np.array(labels.shape)))
            distance,nearest=tree.query(center)
            ring_distances,_=tree.query(rings[0])
            report['origins'].append(dict(id=structure['id'],name=structure['name'],file=group['file'],
                originWorldMm=center.tolist(),originAppXYZ=coords.tolist(),originInsideAppGrid=inside,
                roundedOriginLabel=int(labels[tuple(index)]) if inside else None,
                distanceToBoundaryVoxelCentreMm=float(distance),nearestBoundaryAppXYZ=boundary_xyz[nearest].tolist(),
                firstRingMinimumDistanceMm=float(ring_distances.min()),firstRingMaximumDistanceMm=float(ring_distances.max()),
                sampledCenterlineCount=len(rings),rootletCountInAnatomy=None))
    if [r['id'] for r in report['origins']]!=list(range(26,46)):raise ValueError('III-XII inventory differs')
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps([{k:r[k] for k in ['id','name','originInsideAppGrid','roundedOriginLabel','distanceToBoundaryVoxelCentreMm']} for r in sorted(report['origins'],key=lambda r:r['distanceToBoundaryVoxelCentreMm'],reverse=True)],ensure_ascii=False))


if __name__=='__main__':main()
