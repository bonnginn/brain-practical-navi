"""Review-only small interior trial in the already inspected bend series."""
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT


def main():
    out=ROOT/'work/anatomy-review/fornix-bend-core-draft-v1'
    if out.exists():raise ValueError('Preserve evidence')
    raw,_,_,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    # Lower interior trial, kept above the rejected inferior-edge references.
    # Piecewise positions are not claimed to be an anatomical outer contour.
    left_z=[287,287,286,286,285,285,285,285,285,285,285,285,285]
    right_z=[288,288,287,287,286,286,286,286,285,285,285,284,284]
    points=[]
    for y,lz,rz in zip(range(422,435),left_z,right_z):
        for x,z in [(321,lz),(330,rz)]:
            points.extend([[x+dx,y,z+dz] for dx,dz in [(0,0),(-1,0),(1,0),(0,-1),(0,1)]])
    points=np.asarray(points,dtype=int)
    if points.shape!=(130,3) or len(set(map(tuple,points)))!=130:raise ValueError('Invalid trial')
    out.mkdir();sheets=[];figures=[]
    for y in range(421,436):
        gray=encode_image(raw[310:345,y,275:306],geometry['intensityWindow']).T[::-1,:]
        rgb=np.repeat(gray[:,:,None],3,axis=2);overlay=rgb.copy()
        for x,py,z in points:
            if py==y:overlay[305-z,x-310]=np.rint(.6*overlay[305-z,x-310]+.4*np.array([255,120,0])).astype(np.uint8)
        scale=7;h,w=gray.shape
        sheet=Image.new('RGB',(650,h*scale+35),'#181818')
        ImageDraw.Draw(sheet).text((3,3),f'Registered300 Y{y}, X310-344 / Z305(top)-275\nRaw / small INTERIOR TRIAL, not full contour, NOT adopted',fill='white')
        for col,p in enumerate((rgb,overlay)):sheet.paste(Image.fromarray(p).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),35))
        sheets.append(sheet)
    for offset in range(0,15,3):
        group=sheets[offset:offset+3];sheet=Image.new('RGB',(650,sum(p.height for p in group)));dy=0
        for p in group:sheet.paste(p,(0,dy));dy+=p.height
        target=out/f'contact-{offset//3}.png';sheet.save(target)
        figures.append(dict(path=target.name,nativeY=list(range(421+offset,424+offset)),sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    report=dict(sourceSha256=IMAGE_SHA,sourcePoints=points.tolist(),sourcePointCount=len(points),
        sourceIntensityRange=[int(raw[tuple(points.T)].min()),int(raw[tuple(points.T)].max())],figures=figures,
        adopted=False,mutation=False,visualReviewPending=True,
        limitation='Small image-guided lower-interior trial. Does not cover the full fornix contour or connect to the earlier body draft. No region growing or app-grid adoption.')
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['sourcePointCount','sourceIntensityRange','adopted']}))


if __name__=='__main__':main()
