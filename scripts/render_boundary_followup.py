"""Read-only, pinned adjacent-plane follow-up. No anatomical decisions or patches."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_IMAGE, DEFAULT_LABELS, MAGIC_IMAGE, MAGIC_LABELS,
    EXPECTED_IMAGE_SHA256, EXPECTED_LABELS_SHA256, read_browser_volume,
    _oriented_crop, _outline, PIXEL_TO_VOXEL_FIXED,
)

JOBS = [
    ('callosum-upper', [30], [170,184,190], [221,210,220], [174,192,206]),
    ('hippocampus-left', [17], [123,173,81], [184,265,165], [150,235,99]),
    ('hippocampus-right', [18], [205,175,78], [277,265,166], [250,236,102]),
    ('pallidum-left', [11,13], [131,224,120], [183,297,167], [143,272,136]),
    ('pallidum-right', [12,14], [207,222,119], [261,297,167], [241,272,136]),
]
COLORS = [(255,60,90),(60,220,240)]

def main():
    _,_,image=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,EXPECTED_LABELS_SHA256)
    out=ROOT/'work/anatomy-review/boundary-followup-v1'
    out.mkdir(parents=True,exist_ok=True)
    manifest={'imageSha256':EXPECTED_IMAGE_SHA256,'labelsSha256':EXPECTED_LABELS_SHA256,
              'labelMutation':False,'reviewStatus':'unreviewed','pixelToVoxel':PIXEL_TO_VOXEL_FIXED,
              'limitations':'Six consecutive planes per selected axis/window, not full label extent. 0.5mm display grid, not original microscopy resolution.', 'sheets':[]}
    for name,ids,lo,hi,starts in JOBS:
        crop={'min':lo,'max':hi}
        for a,axis in enumerate('xyz'):
            panels=[];frames=[]
            for index in range(starts[a],starts[a]+6):
                raw=_oriented_crop(image,axis,index,crop)
                seg=_oriented_crop(labels,axis,index,crop)
                rgb=np.repeat(raw[:,:,None],3,axis=2)
                for label,color in zip(ids,COLORS): rgb[_outline(seg==label)]=color
                h,w=raw.shape; scale=3
                panel=Image.new('RGB',(w*6+12,h*3+28),'#151515')
                ImageDraw.Draw(panel).text((4,5),f'{name} {axis.upper()}={index} RAW | {ids}',fill='white')
                for col,data in enumerate([raw,rgb]):
                    panel.paste(Image.fromarray(data).convert('RGB').resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),28))
                panels.append(panel)
                frames.append({'index':index,'rawSha256':hashlib.sha256(raw.tobytes()).hexdigest(),
                               'counts':{str(i):int(np.count_nonzero(seg==i)) for i in ids}})
            sheet=Image.new('RGB',(panels[0].width*2,panels[0].height*3),'#151515')
            for n,p in enumerate(panels):sheet.paste(p,((n%2)*p.width,(n//2)*p.height))
            file=f'{name}-{axis}.png';sheet.save(out/file)
            manifest['sheets'].append({'path':file,'axis':axis,'ids':ids,'crop':crop,'scale':3,'frames':frames,
                                      'sha256':hashlib.sha256((out/file).read_bytes()).hexdigest()})
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'output':str(out),'sheets':len(manifest['sheets']),'panels':sum(len(s['frames']) for s in manifest['sheets'])}))

if __name__=='__main__': main()
