"""Read-only closed, seed-connected dark cavity candidates at app Z174–202."""
import json
import argparse
import re
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _outline
from audit_ventricle_cavity_candidates import DEFAULT_IMAGE, EXPECTED_IMAGE_SHA256
from stage_lateral_detached547 import digest

LABEL_SHA = '63ac0815f7631e35029b9811485593e1bf0f2121cfe362366af74d1664f2dea8'


def candidates(image, labels, zmin=174, zmax=202, *, minimum=255):
    if image.shape != labels.shape or not 0 <= zmin <= zmax < image.shape[2]:
        raise ValueError('Invalid volumes or slice range')
    if type(minimum)is not int or not 240 <= minimum <= 255:raise ValueError('Unsupported darkness threshold')
    result = np.zeros_like(labels); records = []
    for z in range(zmin, zmax + 1):
        plane = image[:, :, z]; lab = labels[:, :, z]
        # Default accepts only true encoded background. Lower values are diagnostic only.
        groups, n = ndimage.label((plane >= minimum) & np.isin(lab, [0, 23, 24]), ndimage.generate_binary_structure(2, 1))
        ids = np.unique(groups[np.isin(lab, [23, 24])]); ids = ids[ids != 0]
        for k in ids:
            region = groups == k
            seeds = sorted(int(v) for v in np.unique(lab[region]) if v in (23, 24))
            edge = bool(region[0].any() or region[-1].any() or region[:, 0].any() or region[:, -1].any())
            chosen = region & (lab == 0)
            accept = not edge and len(seeds) == 1
            if accept: result[:, :, z][chosen] = seeds[0]
            records.append(dict(z=z,component=int(k),seeds=seeds,touchesImageEdge=edge,
                existing=int((region & (lab != 0)).sum()),candidate=int(chosen.sum()),eligible=accept))
    return result, records


def main(zmin=174,zmax=202,minimum=255,label_sha=LABEL_SHA,prefix='lateral-upper-z174-202-v1',anterior_min_y=None):
    if not re.fullmatch(r'[a-z0-9-]+',prefix) or not re.fullmatch(r'[a-f0-9]{64}',label_sha):raise ValueError('Invalid output or source')
    out = ROOT/f'work/anatomy-review/{prefix}'
    if out.exists(): raise ValueError('Preserve evidence')
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, label_sha)
    _, _, image = read_browser_volume(DEFAULT_IMAGE, b'BBV1', EXPECTED_IMAGE_SHA256)
    proposed, records = candidates(image, labels,zmin,zmax,minimum=minimum)
    if anterior_min_y is not None:
        if type(anterior_min_y)is not int or not 0<=anterior_min_y<labels.shape[1]:raise ValueError('Invalid work bound')
        proposed[:,:anterior_min_y,:]=0
    points = [dict(xyz=p.tolist(), before=0, after=int(proposed[tuple(p)])) for p in np.argwhere(proposed)]
    out.mkdir(); figures=[]
    # Inverted app grayscale: source255 cavity is black. Entire central brain context.
    xlo,xhi,ylo,yhi=85,310,100,340
    for first in range(zmin,zmax+1,4):
        rows=[]
        for z in range(first,min(first+4,zmax+1)):
            g=255-image[xlo:xhi,ylo:yhi,z].T[::-1]; old=labels[xlo:xhi,ylo:yhi,z].T[::-1]
            new=proposed[xlo:xhi,ylo:yhi,z].T[::-1]
            rgb=np.repeat(g[:,:,None],3,axis=2); overlay=rgb.copy()
            overlay[_outline(np.isin(old,[23,24]))]=[50,190,255]
            overlay[new>0]=np.rint(.3*rgb[new>0]+.7*np.array([255,190,20])).astype(np.uint8)
            row=Image.new('RGB',(920,510),'#181818')
            ImageDraw.Draw(row).text((5,5),f'App Z{z}: raw / current cyan + candidate amber; NOT ADOPTED',fill='white')
            for col,pic in enumerate([rgb,overlay]):row.paste(Image.fromarray(pic).resize((450,480),Image.Resampling.NEAREST),(col*465,25))
            rows.append(row)
        sheet=Image.new('RGB',(920,len(rows)*510),'#181818')
        for r,row in enumerate(rows):sheet.paste(row,(0,r*510))
        path=out/f'z-{first}-{min(first+3,zmax)}.png';sheet.save(path)
        figures.append(dict(path=path.name,sha256=digest(path.read_bytes())))
    report=dict(labelSha256=label_sha,imageSha256=EXPECTED_IMAGE_SHA256,points=points,count=len(points),
        counts={str(k):int((proposed==k).sum()) for k in [23,24]},components=records,figures=figures,
        adopted=False,visualReviewPending=True,mutation=False,
        limitation='User-directed axial interval; existing single-label seed and closed 4-connected full-plane intensity component. Requires original-image and orthogonal review; processing artifacts and tissue must not be treated as lumen.')
    if prefix!='lateral-upper-z174-202-v1':report.update(zRange=[zmin,zmax],minimumEncoded=minimum,anteriorWorkMinY=anterior_min_y)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['points','figures','components']}))
    print('reportSha256',digest((out/'report.json').read_bytes()))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--zmin',type=int,default=174);p.add_argument('--zmax',type=int,default=202)
    p.add_argument('--minimum',type=int,default=255);p.add_argument('--label-sha',default=LABEL_SHA)
    p.add_argument('--prefix',default='lateral-upper-z174-202-v1');p.add_argument('--anterior-min-y',type=int)
    a=p.parse_args();main(a.zmin,a.zmax,a.minimum,a.label_sha,a.prefix,a.anterior_min_y)
