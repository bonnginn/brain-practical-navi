"""Unmarked consecutive native100 coronal context, not a segmented fornix."""
import json
import argparse
import hashlib
import h5py
import numpy as np
from PIL import Image,ImageDraw
from build_orthogonal_review_bundle import ROOT
from audit_native_roi_transform import checked
from read_native100_crop import read_crop

SOURCE_SHA='61e6ebbeb0d6876051b9348a68bfe22b733fead04d112c35ff1a29819b67d351'
REFERENCE_SHA='9f9978dca5dd6930b4efc51b9a4f11caceb356a2b1d57cc20d6f58d48c7cc229'
def sha(data):return hashlib.sha256(data).hexdigest()

def main(orthogonal=False):
    out=ROOT/('work/anatomy-review/fornix-native100-wide-orthogonal-v1' if orthogonal else 'work/anatomy-review/fornix-native100-coronal-series-v1')
    if out.exists():raise ValueError('Preserve evidence')
    reference=checked(ROOT/'work/anatomy-review/fornix-native100-connection-v1/report.json',REFERENCE_SHA)
    prior=json.loads(reference.read_text(encoding='utf-8'))
    points=np.array([p['nativeXYZ'] for p in prior['points']])
    low=np.floor(points.min(axis=0)).astype(int)-[60,10,60]
    high=np.ceil(points.max(axis=0)).astype(int)+[61,11,61]
    if orthogonal:
        low[1]-=70;high[1]+=70
    source=checked(ROOT/'work/full16_100um_optbal.mnc',SOURCE_SHA)
    with h5py.File(source,'r') as file:
        decoded,_,_,metadata=read_crop(file['minc-2.0/image/0'],low,high)
    figures=[];panels=[];out.mkdir()
    planes=[(1,i) for i in range(int(low[1]),int(high[1]))]
    if orthogonal:
        centers=[int(np.rint(points[0,0])),int(np.rint(points[:,0].mean())),int(np.rint(points[1,0]))]
        z=int(np.rint(points[:,2].mean()))
        planes=[(0,c+d) for c in centers for d in [-1,0,1]]+[(2,z+d) for d in [-1,0,1]]
    for axis,index in planes:
        values=np.take(decoded,index-low[axis],axis=axis).T[::-1,:]
        gray=np.rint(np.clip((values-40000)/25535,0,1)*255).astype('uint8')
        picture=Image.fromarray(gray).convert('RGB').resize((gray.shape[1]*4,gray.shape[0]*4),Image.Resampling.NEAREST)
        panel=Image.new('RGB',(picture.width,picture.height+45),'#181818');panel.paste(picture,(0,45));draw=ImageDraw.Draw(panel)
        a,b=[k for k in range(3) if k!=axis]
        draw.text((4,3),f'Native100 {"XYZ"[axis]}{index} | {"XYZ"[a]}{low[a]}..{high[a]-1} / {"XYZ"[b]}{low[b]}..{high[b]-1}',fill='white')
        draw.text((4,17),'Raw only; window 40000..65535; no inversion.',fill='white')
        draw.text((4,31),'Fornix connection context, NOT an adopted boundary.',fill='white')
        path=out/f'{"xyz"[axis]}-{index}.png';panel.save(path);panels.append(panel)
        figures.append(dict(path=path.name,axis='xyz'[axis],index=index,sha256=sha(path.read_bytes()),decodedSha256=sha(values.tobytes())))
    contacts=[]
    for offset in range(0,len(panels),3):
        group=panels[offset:offset+3];sheet=Image.new('RGB',(sum(p.width for p in group),group[0].height),'#181818');x=0
        for panel in group:sheet.paste(panel,(x,0));x+=panel.width
        path=out/f'contact-{offset//3:02}.png';sheet.save(path)
        contacts.append(dict(path=path.name,sha256=sha(path.read_bytes()),sourcePanels=[f['path'] for f in figures[offset:offset+3]]))
    report=dict(sourceSha256=SOURCE_SHA,referenceReportSha256=REFERENCE_SHA,crop=metadata,intensityWindow=[40000,65535],
        figures=figures,contacts=contacts,adopted=False,mutation=False,visualReviewPending=True)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(firstY=int(low[1]),lastY=int(high[1]-1),planes=len(figures),contacts=len(contacts))))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--orthogonal',action='store_true')
    main(parser.parse_args().orthogonal)
