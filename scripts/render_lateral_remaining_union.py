"""Render only review panels changed by combining the eight fixed candidates."""
import json
import argparse
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, DEFAULT_IMAGE, MAGIC_IMAGE, MAGIC_LABELS, EXPECTED_IMAGE_SHA256, read_browser_volume, _oriented_crop, _outline
from stage_third_ventricle_core_repair import digest
from stage_lateral_fringe_repair import replay


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--medium-components',action='store_true',help='Compare all 31 unadopted 20-49 voxel components, without installing a patch')
    args=parser.parse_args()
    work=ROOT/'work/anatomy-review'; stage=work/'lateral-fringe-remaining-large-stage-v1'
    out=work/('lateral-fringe-medium-union-v1' if args.medium_components else 'lateral-fringe-remaining-large-union-v1')
    if out.exists(): raise ValueError('Preserve evidence')
    inventory_path=work/'lateral-ventricle-fringe-v1/report.json'
    inventory_sha=digest(inventory_path.read_bytes())
    if inventory_sha!='1c8884fe812d21d3ec6303e9dff2878e2374bd6767bfee8b0dff3b3ca78c6042':raise ValueError('Inventory changed')
    inventory=json.loads(inventory_path.read_text(encoding='utf-8'))
    if args.medium_components:
        data=None
        components=[dict(target=r['target'],component=c['id']) for r in inventory['results'] for c in r['components'] if 20<=len(c['points'])<50]
        if len(components)!=31:raise ValueError('Component count changed')
        patch=dict(components=components,candidateSha256=inventory_sha)
        source=work/'lateral-fringe-medium-difference-v1/report.json'
        source_sha='4b6d413cca7ed60e1735e4fab274139b4faf5a682ed4143e0984d92a5ac5bfe3'
        _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,'b473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567')
        union=before.copy(); point_count=0
        for spec in components:
            entry=next(r for r in inventory['results'] if r['target']==spec['target'])
            points=np.asarray(next(c['points'] for c in entry['components'] if c['id']==spec['component']),dtype=int)
            if np.any(union[tuple(points.T)]!=0):raise ValueError('Candidate overlap or nonzero source')
            union[tuple(points.T)]=spec['target'];point_count+=len(points)
        if point_count!=867 or np.count_nonzero(before!=union)!=867:raise ValueError('Unexpected union size')
    else:
        data=(stage/'repair.json').read_bytes()
        if digest(data)!='48e2fea89750e10afbbdd812628cebfcac5e004f2f235858992543804687ece1':raise ValueError('Stage changed')
        patch=json.loads(data)
        source=work/'lateral-fringe-remaining-large-difference-v1/report.json'
        source_sha='f7d862d4af9d7b694d90d4420289ac970382d0a3e290ce2d26d1c7a0907ca3b6'
        _,_,before=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,patch['inputCompressedSha256'])
        _,_,union=read_browser_volume(stage/'labels.bin.gz',MAGIC_LABELS,patch['outputCompressedSha256'])
        if not np.array_equal(replay(before,patch['points']),union):raise ValueError('Union mismatch')
    if digest(source.read_bytes())!=source_sha:raise ValueError('Review changed')
    review=json.loads(source.read_text(encoding='utf-8'))
    if inventory_sha!=patch['candidateSha256']:raise ValueError('Inventory changed')
    _,_,gray=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    out.mkdir();figures=[];unchanged=[]
    for spec in patch['components']:
        target,ident=spec['target'],spec['component']
        entry=next(r for r in inventory['results'] if r['target']==target)
        points=next(c['points'] for c in entry['components'] if c['id']==ident)
        individual=before.copy();individual[tuple(np.asarray(points).T)]=target
        for f in review['figures']:
            if (f['target'],f['component'])!=(target,ident):continue
            if digest((source.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Figure changed')
            axis,crop=f['axis'],f['cropInclusive']
            for index in f['indices']:
                a=_oriented_crop(individual,axis,index,crop); b=_oriented_crop(union,axis,index,crop)
                key=dict(target=target,component=ident,axis=axis,index=index)
                if np.array_equal(a,b):unchanged.append(key);continue
                plane=_oriented_crop(gray,axis,index,crop);rgb=np.repeat(plane[:,:,None],3,axis=2)
                one=rgb.copy();both=rgb.copy();one[_outline(a==target)]=[255,60,90];one[a!=b]=[255,200,0];both[_outline(b==target)]=[255,60,90]
                h,w=plane.shape;scale=5
                canvas=Image.new('RGB',(max(650,w*scale*3+16),h*scale+32),'#181818')
                ImageDraw.Draw(canvas).text((3,3),f'ID{target} C{ident} {axis}{index}: raw / individual + other additions / UNION\nWork-only; not adopted',fill='white')
                for col,picture in enumerate((rgb,one,both)):canvas.paste(Image.fromarray(picture).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+8),32))
                path=out/f'id{target}-c{ident}-{axis}{index}.png';canvas.save(path)
                figures.append(dict(**key,path=path.name,sha256=digest(path.read_bytes()),otherChangedPixels=int(np.count_nonzero(a!=b))))
    result=dict(stageSha256=digest(data) if data is not None else None,inventorySha256=inventory_sha,individualReportSha256=source_sha,labelSha256=review['labelSha256'],figures=figures,unchangedPanels=unchanged,totalPanels=len(figures)+len(unchanged),installed=False,visualReviewPending=True)
    (out/'report.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(changedPanels=len(figures),unchangedPanels=len(unchanged),totalPanels=result['totalPanels'])))


if __name__=='__main__':main()
