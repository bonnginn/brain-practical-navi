"""Current-label review of the unadopted capsule candidate. No label writes."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from audit_capsule_after_registration import inspect,PATCH,ROOT,TARGET,FINAL_SHA
from build_orthogonal_review_bundle import DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline

def current_points(labels, candidate):
    flat=labels.ravel(order='F')
    indices=np.concatenate([np.arange(r['start'],r['start']+r['length']) for r in candidate['runs']])
    return {label:np.array(np.unravel_index(indices[flat[indices]==label],labels.shape,order='F')).T for label in [31,32]}

def main(out):
    out=out.resolve()
    if out.exists() or not out.is_relative_to(ROOT/'work'):raise ValueError('New work directory required')
    audit=inspect()
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(TARGET,MAGIC_LABELS,FINAL_SHA)
    candidate=json.loads(PATCH.read_text(encoding='utf-8'))
    points=current_points(labels,candidate)
    out.mkdir()
    frames=[]
    for label,pts in points.items():
        mask=np.zeros(labels.shape,dtype=bool);mask[tuple(pts.T)]=True
        crop={'min':np.maximum(0,pts.min(0)-10).tolist(),'max':np.minimum(np.array(labels.shape)-1,pts.max(0)+10).tolist()}
        # Every occupied horizontal plane, plus orthogonal extrema/quartiles.
        selections=[('z',np.unique(pts[:,2]))]+[(axis,np.unique(np.percentile(pts[:,dim],[0,25,50,75,100]).astype(int))) for axis,dim in [('x',0),('y',1)]]
        for axis,indices in selections:
            for index in indices:
                raw2=_oriented_crop(raw,axis,int(index),crop)
                lab2=_oriented_crop(labels,axis,int(index),crop)
                marked=_oriented_crop(mask,axis,int(index),crop)
                rgb=np.repeat(raw2[:,:,None],3,axis=2)
                rgb[_outline(lab2==label)]=[255,60,90]
                rgb[_outline((lab2>0)&(lab2<=22))]=[70,200,255]
                rgb[marked]=[255,220,0]
                h,w=raw2.shape
                panel=Image.new('RGB',(w*4+8,h*2+24),'#151515')
                ImageDraw.Draw(panel).text((2,3),f'ID{label} {axis.upper()}{index}: raw | review',fill='white')
                panel.paste(Image.fromarray(raw2).convert('RGB').resize((w*2,h*2),Image.Resampling.NEAREST),(0,24))
                panel.paste(Image.fromarray(rgb).resize((w*2,h*2),Image.Resampling.NEAREST),(w*2+8,24))
                frames.append((panel,dict(label=label,axis=axis,index=int(index),crop=crop,pointCount=int(marked.sum()))))
    sheets=[]
    # Six panels per sheet keep the individual source voxels readable.
    for start in range(0,len(frames),6):
        group=frames[start:start+6];w=max(p.width for p,_ in group);h=max(p.height for p,_ in group)
        sheet=Image.new('RGB',(w*2,h*3),'#151515')
        for n,(p,_) in enumerate(group):sheet.paste(p,((n%2)*w,(n//2)*h))
        file=out/f'current-{start//6:02}.png';sheet.save(file)
        sheets.append(dict(file=file.name,sha256=hashlib.sha256(file.read_bytes()).hexdigest(),frames=[m for _,m in group]))
    report=dict(**audit,imageSha256=EXPECTED_IMAGE_SHA256,frameCount=len(frames),sheets=sheets,
        legend='Yellow: still-capsule historical review points, NOT approved deletion. Red: current capsule. Cyan: registered source nuclei. Raw at left.',
        display='nearest-neighbor 2x; anatomical axis orientation inherited from the tested orthogonal bundle renderer')
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(frames=len(frames),sheets=len(sheets),counts={k:len(v) for k,v in points.items()})))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
