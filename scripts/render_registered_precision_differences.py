"""Show EVERY changed precision-sampling voxel in three original-image planes.

This is a numerical-candidate comparison, not application adoption. Images keep
the unmodified raw panel and mark the central voxel outside its pixel square.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from audit_registered_manual_conflicts import CANDIDATE_SHA, CANDIDATE_RAW_SHA
from audit_registered_manual_conflicts import render_issue
from audit_manual_label_space import FILES, LABEL_SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_IMAGE, DEFAULT_LABELS, MAGIC_IMAGE, MAGIC_LABELS, EXPECTED_IMAGE_SHA256, read_browser_volume, _oriented_crop, _outline


def change_points(before, after):
    if before.shape != after.shape or before.ndim != 3 or before.dtype != np.uint8 or after.dtype != np.uint8:
        raise ValueError('Expected equal uint8 XYZ candidates')
    points = np.argwhere(before != after)
    # No label may leap beyond an existing immediate-neighbor extent.
    support = []
    for point in points:
        crop = tuple(slice(max(0,int(p)-1),min(d,int(p)+2)) for p,d in zip(point,before.shape))
        a,b=int(before[tuple(point)]),int(after[tuple(point)])
        support.append(bool((b == 0 or np.any(before[crop] == b)) and (a == 0 or np.any(after[crop] == a))))
    return points, support


def render_point(raw, before, after, point):
    radius, scale = 5, 6
    point = np.asarray(point,dtype=int)
    lo,hi=point-radius,point+radius
    if np.any(lo<0) or np.any(hi>=raw.shape):
        raise ValueError('Point review crop exceeds image grid')
    a,b=int(before[tuple(point)]),int(after[tuple(point)])
    value=b or a
    tile=(2*radius+1)*scale
    row=Image.new('RGB',(155+9*(tile+7),tile+26),'#151515')
    draw=ImageDraw.Draw(row)
    draw.text((4,6),str(point.tolist()),fill='white')
    draw.text((4,24),f'candidate {a} -> {b}',fill='white')
    draw.text((4,42),f'outline ID{value}',fill=(255,55,85))
    for axis_number,axis in enumerate('xyz'):
        crop=dict(min=lo.tolist(),max=hi.tolist())
        gray=_oriented_crop(raw,axis,int(point[axis_number]),crop)
        for stage,labels in enumerate((None,before,after)):
            rgb=np.repeat(gray[:,:,None],3,axis=2)
            if labels is not None:
                plane=_oriented_crop(labels,axis,int(point[axis_number]),crop)
                rgb[_outline(plane==value)]=[255,55,85]
            panel=Image.fromarray(rgb).resize((tile,tile),Image.Resampling.NEAREST)
            x=155+(axis_number*3+stage)*(tile+7)
            row.paste(panel,(x,24))
            draw.text((x,4),f'{axis.upper()} '+('raw','prior','tight')[stage],fill='white')
            # Corner bracket is outside central source pixel: no hidden intensity.
            c0,c1=x+radius*scale-1,x+(radius+1)*scale
            r0,r1=24+radius*scale-1,24+(radius+1)*scale
            draw.rectangle((c0,r0,c1,r1),outline=(255,220,30))
    return row


def load_candidate(folder, dims):
    report=json.loads((folder/'report.json').read_text(encoding='utf-8'))
    path=folder/'candidate-all22.npz'
    if report['adopted'] is not False or report['labelMutation'] is not False or report['labelsSha256']!=LABEL_SHA or report['sourceSha256']!=FILES['BigBrain-SubCorSeg-300um.mnc'] or hashlib.sha256(path.read_bytes()).hexdigest()!=report['candidateSha256']:
        raise ValueError('Candidate provenance mismatch')
    volume=np.zeros(dims,dtype=np.uint8)
    with np.load(path,allow_pickle=False) as bundle:
        low,high=bundle['minimum'],bundle['maximumExclusive']
        if low.shape!=(3,) or high.shape!=(3,) or low.dtype.kind not in 'iu' or high.dtype.kind not in 'iu' or not np.array_equal(bundle['dimensions'],dims) or np.any(low<0) or np.any(high>dims) or np.any(low>=high) or bundle['labels'].shape!=tuple(high-low) or bundle['labels'].dtype!=np.uint8 or not np.isin(bundle['labels'],range(23)).all():
            raise ValueError('Candidate geometry/value mismatch')
        volume[tuple(slice(int(a),int(b)) for a,b in zip(low,high))]=bundle['labels']
        affine=bundle['affine'].copy()
    if hashlib.sha256(volume.tobytes(order='F')).hexdigest()!=report['candidateRawFullGridSha256']:
        raise ValueError('Candidate raw identity mismatch')
    return volume,affine,report


def render_locator(raw, current, candidate):
    """Same raw axial image, full-location box and three unaltered source panels."""
    z=130;lo=[165,205,100];hi=[225,248,141]
    sheet=Image.new('RGB',(1260,535),'#16212b');draw=ImageDraw.Draw(sheet)
    font=ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc',22)
    small=ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc',17)
    draw.text((20,16),'位置合わせの比較例：左右の赤核（水平断 Z=130）',font=font,fill='white')
    full=_oriented_crop(raw,'z',z,dict(min=[0,0,0],max=(np.array(raw.shape)-1).tolist()))
    scale=.7
    sheet.paste(Image.fromarray(full).convert('RGB').resize((round(full.shape[1]*scale),round(full.shape[0]*scale)),Image.Resampling.NEAREST),(20,100))
    draw.text((20,67),'全体位置（上＝前方）',font=small,fill='white')
    draw.rectangle((20+lo[0]*scale,100+(raw.shape[1]-1-hi[1])*scale,20+(hi[0]+1)*scale,100+(raw.shape[1]-lo[1])*scale),outline='#ffca55',width=2)
    crop=dict(min=lo,max=hi);gray=_oriented_crop(raw,'z',z,crop)
    for column,labels in enumerate((None,current,candidate)):
        rgb=np.repeat(gray[:,:,None],3,axis=2)
        if labels is not None:
            plane=_oriented_crop(labels,'z',z,crop)
            rgb[_outline(plane==1)]=[255,55,85]
            rgb[_outline(plane==2)]=[35,220,255]
        x=320+column*310
        draw.text((x,130),('原画像の拡大','現在の開発ラベル','位置補正候補（未採用）')[column],font=small,fill='white')
        sheet.paste(Image.fromarray(rgb).resize((gray.shape[1]*4,gray.shape[0]*4),Image.Resampling.NEAREST),(x,180))
    draw.text((320,379),'赤＝左赤核、青＝右赤核。輪郭以外は同じ原画像です。',font=small,fill='white')
    draw.text((20,456),'原画像の位置は変えず、元の手動区画へ公式の変位場を適用した研究候補です。',font=small,fill='white')
    draw.text((20,490),'全22構造の精査の一例。専門家承認や、すべての境界が正しいという意味ではありません。',font=small,fill='#d0dae2')
    return sheet


def render_new_overlaps(raw,current,prior,tight,output):
    points=np.argwhere((current>22)&(prior==0)&(tight>0))
    records=[]
    for number,p in enumerate(points,1):
        value,other=int(tight[tuple(p)]),int(current[tuple(p)])
        issue=dict(candidateId=value,currentId=other,points=[p.tolist()])
        crop=dict(min=(p-8).tolist(),max=(p+8).tolist())
        record=dict(xyz=p.tolist(),candidateId=value,currentId=other,sheets=[])
        for n,axis in enumerate('xyz'):
            indices=[int(p[n]+d) for d in (-1,0,1)]
            rows=[render_issue(raw,current,tight,issue,axis,i,crop) for i in indices]
            sheet=Image.new('RGB',(rows[0].width,sum(r.height for r in rows)+30),'#151515')
            ImageDraw.Draw(sheet).text((4,4),f'NEW PRECISION OVERLAP {p.tolist()} | prior app ID{other} / tight ID{value}; NOT ADOPTED',fill='white')
            top=30
            for row in rows:sheet.paste(row,(0,top));top+=row.height
            filename=f'new-overlap-{number:02d}-{axis}.png';sheet.save(output/filename)
            record['sheets'].append(dict(file=filename,planes=[[axis,i] for i in indices],sha256=hashlib.sha256((output/filename).read_bytes()).hexdigest()))
        records.append(record)
    return records


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tight-dir',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args(); output=args.output.resolve()
    if not output.is_relative_to((ROOT/'work').resolve()) or output.exists():
        raise ValueError('Output must be new and within work')
    _,dims,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    before,affine,prior=load_candidate(ROOT/'work/anatomy-review/manual-all22-registered-v1',dims)
    after,other_affine,tight=load_candidate(args.tight_dir,dims)
    if prior['candidateSha256']!=CANDIDATE_SHA or prior['candidateRawFullGridSha256']!=CANDIDATE_RAW_SHA or not np.array_equal(affine,other_affine) or tight.get('inversePrecision')!='tight' or tight.get('perGridToleranceMm')!=1e-6 or tight['maximumComposedResidualMm']>1e-5:
        raise ValueError('Unexpected precision comparison')
    points,support=change_points(before,after)
    if not all(support): raise ValueError('Precision change extends beyond immediate label neighborhood')
    output.mkdir(parents=True)
    records=[dict(xyz=p.tolist(),before=int(before[tuple(p)]),after=int(after[tuple(p)]),withinImmediateNeighborhood=s) for p,s in zip(points,support)]
    report=dict(schemaVersion=1,adopted=False,labelMutation=False,expertReview=False,
        imageSha256=EXPECTED_IMAGE_SHA256,priorCandidateSha256=CANDIDATE_SHA,tightCandidateSha256=tight['candidateSha256'],
        changedVoxelCount=len(points),comparisonPlanes=3*len(points),
        scope='All changed voxels, X/Y/Z central raw-image planes. Not extra adjacent slices or expert approval.',changes=records,sheets=[])
    _,_,current=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    locator='locator-red-nucleus.png';render_locator(raw,current,after).save(output/locator)
    report['locator']=dict(file=locator,sha256=hashlib.sha256((output/locator).read_bytes()).hexdigest(),axis='z',index=130,currentLabelsSha256=LABEL_SHA)
    report['newOverlapReviews']=render_new_overlaps(raw,current,before,after,output)
    for offset in range(0,len(points),8):
        batch=points[offset:offset+8]
        rows=[render_point(raw,before,after,p) for p in batch]
        sheet=Image.new('RGB',(rows[0].width,sum(r.height for r in rows)+38),'#151515')
        ImageDraw.Draw(sheet).text((4,5),'PRECISION DIFFERENCES ONLY | raw / prior candidate / tight candidate; yellow box = voxel location',fill='white')
        top=38
        for row in rows: sheet.paste(row,(0,top));top+=row.height
        name=f'precision-{offset//8+1:03d}.png';sheet.save(output/name)
        report['sheets'].append(dict(file=name,firstChange=offset,changeCount=len(batch),sha256=hashlib.sha256((output/name).read_bytes()).hexdigest()))
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(changedVoxels=len(points),sheets=len(report['sheets']),planes=3*len(points))),flush=True)


if __name__=='__main__': main()
