"""Build opaque virtual dissections; preserve legacy specimens and source labels.

Cuts expose already adopted structures. They are teaching preparations, not
new tissue classifications or a claim to reproduce a physical dissection.
"""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from scipy import ndimage
import build_specimen_blocks as b

ROOT=b.ROOT
CAVITIES={'ventricular-cavity','lateral-ventricles','third-ventricle','inferior-horn','aqueduct','fourth-ventricle'}
DERIVED={'specimen-derived','same-grid-segmentation','manual-segmentation','image-guided-segmentation','teaching-segmentation'}

def exposure_window(target,axis,positive=True):
    """Remove covering support along a viewing direction, never alter targets."""
    seeds=ndimage.binary_dilation(target,iterations=2)
    if not positive:seeds=np.flip(seeds,axis)
    rays=np.maximum.accumulate(seeds,axis=axis)
    return rays if positive else np.flip(rays,axis)

def generate(out):
    rawfine,dims=b.read_volume(b.BIGBRAIN,b'BBV1');fine,sdims=b.read_volume(b.SEGMENTATION,b'BBS1');assert dims==sdims
    raw=rawfine[::2,::2,::2];seg=fine[::2,::2,::2]
    legacy=b.specimen_definitions(raw,seg);zz,yy,xx=b.world_grids(raw.shape)
    tissue=b.largest_component(raw<252)&~np.isin(seg,b.VENTRICLES)
    results={};report={'sourceLabelSha256':hashlib.sha256(b.SEGMENTATION.read_bytes()).hexdigest(),'sourceImageSha256':hashlib.sha256(b.BIGBRAIN.read_bytes()).hexdigest(),'preparation':'Virtual exposure cuts; source labels unchanged. Neutral opaque tissue first, optional coloured answer overlays. Schematic aids are excluded from the initial morphology.','specimens':results}
    for key,original in legacy.items():
        parts={p.key:p for p in original}
        # Keep current measured thin structures at 0.5 mm instead of using
        # the old hand-placed fornix and membrane geometry.
        fine_parts={}
        if key=='commissural-system':
            for name,ident,color in [('fornix',46,'#e7d9a6'),('septum-pellucidum',43,'#a9c5bd')]:
                mask=fine==ident;fine_parts[name]=mask
                parts[name]=b.Part(name,mask[::2,::2,::2],name,'image-guided-segmentation',color)
        if key=='commissural-system':
            region=b.bounds(zz,yy,xx,x=(-19,19),y=(-39,60),z=(-24,26))
            distance=ndimage.distance_transform_edt(~np.isin(seg,(23,24)))
            body=tissue&region&(distance<=13)&((xx<=-8)|(zz>=19))
            for name in ('corpus-callosum','fornix','septum-pellucidum'):body&=~parts[name].mask
            parts['tissue']=b.Part('tissue',body,'正中周囲実質','specimen-derived','#c9a27d','specimen')
        if key=='radiations':
            body=tissue&b.bounds(zz,yy,xx,x=(0,67),y=(-76,48),z=(-29,9))
            for name in ('putamen','pallidum-external','pallidum-internal','internal-capsule'):body&=~parts[name].mask
            parts['tissue']=b.Part('tissue',body,'深部剖出組織','specimen-derived','#c9a27d','specimen')
        if key=='medial-temporal':
            mask=b.fine_cavity_mask(fine,46,((3,43),(-31,35),(-54,-19)))
            fine_parts['fimbria']=mask
            parts['fimbria']=b.Part('fimbria',mask[::2,::2,::2],'海馬采（部分）','image-guided-segmentation','#e7d9a6')
        if key=='midbrain-section':
            # Use preserved image tissue in the teaching slab, including the
            # peduncular side that the partial brainstem label omitted.
            box=b.bounds(zz,yy,xx,x=(-24,24),y=(-32,20),z=(-36,-26))
            body=tissue&box
            for name in ('red-nuclei','substantia-nigra'):body&=~parts[name].mask
            parts['tissue']=b.Part('tissue',body,'中脳横断組織','specimen-derived','#c9a27d','specimen')
            mask=b.fine_cavity_mask(fine,41,((-24,24),(-32,20),(-36,-26)))
            if mask.sum()>=8:
                fine_parts['aqueduct']=mask
                parts['aqueduct']=b.Part('aqueduct',mask[::2,::2,::2],'中脳水道（部分）','same-grid-segmentation','#45aebd')
        if key=='diencephalon':
            p=parts['tissue'];parts['tissue']=b.Part(p.key,p.mask|parts['hypothalamus'].mask,p.name_ja,p.source,p.color,p.material)
        real=[p for p in parts.values() if p.material!='specimen' and p.source in DERIVED and p.key not in CAVITIES]
        targets=np.zeros(raw.shape,bool)
        for p in real:targets|=p.mask
        # The cavity contributes an opening but is not turned into solid tissue.
        for p in parts.values():
            if p.key in CAVITIES and p.source in DERIVED:targets|=p.mask
        direction={'lateral-ventricle':(2,True),'diencephalon':(2,True),'radiations':(0,True),'commissural-system':(2,True),'choroid-plexus':(2,True),'medial-temporal':(0,True),'midbrain-section':(0,True)}.get(key)
        opening=exposure_window(targets,*direction) if direction else np.zeros(raw.shape,bool)
        entries=[];results[key]={'parts':entries,'cutAxisZYX':direction[0] if direction else None,'cutFromPositive':direction[1] if direction else None}
        for p in parts.values():
            mask=p.mask.copy();role='tissue' if p.material=='specimen' else 'cavity' if p.key in CAVITIES else 'structure' if p.source in DERIVED else 'schematic'
            if p.source not in DERIVED:role='schematic'
            removed=0
            if p.material=='specimen':
                before=int(mask.sum())
                if direction:mask&=~opening
                if key=='hindbrain' and p.key=='cerebellum':mask&=(xx>=12)
                removed=before-int(mask.sum())
            if mask.sum()<8:continue
            fname=f'teaching-block-{key}-{p.key}'
            if p.key in fine_parts:
                mesh=b.mesh_from_fine_cavity(fine_parts[p.key]);sampling=.5;sampled=int(fine_parts[p.key].sum())
            elif (key,p.key) in b.FINE_CAVITY_PARTS:
                fm=b.fine_cavity_mask(fine,*b.FINE_CAVITY_PARTS[key,p.key]);mesh=b.mesh_from_fine_cavity(fm);sampling=.5;sampled=int(fm.sum())
            else:
                mesh=b.mesh_from_mask(mask,raw,role in ('tissue','structure'));sampling=1;sampled=int(mask.sum())
            info=b.write_mesh(fname,mesh,out,compress=True)
            info.update(key=p.key,role=role,source=p.source,color=p.color,geometrySamplingMm=sampling,removedSupportVoxels=removed,sampledVoxels=sampled)
            entries.append(info)
        assert any(p['role']=='tissue' for p in entries),key
    (out/'teaching-specimens.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:len(v['parts']) for k,v in results.items()}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args()
    assert not a.output_dir.exists(),'Preserve existing output'
    a.output_dir.mkdir(parents=True);generate(a.output_dir)
