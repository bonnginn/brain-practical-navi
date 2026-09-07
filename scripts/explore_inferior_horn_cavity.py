"""Bounded raw-intensity connectivity exploration; never writes product labels."""
import json
import argparse
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _outline
from build_registered_manual_candidate import nearest_labels
from diagnose_inferior_horn_sampling import SHA
from stage_third_ventricle_core_repair import digest


def connected_trial(raw,seed,threshold):
    seed=np.asarray(seed)
    if seed.shape!=(3,) or not np.issubdtype(seed.dtype,np.integer) or np.any(seed<0) or np.any(seed>=raw.shape):
        raise ValueError('Invalid seed')
    eligible=raw>=threshold
    if not eligible[tuple(seed)]:raise ValueError('Seed outside threshold set')
    cc,_=ndimage.label(eligible,ndimage.generate_binary_structure(3,1))
    mask=cc==cc[tuple(seed)]
    faces={f'{"xyz"[axis]}{side}':int(np.take(mask,0 if side=='min' else -1,axis=axis).sum())
           for axis in range(3) for side in ['min','max']}
    return mask,faces


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--outer-after19',action='store_true',help='Explore the outer cavity beyond the old X445 crop after the 19-cell repair; no adoption')
    parser.add_argument('--finite-candidates',action='store_true',help='Review all occupied native planes of the separate finite application candidates')
    parser.add_argument('--wide-context',action='store_true',help='Expand display only, keeping the 304 finite candidates unchanged')
    parser.add_argument('--residual-51',action='store_true',help='Explore the image-reviewed remaining cavity around the 51-voxel island; no adoption')
    parser.add_argument('--residual-27',action='store_true',help='Explore the reviewed cavity around the residual 27/7 regions; no adoption')
    parser.add_argument('--residual-107',action='store_true',help='Explore the curved cavity at the remaining 107-cell gap; no adoption')
    args=parser.parse_args()
    if args.outer_after19 and any([args.wide_context,args.residual_51,args.residual_27,args.residual_107]):parser.error('Outer exploration is a separate mode')
    if args.residual_107 and (args.residual_27 or args.residual_51 or args.wide_context):parser.error('Residual 107 is a separate mode; wide context not configured')
    if args.residual_27 and (args.residual_51 or args.wide_context):parser.error('Residual 27 is a separate mode; wide context is not configured')
    if args.wide_context and not args.finite_candidates:parser.error('--wide-context requires --finite-candidates')
    if args.residual_51 and args.wide_context:parser.error('Residual wide context is not configured')
    out=ROOT/'work/anatomy-review'/('inferior-horn-cavity-finite-difference-v1' if args.finite_candidates else 'inferior-horn-cavity-exploration-v1')
    if args.wide_context:out=ROOT/'work/anatomy-review/inferior-horn-cavity-wide-context-v1'
    if args.residual_51:out=ROOT/'work/anatomy-review/inferior-horn-residual-51-exploration-v1'
    if args.residual_51 and args.finite_candidates:out=ROOT/'work/anatomy-review/inferior-horn-residual-51-finite-v1'
    if args.residual_27:out=ROOT/'work/anatomy-review/inferior-horn-residual-27-exploration-v1'
    if args.residual_27 and args.finite_candidates:out=ROOT/'work/anatomy-review/inferior-horn-residual-27-finite-v1'
    if args.residual_107:out=ROOT/'work/anatomy-review/inferior-horn-residual-107-exploration-v1'
    if args.residual_107 and args.finite_candidates:out=ROOT/'work/anatomy-review/inferior-horn-residual-107-partial19-union-v1'
    if args.outer_after19:out=ROOT/'work/anatomy-review/inferior-horn-outer-after19-exploration-v1'
    if args.outer_after19 and args.finite_candidates:out=ROOT/'work/anatomy-review/inferior-horn-outer-after19-finite-v1'
    if out.exists():raise ValueError('Preserve evidence')
    label_sha='5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba' if args.residual_51 else SHA
    if args.residual_27:label_sha='681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88'
    if args.residual_107:label_sha='ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb'
    if args.outer_after19:label_sha='58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7'
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,label_sha)
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geo=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine=np.asarray(geo['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    low=np.array([416,288,195]);high=np.array([468,355,257]);shape=high-low
    if args.residual_51:low=np.array([400,408,160]);high=np.array([442,423,202]);shape=high-low
    if args.residual_27:low=np.array([383,387,184]);high=np.array([425,403,214]);shape=high-low
    if args.residual_107:low=np.array([416,407,162]);high=np.array([445,425,196]);shape=high-low
    if args.outer_after19:low=np.array([436,397,158]);high=np.array([466,421,201]);shape=high-low
    cropped=raw[tuple(slice(a,b) for a,b in zip(low,high))]
    seed=np.array([445,317,231])
    if args.residual_51:seed=np.array([415,410,184])
    if args.residual_27:seed=np.array([397,390,199])
    if args.residual_107:seed=np.array([429,417,175])
    if args.outer_after19:seed=np.array([450,405,177])
    trials={};masks={}
    for threshold in [64500,65000,65400]:
        mask,faces=connected_trial(cropped,seed-low,threshold)
        masks[threshold]=mask
        trials[str(threshold)]=dict(count=int(mask.sum()),cropFaceContacts=faces,
                                   touchesCrop=any(faces.values()))
    mask=masks[65000]
    exploration_crop=dict(low=low.tolist(),highExclusive=high.tolist())
    if args.wide_context:
        low=low-20;high=high+20;shape=high-low
        if np.any(low<0) or np.any(high>raw.shape):raise ValueError('Context outside source')
        cropped=raw[tuple(slice(a,b) for a,b in zip(low,high))]
    grid=np.indices(shape).reshape(3,-1).T+low
    projected=nearest_labels(labels,grid*step+start,origin,spacing).reshape(shape)
    finite_info=None
    if args.finite_candidates:
        finite_path=ROOT/'work/anatomy-review/inferior-horn-cavity-grid-v1.json'
        finite_sha='ae68fb441a485258ab93d4294834c7a5ca560c5a6334c6a0b05f25d67b175ce2'
        expected_count=304
        if args.outer_after19:
            finite_path=ROOT/'work/anatomy-review/inferior-horn-outer-after19-grid-v1.json'
            finite_sha='f07efa84d1b8d9a324d8f9f462db90a68608af045fede6129fa89f98129251f3'
            expected_count=40
        if args.residual_51:
            finite_path=ROOT/'work/anatomy-review/inferior-horn-residual-51-grid-v1.json'
            finite_sha='2478cea0ab00d3ba0a915ecc63c8d170526916f5196877b36ef036ffc2ea3129'
            expected_count=57
        if args.residual_27:
            finite_path=ROOT/'work/anatomy-review/inferior-horn-residual-27-grid-v1.json'
            finite_sha='db7a89e6566dad644e53ab3e35588902911a28b2fe835a400f34eeeaa03b30bb'
            expected_count=53
        if args.residual_107:
            finite_path=ROOT/'work/anatomy-review/inferior-horn-residual-107-grid-precision-v1.json'
            finite_sha='f58b187e44994214b940322aa92a67085132b7869a9f3042bdaf77b6204c3327'
            expected_count=19
        if digest(finite_path.read_bytes())!=finite_sha:raise ValueError('Finite candidate evidence changed')
        finite=json.loads(finite_path.read_text(encoding='utf-8'))
        if finite['labelSha256']!=label_sha or finite['sourceSha256']!=IMAGE_SHA:raise ValueError('Finite input identity mismatch')
        if args.residual_107:
            candidate=np.asarray([r['xyz'] for r in finite['records'] if r['selectedForPriorVisualReview']],dtype=int)
            reviewed=json.loads((ROOT/'work/anatomy-review/inferior-horn-residual-107-partial-cells-v1/report.json').read_text(encoding='utf-8'))
            if {tuple(p) for p in candidate}!={tuple(f['appXYZ']) for f in reviewed['figures']}:raise ValueError('Per-cell review coverage changed')
        else:candidate=np.asarray(finite['candidateAppXYZ'],dtype=int)
        if len(candidate)!=expected_count or len(set(map(tuple,candidate)))!=expected_count or np.any(labels[tuple(candidate.T)]!=0):raise ValueError('Candidate set changed')
        app_mask=np.zeros(labels.shape,dtype=np.uint8);app_mask[tuple(candidate.T)]=1
        mask=nearest_labels(app_mask,grid*step+start,origin,spacing).reshape(shape)>0
        finite_info=dict(reportSha256=digest(finite_path.read_bytes()),appCandidateCount=len(candidate),sourceProjectionCount=int(mask.sum()))
    ids,counts=np.unique(projected[mask],return_counts=True)
    gray=encode_image(cropped,geo['intensityWindow']);out.mkdir();figures=[]
    planes=[(1,y) for y in range(314,326)]+[(0,x) for x in [438,442,446,450]]+[(2,z) for z in [225,230,235]]
    if args.residual_51:planes=[(1,y) for y in range(409,422)]+[(0,x) for x in [415,420,427]]+[(2,z) for z in [169,174,177,184]]
    if args.residual_27:planes=[(1,y) for y in range(388,402)]+[(0,x) for x in [397,399,400]]+[(2,z) for z in [198,199,200]]
    if args.residual_107:planes=[(0,x) for x in range(424,434)]+[(1,y) for y in range(414,420)]+[(2,z) for z in range(173,181)]
    if args.outer_after19:planes=[(1,y) for y in [398,403,408,413,418]]+[(0,x) for x in [445,450,455]]+[(2,z) for z in [170,180,190]]
    if args.finite_candidates:
        occupied=np.argwhere(mask)+low
        planes=[]
        for axis in range(3):
            indices={int(v+d) for v in np.unique(occupied[:,axis]) for d in [-1,0,1] if low[axis]<=v+d<high[axis]}
            planes.extend((axis,index) for index in sorted(indices))
    if args.wide_context:
        planes=[(0,x) for x in [418,426,434,453,456,459]]+[(2,z) for z in [202,207,211,238,246,254]]+[(1,y) for y in [290,350]]
    for axis,index in planes:
        p=np.take(gray,index-low[axis],axis=axis).T[::-1]
        m=np.take(mask,index-low[axis],axis=axis).T[::-1]
        lab=np.take(projected,index-low[axis],axis=axis).T[::-1]
        rgb=np.repeat(p[:,:,None],3,axis=2);overlay=rgb.copy()
        overlay[m]=np.rint(.6*rgb[m]+.4*np.array([0,170,255])).astype(np.uint8)
        overlay[_outline(lab==24)]=[255,60,90]
        h,w=p.shape;scale=5
        image=Image.new('RGB',(max(630,2*w*scale+12),h*scale+55),'#181818')
        title='finite APP candidate projection' if args.finite_candidates else 'threshold-connected exploration'
        ImageDraw.Draw(image).text((4,3),f'Registered300 {"XYZ"[axis]}{index}: raw / BLUE {title}\nRED existing ID24; threshold 65000 exploration is NOT anatomical approval\nUNADOPTED. Cropped extent; bright tissue/artifact/background possible.',fill='white')
        for col,picture in enumerate([rgb,overlay]):image.paste(Image.fromarray(picture).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),55))
        path=out/f'{"xyz"[axis]}-{index}.png';image.save(path)
        figures.append(dict(path=path.name,axis='xyz'[axis],index=index,sha256=digest(path.read_bytes())))
    contacts=[]
    if args.outer_after19:
        for offset in range(0,len(figures),4):
            group=figures[offset:offset+4];panels=[Image.open(out/f['path']).convert('RGB') for f in group]
            w=max(p.width for p in panels);h=max(p.height for p in panels)
            sheet=Image.new('RGB',(w*2,h*2),'#181818')
            for n,panel in enumerate(panels):sheet.paste(panel,((n%2)*w,(n//2)*h))
            path=out/f'contact-{offset//4:02}.png';sheet.save(path)
            contacts.append(dict(path=path.name,sha256=digest(path.read_bytes()),sourcePanels=[f['path'] for f in group],resampled=False))
    report=dict(labelSha256=label_sha,sourceSha256=IMAGE_SHA,seedNativeXYZ=seed.tolist(),
                cropNativeXYZ=dict(low=low.tolist(),highExclusive=high.tolist()),trials=trials,
                explorationCropNativeXYZ=exploration_crop,displayOnlyExpansion=args.wide_context,
                projectedLabelsWithin65000={str(i):int(n) for i,n in zip(ids,counts)},
                figures=figures,finiteCandidateEvidence=finite_info,mutation=False,adopted=False,visualReviewPending=True,
                limitation='Threshold-connected raw region is an exploration locator, not an anatomical boundary or adoptable patch. Crop contacts cannot distinguish continued cavity from leakage. Selected views do not cover every affected plane.')
    if args.outer_after19:report.update(contacts=contacts,seedRawValue=int(raw[tuple(seed)]))
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(figureCount=len(figures),finiteCandidateEvidence=finite_info,**{k:report[k] for k in ['trials','projectedLabelsWithin65000']})))


if __name__=='__main__':main()
