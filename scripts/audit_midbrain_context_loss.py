"""Measure the current midbrain context subtraction, without changing meshes."""
import ast
import argparse
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_IMAGE, DEFAULT_LABELS, MAGIC_IMAGE, MAGIC_LABELS,
    EXPECTED_IMAGE_SHA256, EXPECTED_LABELS_SHA256, read_browser_volume,
)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--mesh',action='store_true',help='Write the repaired context mesh only under work/')
    parser.add_argument('--install-mesh',action='store_true',help='Install this single verified mesh in the local development assets; never deploy')
    args=parser.parse_args()
    if args.install_mesh and not args.mesh:parser.error('--install-mesh requires --mesh')
    source_path=ROOT/'scripts/build_specimen_blocks.py'
    tree=ast.parse(source_path.read_text(encoding='utf-8'))
    # Use the generator's actual geometry helpers, without importing meshing.
    names={'world_grids','bounds','ball','polyline_mask','ellipse_mask','largest_component'}
    definitions=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names]
    constants={'ORIGIN_XYZ','SOURCE_SPACING_MM','GEOMETRY_STRIDE','GEOMETRY_SPACING_MM'}
    assignments=[n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id in constants for t in n.targets)]
    ns={'np':np,'ndimage':ndimage}
    exec(compile(ast.Module(body=assignments+definitions,type_ignores=[]),str(source_path),'exec'),ns)
    _,_,raw_xyz=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,seg_xyz=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,EXPECTED_LABELS_SHA256)
    raw=raw_xyz.transpose(2,1,0)[::2,::2,::2]
    seg=seg_xyz.transpose(2,1,0)[::2,::2,::2]
    zz,yy,xx=ns['world_grids'](raw.shape)
    ns.update(raw=raw,seg=seg,zz=zz,yy=yy,xx=xx,BRAINSTEM=27,
        tissue=ns['largest_component'](raw<252)&~np.isin(seg,[23,24,25,26]),
        red_nuclei=np.isin(seg,[1,2]),substantia_nigra=np.isin(seg,[3,4]))
    specimen=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='specimen_definitions')
    start=next(i for i,n in enumerate(specimen.body) if isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) and n.targets[0].id=='midbrain_box')
    finish=next(i for i in range(start,len(specimen.body)) if isinstance(specimen.body[i],ast.AugAssign) and isinstance(specimen.body[i].target,ast.Name) and specimen.body[i].target.id=='midbrain_slab')
    exec(compile(ast.Module(body=specimen.body[start:finish],type_ignores=[]),str(source_path),'exec'),ns)
    before=ns['midbrain_slab'].copy()
    losses={key:int(np.count_nonzero(before&ns[key])) for key in ['red_in_slab','nigra_in_slab','aqueduct','cerebral_peduncles']}
    exec(compile(ast.Module(body=[specimen.body[finish]],type_ignores=[]),str(source_path),'exec'),ns)
    after=ns['midbrain_slab']
    legacy_after=before & ~(ns['red_in_slab']|ns['nigra_in_slab']|ns['aqueduct']|ns['cerebral_peduncles'])
    preview_dir=ROOT/'work/anatomy-review/midbrain-context-repair-v2'
    preview_dir.mkdir(parents=True,exist_ok=True)
    panels=[]
    for k in range(54,65):
        base=raw[k,80:145,65:132][::-1]
        old=legacy_after[k,80:145,65:132][::-1]
        new=after[k,80:145,65:132][::-1]
        rgb_old=np.repeat(base[:,:,None],3,axis=2)
        rgb_new=rgb_old.copy()
        from build_orthogonal_review_bundle import _outline
        rgb_old[_outline(old)]=[255,60,90]
        rgb_new[_outline(new)]=[60,220,240]
        rgb_new[new&~old]=[255,220,0]
        h,w=base.shape
        panel=Image.new('RGB',(w*9+16,h*3+24),'#151515')
        ImageDraw.Draw(panel).text((4,4),f'Original Z={k*2}: raw | old context red | repaired cyan / restored yellow',fill='white')
        for j,data in enumerate([base,rgb_old,rgb_new]):
            panel.paste(Image.fromarray(data).convert('RGB').resize((w*3,h*3),Image.Resampling.NEAREST),(j*(w*3+8),24))
        panels.append(panel)
    for first in range(0,len(panels),4):
        group=panels[first:first+4]
        sheet=Image.new('RGB',(group[0].width,sum(p.height for p in group)),'#151515')
        for n,p in enumerate(group):sheet.paste(p,(0,n*p.height))
        sheet.save(preview_dir/f'comparison-{first//4}.png')
    report=dict(imageSha256=EXPECTED_IMAGE_SHA256,labelsSha256=EXPECTED_LABELS_SHA256,
        generatorSha256=hashlib.sha256(source_path.read_bytes()).hexdigest(),
        sourceVoxelMm=0.5,samplingStride=2,geometryVoxelMm=1,
        displayOriginXYZ=ns['ORIGIN_XYZ'].tolist(),
        sourceZIndices=[108,128],displayZMm=[-36,-26],mniZMm=[-18,-8],
        beforeContextVoxels=int(before.sum()),afterContextVoxels=int(after.sum()),
        subtractionUnionVoxels=int(np.count_nonzero(before&~after)),overlappingSubtractions=losses,
        legacyContextVoxels=int(legacy_after.sum()),restoredSourceTissueVoxels=int(np.count_nonzero(after&~legacy_after)),
        assetMutation=False,anatomicalAcceptance=False)
    if args.mesh:
        import build_specimen_blocks as generator
        mesh_dir=ROOT/'work/anatomy-review/midbrain-context-repair-v2'
        mesh_dir.mkdir(parents=True,exist_ok=True)
        generator.ATLAS=mesh_dir
        baseline=generator.write_mesh('old-reproduced-tissue',generator.mesh_from_mask(legacy_after,raw,True))
        report['baselineMeshSha256']=hashlib.sha256((mesh_dir/baseline['file']).read_bytes()).hexdigest()
        report['distributedMeshSha256']=hashlib.sha256((ROOT/'public/atlas/block-midbrain-section-tissue.mesh').read_bytes()).hexdigest()
        report['baselineByteIdentical']=report['baselineMeshSha256']==report['distributedMeshSha256']
        report['mesh']=generator.write_mesh('block-midbrain-section-tissue',generator.mesh_from_mask(after,raw,True))
        report['mesh']['sha256']=hashlib.sha256((mesh_dir/report['mesh']['file']).read_bytes()).hexdigest()
        if args.install_mesh:
            expected_old='c31cd48c3dff2493def6db8b44fdd2df69d7f5c64b5955f94299d5aae6e39134'
            expected_new='af977041f979fa95241aac508a9983b8368c7ec92cb275eec33b5e5409635d8e'
            if (report['baselineMeshSha256']!=expected_old or report['mesh']['sha256']!=expected_new
                    or report['distributedMeshSha256'] not in {expected_old,expected_new}):
                raise ValueError('Mesh inputs/output differ from reviewed evidence; refusing install')
            generator.ATLAS=ROOT/'public/atlas'
            generator.write_mesh('block-midbrain-section-tissue',generator.mesh_from_mask(after,raw,True))
            report['assetMutation']=report['distributedMeshSha256']!=expected_new
            report['installedMeshSha256']=expected_new
    out=ROOT/'work/anatomy-review/midbrain-context-loss-v2.json'
    out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report))


if __name__=='__main__':main()
