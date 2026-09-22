"""Unapplied anterior continuation draft; no label or mesh mutation."""
import argparse
import hashlib
import json
import itertools
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from audit_native_roi_transform import checked, load_linear, load_native_grid
from review_bigbrain_grid_transform import load_published_grids, forward_chain
from render_trigeminal_native100_review import native_points
from build_orthogonal_review_bundle import ROOT, read_browser_volume, DEFAULT_LABELS, MAGIC_LABELS


def inside(point, polygon):
    x, y = point
    hit = False
    for (a,b),(c,d) in zip(polygon,np.roll(polygon,1,axis=0)):
        if (b>y)!=(d>y) and x<(c-a)*(y-b)/(d-b)+a:
            hit = not hit
    return hit


def main(out):
    if out.exists(): raise ValueError('Preserve evidence')
    spec_path = ROOT/'segmentation-patches/review/fornix-anterior-draft-2026-09-19.json'
    spec = json.loads(spec_path.read_text())
    d = np.load(checked(ROOT/spec['cachePath'],spec['cacheSha256']))
    _,_,labels = read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,spec['labelSha256'])
    groups = [{int(y):np.array(p,float) for y,p in spec['contoursNativeXZ'][side].items()} for side in ('left','right')]
    linear, grid, grids = load_linear(),load_native_grid(),load_published_grids('catmull-rom')
    vertices = np.array([[x,y,z] for g in groups for y,p in g.items() for x,z in p])
    world = vertices*d['step']+d['start']
    registered = forward_chain(grids,grid.forward(world@linear[:,:3].T+linear[:,3]))
    app = (registered-[-98,-134,-72])/.5
    low = np.floor(app.min(0)).astype(int)-2;high = np.ceil(app.max(0)).astype(int)+3
    xyz = np.array(list(itertools.product(*(range(a,b) for a,b in zip(low,high)))))
    native,errors = native_points(xyz*.5+[-98,-134,-72],grids,grid,linear)
    q = (native-d['start'])/d['step']
    rows = []
    for point,n in zip(xyz,q):
        if not 860<=n[1]<=880:continue
        a,b = (860,870) if n[1]<870 else (870,880)
        t = (n[1]-a)/(b-a)
        for side,g in enumerate(groups,1):
            if inside(n[[0,2]],g[a]*(1-t)+g[b]*t):
                rows.append(dict(xyz=point.tolist(),nativeXYZ=n.tolist(),side=side,before=int(labels[tuple(point)])))
    out.mkdir(parents=True)
    figures=[]
    for y in range(860,881):
        x0,x1,z0,z1=640,725,605,690
        raw=d['decoded'][x0-d['low'][0]:x1-d['low'][0],y-d['low'][1],z0-d['low'][2]:z1-d['low'][2]].T[::-1]
        gray=np.rint(np.clip((raw-40000)/25535,0,1)*255).astype('u1')
        im=Image.fromarray(gray).convert('RGB').resize((340,340),Image.Resampling.NEAREST)
        annotated=im.copy();draw=ImageDraw.Draw(annotated)
        a,b=(860,870) if y<870 else (870,880);t=(y-a)/(b-a)
        for g in groups:
            polygon=(1-t)*g[a]+t*g[b]
            pts=[((x-x0+.5)*4,(z1-1-z+.5)*4) for x,z in polygon]
            draw.line(pts+[pts[0]],fill=(220,50,170),width=2)
        pair=Image.new('RGB',(688,370),'white');pair.paste(im,(0,30));pair.paste(annotated,(348,30))
        ImageDraw.Draw(pair).text((5,8),f'Y{y}: RAW / UNAPPLIED DRAFT; no gap or partial-volume screening yet',fill='black')
        p=out/f'y{y}.png';pair.save(p);figures.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
    counts={str(k):sum(r['before']==k for r in rows) for k in sorted({r['before'] for r in rows})}
    report=dict(adopted=False,labelsWritten=False,specSha256=hashlib.sha256(spec_path.read_bytes()).hexdigest(),
        sourceLabelSha256=spec['labelSha256'],scope=spec['scope'],rows=rows,beforeCounts=counts,
        maxRoundtripErrorMm=float(errors.max()),figures=figures,
        warning='Candidate centres only; no anatomical approval, voxel occupancy screen, or full orthogonal review.')
    (out/'candidate.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
    print(json.dumps({'candidateCentres':len(rows),'beforeCounts':counts,'labelsWritten':False}))


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',type=Path,required=True)
    main(p.parse_args().out.resolve())
