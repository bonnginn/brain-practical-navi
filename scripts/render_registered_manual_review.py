"""Render raw/current/candidate review sheets without changing any labels."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, DEFAULT_IMAGE, MAGIC_LABELS, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256, read_browser_volume, _oriented_crop, _outline
from audit_manual_label_space import LABEL_SHA

NAMES = ['red-nucleus', 'substantia-nigra', 'subthalamic-nucleus', 'caudate', 'putamen', 'GPe', 'GPi', 'thalamus', 'hippocampus', 'accumbens', 'amygdala']


def review_planes(points, dims):
    """All occupied-range Z including endpoints; five spaced X/Y with neighbors."""
    low, high = points.min(0), points.max(0)
    planes = [('z',i) for i in range(max(0,int(low[2])-1), min(dims[2],int(high[2])+2))]
    for number, axis in enumerate(('x','y')):
        centers = np.rint(np.linspace(low[number], high[number], 5)).astype(int)
        indices = sorted({int(i+d) for i in centers for d in (-1,0,1) if 0 <= i+d < dims[number]})
        planes.extend((axis,i) for i in indices)
    return planes


def render_row(raw, old, new, axis, index, crop, ids):
    image = _oriented_crop(raw, axis, index, crop)
    before = _oriented_crop(old, axis, index, crop); after = _oriented_crop(new, axis, index, crop)
    height, width = image.shape; scale = max(2,min(6,480//width))
    row = Image.new('RGB',(max(1100,3*(width*scale+10)),height*scale+26),'#151515')
    draw = ImageDraw.Draw(row)
    draw.text((4,3),f'{axis.upper()}={index}   RAW / CURRENT / REGISTERED CANDIDATE    L red / R cyan',fill='white')
    for column, labels in enumerate((None,before,after)):
        rgb=np.repeat(image[:,:,None],3,axis=2)
        if labels is not None:
            for value,color in zip(ids,([255,55,85],[35,220,255])):
                rgb[_outline(labels==value)]=color
        panel=Image.fromarray(rgb).resize((width*scale,height*scale),Image.Resampling.NEAREST)
        row.paste(panel,(column*(width*scale+10),26))
    return row


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate-dir',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args(); output=args.output.resolve()
    if not output.is_relative_to((ROOT/'work').resolve()) or output.exists():
        raise ValueError('Output must be a new directory inside work/')
    report=json.loads((args.candidate_dir/'report.json').read_text(encoding='utf-8'))
    path=args.candidate_dir/'candidate-all22.npz'
    if report['adopted'] or report['labelsSha256']!=LABEL_SHA or hashlib.sha256(path.read_bytes()).hexdigest()!=report['candidateSha256']:
        raise ValueError('Unexpected candidate identity/status')
    _,dims,old=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    new=np.zeros(dims,dtype=np.uint8)
    with np.load(path,allow_pickle=False) as source:
        low,high=source['minimum'],source['maximumExclusive']
        if not np.array_equal(source['dimensions'],dims): raise ValueError('Wrong candidate dimensions')
        new[tuple(slice(int(a),int(b)) for a,b in zip(low,high))]=source['labels']
    if hashlib.sha256(new.tobytes(order='F')).hexdigest()!=report['candidateRawFullGridSha256']:
        raise ValueError('Candidate reconstruction mismatch')
    output.mkdir(parents=True)
    manifest=dict(candidateSha256=report['candidateSha256'],labelsSha256=LABEL_SHA,imageSha256=EXPECTED_IMAGE_SHA256,
                  adopted=False,labelMutation=False,visualReview='Generator only; no visual decision.',groups=[])
    for left,name in zip(range(1,23,2),NAMES):
        ids=(left,left+1)
        points=np.argwhere(np.isin(old,ids)|np.isin(new,ids))
        crop=dict(min=np.maximum(points.min(0)-6,0).tolist(),max=np.minimum(points.max(0)+6,np.array(dims)-1).tolist())
        planes=review_planes(points,dims)
        group=dict(ids=ids,name=name,crop=crop,planeCount=len(planes),sheets=[])
        # Keep axes separate so sequential sheets retain anatomical continuity.
        for axis in ('z','x','y'):
            selected=[pair for pair in planes if pair[0]==axis]
            for offset in range(0,len(selected),4):
                batch=selected[offset:offset+4]
                rows=[render_row(raw,old,new,a,i,crop,ids) for a,i in batch]
                sheet=Image.new('RGB',(max(r.width for r in rows),sum(r.height for r in rows)+30),'#151515')
                ImageDraw.Draw(sheet).text((4,4),f'{name} IDs{left}/{left+1} | RESEARCH CANDIDATE, NOT ADOPTED | published-transform nearest source300',fill='white')
                top=30
                for row in rows: sheet.paste(row,(0,top)); top+=row.height
                filename=f'{left:02d}-{name}-{axis}-{offset//4+1:02d}.png';sheet.save(output/filename)
                group['sheets'].append(dict(file=filename,planes=batch,sha256=hashlib.sha256((output/filename).read_bytes()).hexdigest()))
        manifest['groups'].append(group)
        print(f'{name}: {len(planes)} planes, {len(group["sheets"])} sheets',flush=True)
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')


if __name__=='__main__':main()
