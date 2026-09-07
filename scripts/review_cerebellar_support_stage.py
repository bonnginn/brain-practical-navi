"""Difference figures and full block-mask impact; WORK ONLY."""
import json,hashlib,argparse
import numpy as np
from PIL import Image,ImageDraw
import build_specimen_blocks as blocks
from prepare_cerebellar_island_meshes import encode
from build_orthogonal_review_bundle import ROOT,DEFAULT_IMAGE,DEFAULT_LABELS,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline
from audit_nerve_origin_context import LABEL_SHA

sha=lambda b:hashlib.sha256(b).hexdigest()
STAGE_SHA='294379b727b7263b6d60af7f693ebb27ab9e75a149844ff42535d7399dc0acae'


def main(component=2532):
    configs={2532:(LABEL_SHA,STAGE_SHA,348,'cerebellar-support-stage-v1','cerebellar-support-difference-v2'),
        2274:('294379b727b7263b6d60af7f693ebb27ab9e75a149844ff42535d7399dc0acae','2fc863aee8009ad9280dd2dd5fd2a9e8fa91de7f84a3ec5f59764317972c4cd9',52,'cerebellar-support-2274-stage-v1','cerebellar-support-2274-difference-v1'),
        997:('2fc863aee8009ad9280dd2dd5fd2a9e8fa91de7f84a3ec5f59764317972c4cd9','190f88dc05345e36b2e556829eb7882b6d01d0a67240b7738c1ab58820cd5548',259,'cerebellar-support-997-stage-v1','cerebellar-support-997-difference-v1'),
        1393:('190f88dc05345e36b2e556829eb7882b6d01d0a67240b7738c1ab58820cd5548','09088a9cf76b8c0578e96f21b9e35077ef345fd90bebc5294308e1603262bb34',372,'cerebellar-support-1393-stage-v1','cerebellar-support-1393-difference-v1'),
        1603:('09088a9cf76b8c0578e96f21b9e35077ef345fd90bebc5294308e1603262bb34','c9899d58afb39c1eb4b9873b0a39ecb5e44c7e0de895874a2284cfa8bd627f56',229,'cerebellar-support-1603-stage-v1','cerebellar-support-1603-difference-v1'),
        843:('c9899d58afb39c1eb4b9873b0a39ecb5e44c7e0de895874a2284cfa8bd627f56','212df1a6130977c23eb4561a5f883a2bd7efecba5f2b870cc1bbc5eae1b80b3b',3353,'cerebellar-support-843-stage-v1','cerebellar-support-843-difference-v1'),
        1105:('212df1a6130977c23eb4561a5f883a2bd7efecba5f2b870cc1bbc5eae1b80b3b','777b76921f99e22232dfedd58a165c17544a200101d9a403adc9f16d054d89ea',21290,'cerebellar-support-1105-stage-v1','cerebellar-support-1105-difference-v1')}
    label_sha,stage_sha,count,stage_folder,output_folder=configs[component]
    out=ROOT/'work/anatomy-review'/output_folder
    if out.exists():raise ValueError('Evidence exists')
    stage=ROOT/'work/anatomy-review'/stage_folder/'labels.bin.gz'
    _,_,old=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,label_sha)
    _,_,new=read_browser_volume(stage,MAGIC_LABELS,stage_sha)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    diff=old!=new;pts=np.argwhere(diff)
    if len(pts)!=count or not np.isin(old[diff],[28,29]).all() or np.any(new[diff]!=0):raise ValueError('Unexpected diff')
    out.mkdir();figures=[]
    crop=dict(min=np.maximum(pts.min(0)-12,0).tolist(),max=np.minimum(pts.max(0)+12,np.array(raw.shape)-1).tolist())
    planes=[('z',int(v)) for v in range(pts[:,2].min()-1,pts[:,2].max()+2)]
    planes +=[(axis,int(v)) for k,axis in enumerate('xy') for v in np.unique(np.percentile(pts[:,k],[0,50,100]).astype(int))]
    frames=[]
    for axis,index in planes:
        r=_oriented_crop(raw,axis,index,crop);a=_oriented_crop(old,axis,index,crop);b=_oriented_crop(new,axis,index,crop)
        h,w=r.shape;scale=5;row=Image.new('RGB',(3*(w*scale+8),h*scale+40),'#181818')
        d=ImageDraw.Draw(row);d.text((3,3),f'{axis.upper()}{index}: raw / before+removed yellow / candidate',fill='white')
        d.text((3,20),'Red = cerebellum outline; candidate not adopted',fill='white')
        for col,l in enumerate([None,a,b]):
            rgb=np.repeat(r[:,:,None],3,axis=2)
            if l is not None:rgb[_outline(np.isin(l,[28,29]))]=[255,60,90]
            if col==1:rgb[a!=b]=[255,220,0]
            row.paste(Image.fromarray(rgb).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+8),40))
        frames.append((row,dict(axis=axis,index=index)))
    for offset in range(0,len(frames),3):
        group=frames[offset:offset+3];sheet=Image.new('RGB',(max(r.width for r,_ in group),sum(r.height for r,_ in group)),'#181818');y=0
        for row,_ in group:sheet.paste(row,(0,y));y+=row.height
        path=out/f'diff-{offset//3:02}.png';sheet.save(path)
        figures.append(dict(path=path.name,sha256=sha(path.read_bytes()),frames=[f for _,f in group]))
    # Compare every Part.mask, not only the expected hindbrain part.
    # Browser volume helper returns XYZ; specimen generator requires ZYX.
    coarse=raw.transpose(2,1,0)[::2,::2,::2]
    old_coarse=old.transpose(2,1,0)[::2,::2,::2];new_coarse=new.transpose(2,1,0)[::2,::2,::2]
    direct,_=blocks.read_volume(DEFAULT_LABELS,b'BBS1')
    if not np.array_equal(old_coarse,direct[::2,::2,::2]):raise ValueError('Specimen axis contract differs')
    del direct
    before=blocks.specimen_definitions(coarse,old_coarse);after=blocks.specimen_definitions(coarse,new_coarse)
    if before.keys()!=after.keys():raise ValueError('Block identities changed')
    impacts=[]
    for key,parts in before.items():
        if len(parts)!=len(after[key]):raise ValueError('Part count changed')
        for a,b in zip(parts,after[key]):
            if a.key!=b.key:raise ValueError('Part identity changed')
            count=int(np.count_nonzero(a.mask!=b.mask));record=dict(block=key,part=a.key,changedMaskVoxels=count)
            if count:
                name=f'block-{key}-{a.key}.mesh';installed=(ROOT/'public/atlas'/name).read_bytes()
                previous=encode(blocks.mesh_from_mask(a.mask,coarse,a.material=='specimen'))
                if previous!=installed:raise ValueError('Current mesh not reproduced: '+name)
                mesh=blocks.mesh_from_mask(b.mask,coarse,b.material=='specimen');data=encode(mesh);(out/name).write_bytes(data)
                record.update(file=name,beforeSha256=sha(installed),afterSha256=sha(data),vertices=len(mesh[0]),faces=len(mesh[3]))
            impacts.append(record)
    report=dict(component=component,inputSha256=label_sha,candidateSha256=stage_sha,figures=figures,crop=crop,planes=len(planes),blockMaskImpact=impacts,adopted=False)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(planes=len(planes),figures=len(figures),changedParts=[r for r in impacts if r['changedMaskVoxels']]),indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--component',type=int,choices=[2532,2274,997,1393,1603,843,1105],default=2532)
    main(parser.parse_args().component)
