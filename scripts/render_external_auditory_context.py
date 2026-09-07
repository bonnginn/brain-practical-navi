"""Stream matching external image/atlas into small ROIs; no app registration."""
import gzip
import hashlib
import json
import struct
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'work/auditory-atlas-sitek'
IMAGE_SHA = '756f6bad1b3a7a0c1abd1fb1e34089d45c1b20ea346fda23835fbfe268c9f7ff'
LABEL_SHA = '4327588dc0d2beae92a4f47d48af674235bfcd8742ca71a2592a91aa46994e91'


def stream_crops(path, expected_sha, dtype, datatype, intercept, rois, key):
    with path.open('rb') as file:
        if hashlib.file_digest(file, 'sha256').hexdigest() != expected_sha:
            raise ValueError('Source hash differs')
    with gzip.open(path, 'rb') as stream:
        h = stream.read(352)
        if struct.unpack_from('<i', h)[0] != 348 or h[344:348] != b'n+1\0':
            raise ValueError('NIfTI format differs')
        if struct.unpack_from('<8h', h, 40)[:4] != (3, 720, 600, 840):
            raise ValueError('Shape differs')
        if struct.unpack_from('<h', h, 70)[0] != datatype or struct.unpack_from('<f', h, 108)[0] != 352:
            raise ValueError('Type/offset differs')
        slope, shift = struct.unpack_from('<2f', h, 112)
        if slope not in (0, 1) or shift != intercept:
            raise ValueError('Scaling differs')
        affine = np.array(struct.unpack_from('<12f', h, 280)).reshape(3, 4)
        for z in range(840):
            payload = stream.read(720 * 600 * np.dtype(dtype).itemsize)
            if len(payload) != 720 * 600 * np.dtype(dtype).itemsize:
                raise ValueError('Truncated source')
            plane = np.frombuffer(payload, dtype=dtype).reshape((720, 600), order='F')
            for r in rois:
                lo, hi = r['lo'], r['hi']
                if lo[2] <= z < hi[2]:
                    r[key][:, :, z-lo[2]] = plane[lo[0]:hi[0], lo[1]:hi[1]].astype(np.int32) + intercept
        if stream.read(1):
            raise ValueError('Trailing source bytes')
    return affine


def main():
    out = BASE / 'context-v1'
    if out.exists():
        raise ValueError('Preserve previous evidence')
    inventory = json.loads((BASE/'inventory-v1.json').read_text())
    rois = []
    for key, item in sorted(inventory['values'].items()):
        lo = np.maximum(0, np.array(item['minXYZ'])-45)
        hi = np.minimum([720,600,840], np.array(item['maxXYZ'])+46)
        rois.append(dict(value=int(key), lo=lo, hi=hi,
            center=(np.array(item['minXYZ'])+item['maxXYZ'])//2,
            image=np.zeros(hi-lo,dtype=np.uint16), labels=np.zeros(hi-lo,dtype=np.uint8)))
    a=stream_crops(BASE/'sub-bigbrain_MNI_100um_bstem_corrected.nii.gz',IMAGE_SHA,'<i2',4,32768,rois,'image')
    b=stream_crops(BASE/'sub-bigbrain_MNI_conjunction_rois.nii.gz',LABEL_SHA,'<f4',16,0,rois,'labels')
    if not np.array_equal(a,b) or not np.allclose(a,np.array(inventory['affine'])[:3],rtol=0,atol=0):
        raise ValueError('Image/atlas/inventory affine mismatch')
    out.mkdir();figures=[]
    for r in rois:
        rows=[];frames=[]
        for dim,axis in enumerate('xyz'):
            idx=int(r['center'][dim]-r['lo'][dim])
            raw=np.flipud(np.take(r['image'],idx,axis=dim).T)
            labels=np.flipud(np.take(r['labels'],idx,axis=dim).T)
            gray=np.rint(raw/257).astype(np.uint8)
            mask=labels==r['value'];edge=mask.copy()
            edge[1:-1,1:-1]&=~(mask[:-2,1:-1]&mask[2:,1:-1]&mask[1:-1,:-2]&mask[1:-1,2:])
            rgb=np.repeat(gray[:,:,None],3,axis=2);rgb[edge]=[255,60,90]
            h,w=gray.shape;scale=3
            row=Image.new('RGB',(w*scale*2+12,h*scale+40),'#181818');d=ImageDraw.Draw(row)
            d.text((4,3),f"External numeric ID {r['value']}; {axis.upper()}{r['center'][dim]}: original / label",fill='white')
            d.text((4,20),'Author-corrected space; anatomical key unverified; NOT current app overlay',fill='white')
            row.paste(Image.fromarray(gray).convert('RGB').resize((w*scale,h*scale),Image.Resampling.NEAREST),(0,40))
            row.paste(Image.fromarray(rgb).resize((w*scale,h*scale),Image.Resampling.NEAREST),(w*scale+12,40))
            rows.append(row);frames.append(dict(axis=axis,index=int(r['center'][dim])))
        sheet=Image.new('RGB',(max(x.width for x in rows),sum(x.height for x in rows)),'#181818');y=0
        for row in rows:sheet.paste(row,(0,y));y+=row.height
        target=out/f"id-{r['value']}.png";sheet.save(target)
        figures.append(dict(value=r['value'],path=target.name,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
            cropExclusive=dict(min=r['lo'].tolist(),max=r['hi'].tolist()),frames=frames))
    report=dict(imageSha256=IMAGE_SHA,labelSha256=LABEL_SHA,affine=a.tolist(),figures=figures,
        mutation=False,adopted=False,registrationToCurrentAppVerified=False,anatomicalLabelKeyVerified=False,
        coverage='Three central planes per numeric ID; not full serial boundary review')
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('8 sheets / 24 central planes generated; require visual inspection')


if __name__=='__main__':main()
