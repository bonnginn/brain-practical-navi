"""Read-only sensitivity to near-black pixels after the 729-cell lateral fill."""
import json
import numpy as np
from PIL import Image,ImageDraw
from explore_lateral_upper_cavity import candidates
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume,_outline
from audit_ventricle_cavity_candidates import DEFAULT_IMAGE,EXPECTED_IMAGE_SHA256
from stage_lateral_detached547 import digest

LABEL_SHA='7693056c443272f472c60d5cce9c051ee20ee851aace4787a47c61ceaa6e1868'


def main():
    out=ROOT/'work/anatomy-review/lateral-upper-dark-thresholds-v1'
    if out.exists():raise ValueError('Preserve evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    _,_,image=read_browser_volume(DEFAULT_IMAGE,b'BBV1',EXPECTED_IMAGE_SHA256)
    runs=[];maps={}
    for threshold in (255,250,248,245,240):
        result,components=candidates(image,labels,minimum=threshold)
        points=np.argwhere(result)
        runs.append(dict(threshold=threshold,count=len(points),counts={str(k):int((result==k).sum()) for k in [23,24]},
            bounds=None if not len(points) else [points.min(0).tolist(),points.max(0).tolist()],
            rejectedComponents=[r for r in components if not r['eligible']],
            perSlice={str(z):int((result[:,:,z]>0).sum()) for z in range(174,203)}))
        maps[threshold]=result
    out.mkdir();figures=[]
    for z in [174,180,187,193,198,202]:
        g=255-image[120:275,125:340,z].T[::-1];a=labels[120:275,125:340,z].T[::-1]
        rows=[]
        for threshold in (250,245,240):
            new=maps[threshold][120:275,125:340,z].T[::-1];rgb=np.repeat(g[:,:,None],3,axis=2);overlay=rgb.copy()
            overlay[_outline(np.isin(a,[23,24]))]=[50,190,255];overlay[new>0]=[255,190,20]
            row=Image.new('RGB',(940,465),'#181818');ImageDraw.Draw(row).text((4,4),f'Z{z} encoded >= {threshold}: raw / locator amber, current cyan. NOT ADOPTED.',fill='white')
            for col,pic in enumerate([rgb,overlay]):row.paste(Image.fromarray(pic).resize((310,430),Image.Resampling.NEAREST),(col*470,30))
            rows.append(row)
        sheet=Image.new('RGB',(940,1395),'#181818')
        for i,row in enumerate(rows):sheet.paste(row,(0,i*465))
        path=out/f'z-{z}.png';sheet.save(path);figures.append(dict(path=path.name,sha256=digest(path.read_bytes())))
    report=dict(labelSha256=LABEL_SHA,imageSha256=EXPECTED_IMAGE_SHA256,runs=runs,figures=figures,
        adopted=False,mutation=False,visualReviewPending=True,
        limitation='Intensity sensitivity only. Near-black tissue, cracks and partial volume may enter lower thresholds. No automatic anatomical adoption.')
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(runs));print('sha256',digest((out/'report.json').read_bytes()))


if __name__=='__main__':main()
