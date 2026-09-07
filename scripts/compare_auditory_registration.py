"""Coordinate hypotheses only: author-corrected100 vs current-source300."""
import json,hashlib,argparse
import numpy as np
from scipy.ndimage import map_coordinates
from PIL import Image,ImageDraw
from render_external_auditory_context import BASE,IMAGE_SHA,stream_crops
from audit_manual_label_space import SOURCE,load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME,IMAGE_SHA as CURRENT_SHA


def main(published=False):
    out=BASE/('published-chain-v1' if published else 'same-world-v1')
    if out.exists():raise ValueError('Preserve evidence')
    inventory=json.loads((BASE/'inventory-v1.json').read_text());rois=[]
    for key,item in sorted(inventory['values'].items()):
        lo=np.maximum(0,np.array(item['minXYZ'])-45);hi=np.minimum([720,600,840],np.array(item['maxXYZ'])+46)
        rois.append(dict(value=int(key),lo=lo,hi=hi,center=(np.array(item['minXYZ'])+item['maxXYZ'])//2,image=np.zeros(hi-lo,dtype=np.uint16)))
    affine=stream_crops(BASE/'sub-bigbrain_MNI_100um_bstem_corrected.nii.gz',IMAGE_SHA,'<i2',4,32768,rois,'image')
    current,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,CURRENT_SHA)
    grids=None
    if published:
        from review_bigbrain_grid_transform import load_published_grids,forward_chain,XFM_SHA,GRID_SHAS
        grids=load_published_grids('catmull-rom')
    out.mkdir();figures=[]
    for r in rois:
        rows=[];frames=[]
        for dim,axis in enumerate('xyz'):
            index=int(r['center'][dim]-r['lo'][dim])
            native=np.take(r['image'],index,axis=dim)
            other=[k for k in range(3) if k!=dim]
            grid=np.indices(native.shape).reshape(2,-1).T
            xyz=np.empty((len(grid),3));xyz[:,dim]=r['center'][dim]
            for j,k in enumerate(other):xyz[:,k]=grid[:,j]+r['lo'][k]
            world=xyz@affine[:,:3].T+affine[:,3]
            mapped=forward_chain(grids,world) if published else world
            coords=(mapped-start)/step
            if np.any(coords<0) or np.any(coords>np.array(current.shape)-1):raise ValueError('Outside current image')
            lo=np.maximum(0,np.floor(coords.min(0)).astype(int)-1);hi=np.minimum(current.shape,np.ceil(coords.max(0)).astype(int)+2)
            local=current[tuple(slice(a,b) for a,b in zip(lo,hi))].astype(np.float32)
            sampled=map_coordinates(local,(coords-lo).T,order=1,prefilter=False).reshape(native.shape)
            tissue=(native<64000)&(sampled<64000)
            corr=float(np.corrcoef(native[tissue],sampled[tissue])[0,1]) if tissue.sum()>10 else None
            views=[np.flipud(np.rint(p.T/257).astype(np.uint8)) for p in [native,sampled]]
            h,w=views[0].shape;scale=3
            row=Image.new('RGB',(2*w*scale+12,h*scale+45),'#181818');d=ImageDraw.Draw(row)
            d.text((4,3),f"Reference ROI {r['value']}, {axis.upper()}{r['center'][dim]}: Sitek100 / Xiao300 "+('published-chain hypothesis' if published else 'same world'),fill='white')
            d.text((4,22),'Hypothesis only; author correction not inverted; right interpolated300; no labels.' if published else 'NOT registered together; right is interpolated300, not native100. No label transfer.',fill='white')
            for j,view in enumerate(views):row.paste(Image.fromarray(view).convert('RGB').resize((w*scale,h*scale),Image.Resampling.NEAREST),(j*(w*scale+12),45))
            rows.append(row);frames.append(dict(axis=axis,index=int(r['center'][dim]),tissueCorrelation=corr,tissueSamples=int(tissue.sum()),maxSampleDisplacementMm=float(np.linalg.norm(mapped-world,axis=1).max())))
        sheet=Image.new('RGB',(max(p.width for p in rows),sum(p.height for p in rows)),'#181818');y=0
        for row in rows:sheet.paste(row,(0,y));y+=row.height
        path=out/f"id-{r['value']}.png";sheet.save(path)
        figures.append(dict(value=r['value'],path=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),frames=frames,
            externalCropExclusive=dict(min=r['lo'].tolist(),max=r['hi'].tolist())))
    report=dict(externalImageSha256=IMAGE_SHA,currentSourceImageSha256=CURRENT_SHA,currentHistory=history,figures=figures,
        mutation=False,adopted=False,registrationVerified=False,
        limitation='Same physical coordinates or applying Xiao directly to author-corrected MNI are diagnostic hypotheses, not recovered transformations. Correlation is not anatomical agreement.')
    if published:report['publishedChainHypothesis']=dict(transformSha256=XFM_SHA,gridSha256=GRID_SHAS,interpolation='catmull-rom',authorCorrectionInverseApplied=False)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(f"8 {'published-chain' if published else 'same-world'} diagnostic sheets generated; no registration/label changes")


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--published-chain',action='store_true')
    main(parser.parse_args().published_chain)
