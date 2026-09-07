"""Whole-brain raw500 locators for the detached547 review; no label mutation."""
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT, DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256, read_browser_volume, _oriented_crop


def main():
    source=ROOT/'work/anatomy-review/lateral-detached547-native300-v1/report.json'
    report=json.loads(source.read_text())
    points=np.array(report['points'])
    if len(points)!=547 or report['labelsSha256']!='b45c0669122b628529f56e73af06fa1cb697b621da99d51c8b921b136ea52463':raise ValueError('Reference changed')
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    out=ROOT/'work/anatomy-review/lateral-detached547-locator-v1'
    if out.exists():raise ValueError('Preserve evidence')
    out.mkdir();figures=[]
    crop=dict(min=[0,0,0],max=(np.array(raw.shape)-1).tolist())
    marker=np.zeros_like(raw);marker[tuple(points.T)]=1
    center=[247,135,152]
    for dim,axis in enumerate('xyz'):
        plane=_oriented_crop(raw,axis,center[dim],crop)
        mask=_oriented_crop(marker,axis,center[dim],crop)!=0
        rgb=np.repeat(plane[:,:,None],3,axis=2);rgb[mask]=[255,50,90]
        im=Image.fromarray(rgb).resize((rgb.shape[1]*2,rgb.shape[0]*2),Image.Resampling.NEAREST)
        draw=ImageDraw.Draw(im);draw.text((8,8),f'Whole raw500 {axis.upper()}{center[dim]}; red=existing detached ID24, NOT approved',fill='#ff3270')
        if mask.any():
            yy,xx=np.where(mask);draw.rectangle((int(xx.min()*2)-8,int(yy.min()*2)-8,int(xx.max()*2)+8,int(yy.max()*2)+8),outline='#ffcc00',width=2)
        path=out/f'{axis}.png';im.save(path)
        figures.append(dict(path=path.name,axis=axis,index=center[dim],sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(dict(referenceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),imageSha256=EXPECTED_IMAGE_SHA256,figures=figures,mutation=False),indent=2)+'\n')


if __name__=='__main__':main()
