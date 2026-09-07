"""Raw orthogonal and adjacent planes for diagnostic partial-volume cells; no adoption."""
import json
import numpy as np
from PIL import Image, ImageDraw
from diagnose_cavity_partial_volume import weighted_support
from audit_fornix_draft_grid import intersecting_cells
from explore_inferior_horn_cavity import connected_trial
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_third_ventricle_core_repair import digest


def main():
    work=ROOT/'work/anatomy-review';out=work/'inferior-horn-residual-107-partial-cells-v1'
    if out.exists():raise ValueError('Preserve evidence')
    data=(work/'inferior-horn-residual-107-partial-volume-v1.json').read_bytes()
    if digest(data)!='398392684a4afac54f7b8e88974ded4a4f2831f6413ad8ab47e6369e840edb97':raise ValueError('Diagnostic changed')
    report=json.loads(data)
    selected=[r for r in report['records'] if r['currentLabel']==0 and not r['touchesCropFace'] and r['weighted']['65000']['outsideCropVolumeFraction']==0 and r['weighted']['65000']['locatorVolumeFraction']>=.99]
    if len(selected)!=19:raise ValueError('Diagnostic coverage changed')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,report['labelSha256'])
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geo=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine=np.array(geo['affine']);spacing=np.diag(affine)[:3];origin=affine[:3,3]
    crop_low=np.array([416,407,162]);crop_high=np.array([445,425,196])
    locator,_=connected_trial(raw[tuple(slice(a,b) for a,b in zip(crop_low,crop_high))],np.array([429,417,175])-crop_low,65000)
    figures=[];out.mkdir()
    for number,r in enumerate(selected):
        p=np.array(r['xyz']);center=(p*spacing+origin-start)/step;size=spacing/step
        if labels[tuple(p)]!=0:raise ValueError('Existing label collision')
        stats=weighted_support(center,size,locator,crop_low)
        if stats!=r['weighted']['65000']:raise ValueError('Overlap replay mismatch')
        lower=center-size/2;upper=center+size/2
        cells=np.array(intersecting_cells(lower,upper));unsupported=[q for q in cells if not locator[tuple(q-crop_low)]]
        low=np.rint(center).astype(int)-7;high=low+15
        if np.any(low<0) or np.any(high>raw.shape):raise ValueError('Outside raw')
        gray=encode_image(raw[tuple(slice(a,b) for a,b in zip(low,high))],geo['intensityWindow'])
        plane_sets=[range(int(cells[:,a].min())-1,int(cells[:,a].max())+2) for a in range(3)]
        scale=8;panel_w=132;panel_h=144
        image=Image.new('RGB',(max(map(len,plane_sets))*panel_w,3*panel_h+60),'#181818');draw=ImageDraw.Draw(image)
        draw.text((4,3),f'UNADOPTED APP {p.tolist()} | overlap {stats["locatorVolumeFraction"]:.6f}\nCYAN exact cell box (intersecting planes only); MAGENTA unsupported source-cell edges\nRaw300 nearest pixels, no fill. Rows X/Y/Z. Extra first/last planes are adjacent context.',fill='white')
        views=[]
        for axis,indices in enumerate(plane_sets):
            dims=[d for d in range(3) if d!=axis]
            for col,index in enumerate(indices):
                plane=np.take(gray,index-low[axis],axis=axis).T[::-1]
                tile=Image.fromarray(plane).convert('RGB').resize((120,120),Image.Resampling.NEAREST)
                td=ImageDraw.Draw(tile)
                def box(a,b):
                    return ((a[dims[0]]-low[dims[0]]+.5)*scale,(high[dims[1]]-.5-b[dims[1]])*scale,
                            (b[dims[0]]-low[dims[0]]+.5)*scale,(high[dims[1]]-.5-a[dims[1]])*scale)
                for q in unsupported:
                    if q[axis]==index:td.rectangle(box(q-.5,q+.5),outline='#ff4dc4',width=1)
                if index+.5>lower[axis] and index-.5<upper[axis]:td.rectangle(box(lower,upper),outline='#00d9ff',width=1)
                x=col*panel_w;y=60+axis*panel_h
                image.paste(tile,(x,y+20));draw.text((x+3,y+2),f'{"XYZ"[axis]}{index}',fill='white')
                views.append(dict(axis='xyz'[axis],index=index))
        path=out/f'cell-{number:02}.png';image.save(path)
        figures.append(dict(path=path.name,sha256=digest(path.read_bytes()),appXYZ=p.tolist(),sourceCenter=center.tolist(),
                            lower=lower.tolist(),upper=upper.tolist(),unsupportedSourceCells=[q.tolist() for q in unsupported],views=views))
    (out/'report.json').write_text(json.dumps(dict(inputReportSha256=digest(data),labelSha256=report['labelSha256'],sourceSha256=IMAGE_SHA,
        figures=figures,visualReviewPending=True,mutation=False,adopted=False,
        limitation='99% only selects diagnostic views. Magenta outlines show whole intersected source cells, not the smaller overlap volume. Not a boundary approval.'),indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(figures=len(figures),panels=sum(len(f['views']) for f in figures))))


if __name__=='__main__':main()
