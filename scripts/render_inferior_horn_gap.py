"""Registered 300um raw views at both label endpoints and their midpoint; no bridge."""
import json
import argparse
import numpy as np
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _outline
from build_registered_manual_candidate import nearest_labels
from diagnose_inferior_horn_sampling import SHA
from stage_third_ventricle_core_repair import digest


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--after-partial19-wide',action='store_true',help='Wider current-label context spanning the 80/7/116-cell regions; no bridge')
    parser.add_argument('--wide-series',action='store_true',help='With --after-partial19-wide, render every Y398..418 and lossless contact sheets')
    parser.add_argument('--wide-orthogonal',action='store_true',help='With --after-partial19-wide, render sagittal/horizontal locator planes')
    parser.add_argument('--coronal-series',action='store_true',help='Render every native Y314..325 plane without overwriting the initial views')
    parser.add_argument('--residual-51',action='store_true',help='Inspect the remaining 51-voxel component and its nearest main-label region after adoption')
    parser.add_argument('--residual-27',action='store_true',help='Inspect remaining 27- and 7-voxel regions in current labels')
    parser.add_argument('--residual-27-series',action='store_true',help='With --residual-27, render every native Y388..401 plane around both regions')
    parser.add_argument('--residual-107',action='store_true',help='Locate the remaining 107-cell region gap after the 53-cell adoption; no inferred bridge')
    parser.add_argument('--residual-107-series',action='store_true',help='With --residual-107, render uninterrupted X424..433 sagittal planes')
    parser.add_argument('--residual-series',action='store_true',help='With --residual-51, render uninterrupted Y409..421 including adjacent planes')
    args=parser.parse_args()
    if args.wide_series and not args.after_partial19_wide:parser.error('--wide-series requires --after-partial19-wide')
    if args.wide_orthogonal and (not args.after_partial19_wide or args.wide_series):parser.error('--wide-orthogonal requires --after-partial19-wide and excludes --wide-series')
    if args.after_partial19_wide and any([args.residual_107,args.residual_107_series,args.residual_27,args.residual_27_series,args.residual_51,args.residual_series,args.coronal_series]):parser.error('Select one review mode')
    if args.residual_107_series and not args.residual_107:parser.error('--residual-107-series requires --residual-107')
    if args.residual_107 and (args.residual_27 or args.residual_27_series or args.residual_51 or args.residual_series or args.coronal_series):parser.error('Select one review mode')
    if args.residual_27_series and not args.residual_27:parser.error('--residual-27-series requires --residual-27')
    if args.residual_27 and (args.residual_51 or args.residual_series or args.coronal_series):parser.error('Select one review mode')
    if args.coronal_series and args.residual_51:parser.error('Select one review mode')
    if args.residual_series and not args.residual_51:parser.error('--residual-series requires --residual-51')
    label_sha='5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba' if args.residual_51 else SHA
    if args.residual_27:label_sha='681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88'
    if args.residual_107:label_sha='ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb'
    if args.after_partial19_wide:label_sha='58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7'
    out=ROOT/'work/anatomy-review'/('inferior-horn-residual-51-native-v1' if args.residual_51 else 'inferior-horn-gap-coronal-series-v1' if args.coronal_series else 'inferior-horn-gap-native-v1')
    if args.residual_series:out=ROOT/'work/anatomy-review/inferior-horn-residual-51-coronal-v1'
    if args.residual_27:out=ROOT/'work/anatomy-review/inferior-horn-residual-27-native-v1'
    if args.residual_27_series:out=ROOT/'work/anatomy-review/inferior-horn-residual-27-coronal-v1'
    if args.residual_107:out=ROOT/'work/anatomy-review/inferior-horn-residual-107-gap-native-v1'
    if args.residual_107_series:out=ROOT/'work/anatomy-review/inferior-horn-residual-107-gap-sagittal-v1'
    if args.after_partial19_wide:out=ROOT/'work/anatomy-review/inferior-horn-partial19-wide-context-v1'
    if args.wide_series:out=ROOT/'work/anatomy-review/inferior-horn-partial19-wide-series-v1'
    if args.wide_orthogonal:out=ROOT/'work/anatomy-review/inferior-horn-partial19-wide-orthogonal-v1'
    if out.exists(): raise ValueError('Preserve evidence')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,label_sha)
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine=np.asarray(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
    app_lo=np.array([250,173,117]);app_hi=np.array([280,212,153])
    if args.residual_51:app_lo=np.array([232,230,88]);app_hi=np.array([273,264,129])
    if args.residual_27:app_lo=np.array([224,221,101]);app_hi=np.array([266,260,136])
    if args.residual_107:app_lo=np.array([240,237,93]);app_hi=np.array([271,262,122])
    if args.after_partial19_wide:app_lo=np.array([222,218,88]);app_hi=np.array([282,269,143])
    low=np.floor((app_lo*spacing+origin-start)/step).astype(int)
    high=np.ceil((app_hi*spacing+origin-start)/step).astype(int)+1
    if np.any(low<0) or np.any(high>raw.shape):raise ValueError('Outside source')
    shape=high-low;grid=np.indices(shape).reshape(3,-1).T+low
    projected=nearest_labels(labels,grid*step+start,origin,spacing).reshape(shape)
    gray=encode_image(raw[tuple(slice(a,b) for a,b in zip(low,high))],geometry['intensityWindow'])
    references=[('upper',[265,188,139]),('midpoint',[265,191.5,135]),('lower',[265,195,131])]
    if args.residual_51:references=[('island interior location',[249,246,110]),('island nearest edge',[249,250,106]),('gap viewing location',[252,251,104]),('main nearest edge',[256,252,101])]
    if args.residual_27:references=[('27-cell region location',[238,234,119]),('7-cell region location',[240,239,120]),('between regions - NOT a seed',[239,237,119])]
    if args.residual_107:references=[('107-cell nearest label edge',[255,249,107]),('main nearest label edge',[259,250,104]),('gap location - NOT a seed',[257,250,105])]
    if args.after_partial19_wide:references=[('80-cell region viewing location',[238,234,119]),('7-cell region viewing location',[240,239,120]),('116-cell region viewing location',[250,246,110]),('main region viewing location',[259,250,104])]
    figures=[];seen=set();out.mkdir()
    planes=[]
    if args.wide_orthogonal:
        planes=[('wide sagittal locator',0,index) for index in [395,410,425,440]]+[( 'wide horizontal locator',2,index) for index in [175,185,195,205]]
    elif args.after_partial19_wide:
        indices=range(398,419) if args.wide_series else [388,393,398,403,408,413,418,423]
        planes=[('uninterrupted wide coronal series' if args.wide_series else 'wide coronal locator, intervening planes NOT reviewed',1,index) for index in indices]
    elif args.residual_107_series:
        planes=[('107-cell gap uninterrupted sagittal series',0,index) for index in range(424,434)]
    elif args.residual_27_series:
        planes=[('27/7 regions uninterrupted coronal series',1,index) for index in range(388,402)]
    elif args.residual_series:
        planes=[('residual uninterrupted coronal series',1,index) for index in range(409,422)]
    elif args.coronal_series:
        planes=[('continuous coronal series',1,index) for index in range(314,326)]
    else:
        for name,point in references:
            native=np.rint((np.asarray(point)*spacing+origin-start)/step).astype(int)
            planes.extend((name,axis,int(native[axis])) for axis in range(3))
    for name,axis,index in planes:
            key=(axis,index)
            if key in seen:continue
            seen.add(key)
            plane=np.take(gray,index-low[axis],axis=axis).T[::-1]
            lab=np.take(projected,index-low[axis],axis=axis).T[::-1]
            rgb=np.repeat(plane[:,:,None],3,axis=2);overlay=rgb.copy();overlay[_outline(lab==24)]=[255,60,90]
            h,w=plane.shape;scale=5;remaining=[d for d in range(3) if d!=axis]
            image=Image.new('RGB',(2*w*scale+12,h*scale+55),'#181818')
            ImageDraw.Draw(image).text((4,3),f'Registered300 {"XYZ"[axis]}{index}: raw / current ID24 outline. {name} reference\nHorizontal: {"XYZ"[remaining[0]]}{low[remaining[0]]}..{high[remaining[0]]-1}; vertical top-bottom: {"XYZ"[remaining[1]]}{high[remaining[1]]-1}..{low[remaining[1]]}\nNo proposed fill; midpoint is a viewing location, not a cavity seed.',fill='white')
            for col,p in enumerate((rgb,overlay)):image.paste(Image.fromarray(p).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),55))
            path=out/f'{"xyz"[axis]}-{index}.png';image.save(path)
            figures.append(dict(path=path.name,axis='xyz'[axis],index=index,reference=name,sha256=digest(path.read_bytes())))
    contacts=[]
    if args.wide_series or args.wide_orthogonal:
        for offset in range(0,len(figures),4):
            group=figures[offset:offset+4]
            panels=[Image.open(out/f['path']).convert('RGB') for f in group]
            w=max(p.width for p in panels);h=max(p.height for p in panels)
            sheet=Image.new('RGB',(w*2,h*2),'#181818')
            for n,panel in enumerate(panels):sheet.paste(panel,((n%2)*w,(n//2)*h))
            path=out/f'contact-{offset//4:02}.png';sheet.save(path)
            contacts.append(dict(path=path.name,sha256=digest(path.read_bytes()),sourcePanels=[f['path'] for f in group],resampled=False))
    report=dict(labelSha256=label_sha,sourceSha256=IMAGE_SHA,cropSourceExclusive=dict(low=low.tolist(),high=high.tolist()),
                references=references,figures=figures,mutation=False,visualReviewPending=True,
                limitation='Selected orthogonal planes locate the gap; they do not cover all intervening slices or establish its boundary. App labels are nearest-neighbor projected, not independent native labels.')
    if args.wide_series:
        report.update(contacts=contacts,limitation='All Y398..418 coronal planes included, but orthogonal boundary tracing is incomplete. No new mask; nearest-neighbor current-label projection only.')
    if args.wide_orthogonal:
        report.update(contacts=contacts,limitation='Selected wide sagittal and horizontal locator planes, not continuous coverage or a new segmentation mask.')
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(figures))


if __name__=='__main__': main()
