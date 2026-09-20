"""Build tissue slabs with shared cut surfaces, never peel around label outlines."""
import argparse, hashlib, json
from pathlib import Path
import numpy as np
from scipy import ndimage
import build_specimen_blocks as b

# XYZ bounds in the existing registered grid. Broad planes apply to all tissue.
CUTS = {
 'lateral-ventricle': ((0,78),(-90,65),(-28,-8)),
 'diencephalon': ((-38,38),(5,15),(-45,22)),
 'radiations': ((0,78),(-80,65),(-30,-20)),
 'commissural-system': ((0,8),(-85,70),(-40,50)),
 'choroid-plexus': ((18,28),(-65,40),(-54,18)),
 'medial-temporal': ((0,58),(4,16),(-60,-8)),
 'midbrain-section': ((-24,24),(-32,20),(-36,-26)),
 'hindbrain': ((0,10),(-70,20),(-84,-24)),
}
IDS = {
 'caudate':(8,), 'thalamus':(16,), 'thalami':(15,16), 'hippocampus':(18,),
 'amygdala':(22,), 'putamen':(10,), 'pallidum-external':(12,),
 'pallidum-internal':(14,), 'internal-capsule':(32,), 'corpus-callosum':(30,),
 'fornix':(46,), 'septum-pellucidum':(43,), 'fimbria':(46,),
 'subthalamic-nuclei':(5,6), 'red-nuclei':(1,2), 'substantia-nigra':(3,4),
}
CAVITIES={'ventricular-cavity':(24,), 'lateral-ventricles':(23,24),
          'third-ventricle':(25,), 'inferior-horn':(24,), 'aqueduct':(41,), 'fourth-ventricle':(26,)}

def subset_mesh(mesh, keep):
    vertices,normals,shade,faces=mesh
    chosen=faces[keep]
    used,inverse=np.unique(chosen,return_inverse=True)
    return vertices[used],normals[used],shade[used],inverse.reshape(-1,3).astype('<u4')

def surface_ids(mesh,body,fine):
    """Assign existing external/cut faces from the closest inside tissue sample.

    This never constructs an internal label shell or changes the surface shape.
    """
    vertices,normals,_,faces=mesh
    centers=vertices[faces].mean(axis=1)
    normal=normals[faces].mean(axis=1)
    normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-6)
    origin=b.ORIGIN_XYZ[::-1]
    grid=(centers-origin)/b.GEOMETRY_SPACING_MM
    answer=np.zeros(len(faces),np.uint8);chosen=np.zeros(len(faces),bool)
    for offset in (0.,-.6,.6,-1.,1.):
        q=grid+normal*offset
        inside=ndimage.map_coordinates(body.astype(np.uint8),q.T,order=0,mode='constant')>0
        use=inside&~chosen
        labels=ndimage.map_coordinates(fine,(q*2).T,order=0,mode='constant')
        answer[use]=labels[use];chosen|=use
    return answer

def generate(out):
    rawfine,dims=b.read_volume(b.BIGBRAIN,b'BBV1');fine,sdims=b.read_volume(b.SEGMENTATION,b'BBS1');assert dims==sdims
    raw=rawfine[::2,::2,::2];seg=fine[::2,::2,::2]
    legacy=b.specimen_definitions(raw,seg);zz,yy,xx=b.world_grids(raw.shape)
    tissue=b.largest_component(raw<252)&~np.isin(seg,b.VENTRICLES)
    report={'sourceLabelSha256':hashlib.sha256(b.SEGMENTATION.read_bytes()).hexdigest(),
      'sourceImageSha256':hashlib.sha256(b.BIGBRAIN.read_bytes()).hexdigest(),
      'preparation':'Broad planar tissue slabs. All labelled and unlabelled tissue shares one surface. Colour partitions exposed faces only; no label-shaped excavation or isolated internal shells.', 'specimens':{}}
    for key,original in legacy.items():
        parts={p.key:p for p in original}
        if key=='medial-temporal':
            parts['fimbria']=b.Part('fimbria',seg==46,'海馬采（部分）','image-guided-segmentation','#e7d9a6')
        region=CUTS[key];body=tissue&b.bounds(zz,yy,xx,x=region[0],y=region[1],z=region[2])
        mesh=b.mesh_from_mask(body,raw,True)
        labels=surface_ids(mesh,body,fine)
        assigned=np.zeros(len(labels),bool);entries=[]
        specimen={'parts':entries,'boundsXYZmm':region,'surfaceFaces':len(mesh[3]),'bodyVoxels':int(body.sum()),'colourMethod':'Partition of one shared external/cut surface'}
        report['specimens'][key]=specimen
        def write(name,geometry,role,source,color,**extra):
            info=b.write_mesh(f'teaching-block-{key}-{name}',geometry,out,compress=True)
            info.update(key=name,role=role,source=source,color=color,geometrySamplingMm=1,**extra);entries.append(info)
        for name,p in parts.items():
            if name not in IDS:continue
            keep=np.isin(labels,IDS[name])&~assigned
            if not keep.any():continue
            assigned|=keep
            write(name,subset_mesh(mesh,keep),'structure','image-guided-segmentation' if name in ('fornix','septum-pellucidum','fimbria') else p.source,p.color,sourceLabelIds=IDS[name],surfaceOnly=True)
        write('tissue',subset_mesh(mesh,~assigned),'tissue','specimen-derived','#c9a27d',surfaceOnly=True)
        assert sum(p['faces'] for p in entries)==specimen['surfaceFaces']
        for name,p in parts.items():
            if name in CAVITIES:
                mask=b.fine_cavity_mask(fine,CAVITIES[name],region)
                if mask.sum()<8:continue
                write(name,b.mesh_from_fine_cavity(mask),'cavity','same-grid-segmentation',p.color)
                entries[-1]['geometrySamplingMm']=.5
            elif p.source in ('schematic-3d','regional-approximation') and name not in IDS:
                # Keep explanatory overlays optional, outside the physical slab.
                if p.mask.sum()>=8:write(name,b.mesh_from_mask(p.mask,raw,False),'schematic',p.source,p.color)
        print(key,body.sum(),len(entries),flush=True)
    (out/'teaching-specimens.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output-dir',type=Path,required=True);args=parser.parse_args()
    assert not args.output_dir.exists(),'Preserve previous output'
    args.output_dir.mkdir(parents=True);generate(args.output_dir)
