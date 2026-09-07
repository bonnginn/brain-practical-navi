"""Lossless contact sheets of the remaining union review panels, no resampling."""
import json
import argparse
from PIL import Image
from build_orthogonal_review_bundle import ROOT
from stage_third_ventricle_core_repair import digest

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--medium-components',action='store_true')
    parser.add_argument('--inferior-horn',action='store_true')
    parser.add_argument('--residual-51',action='store_true')
    parser.add_argument('--residual-27',action='store_true')
    parser.add_argument('--partial19',action='store_true')
    args=parser.parse_args()
    if sum([args.medium_components,args.inferior_horn,args.residual_51,args.residual_27,args.partial19])>1:raise ValueError('Choose one evidence set')
    source=ROOT/('work/anatomy-review/lateral-fringe-medium-union-v1' if args.medium_components else 'work/anatomy-review/lateral-fringe-remaining-large-union-v1')
    out=source.parent/('lateral-fringe-medium-union-contacts-v1' if args.medium_components else 'lateral-fringe-remaining-large-union-contacts-v1')
    if args.inferior_horn:
        if args.medium_components:raise ValueError('Choose one evidence set')
        source=ROOT/'work/anatomy-review/inferior-horn-cavity-finite-difference-v1'
        out=source.parent/'inferior-horn-cavity-finite-contacts-v1'
    if args.residual_51:
        source=ROOT/'work/anatomy-review/inferior-horn-residual-51-finite-v1'
        out=source.parent/'inferior-horn-residual-51-finite-contacts-v1'
    if args.residual_27:
        source=ROOT/'work/anatomy-review/inferior-horn-residual-27-finite-v1'
        out=source.parent/'inferior-horn-residual-27-finite-contacts-v1'
    if args.partial19:
        source=ROOT/'work/anatomy-review/inferior-horn-residual-107-partial19-union-v1'
        out=source.parent/'inferior-horn-residual-107-partial19-contacts-v1'
    if out.exists():raise ValueError('Preserve evidence')
    raw=(source/'report.json').read_bytes();report=json.loads(raw)
    if args.partial19 and digest(raw)!='d9bfd57194e8b94d70240a6374490bd1f2be973b78272edccecb5abf02e77af1':raise ValueError('Partial19 union changed')
    if args.residual_27 and digest(raw)!='c90dfe8aa4fd17dfae7bfb2cfad7f6c4966d15f657cffc91462fe5b8fb4a625f':raise ValueError('Residual 27 finite report changed')
    if args.residual_51 and digest(raw)!='b1e8c8079036e2e7961dd2f7a2db689c2beab0cdbee4fba85ed055ffd1401df8':raise ValueError('Residual finite report changed')
    if args.inferior_horn and digest(raw)!='be00a4dacacf62f98c61765d253b5dc2de269a16f935a65ef772c1af18992278':raise ValueError('Finite difference report changed')
    if args.medium_components and digest(raw)!='b1596dd128c195cc151cd73a733c154e10a89b88f853d53e4f5e986b92002323':raise ValueError('Union report changed')
    figures=report['figures'] if args.medium_components or args.inferior_horn or args.residual_51 or args.residual_27 or args.partial19 else [f for f in report['figures'] if f['axis']!='x']
    if len(figures)!=(65 if args.partial19 else 46 if args.residual_27 else 72 if args.residual_51 else 164 if args.inferior_horn else 357 if args.medium_components else 120):raise ValueError('Unexpected panel count')
    out.mkdir();sheets=[]
    for offset in range(0,len(figures),6):
        group=figures[offset:offset+6];images=[]
        for f in group:
            p=source/f['path']
            if digest(p.read_bytes())!=f['sha256']:raise ValueError('Image changed')
            images.append(Image.open(p).convert('RGB'))
        width=max(i.width for i in images);height=max(i.height for i in images)
        sheet=Image.new('RGB',(width*2,height*3),'#181818')
        for n,i in enumerate(images):sheet.paste(i,((n%2)*width,(n//2)*height))
        path=out/f'contact-{offset//6:02}.png';sheet.save(path)
        sheets.append(dict(path=path.name,sha256=digest(path.read_bytes()),sourcePanels=[f['path'] for f in group]))
    (out/'report.json').write_text(json.dumps(dict(sourceReportSha256=digest(raw),sheets=sheets,resampled=False,visualReviewPending=True),indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(sheets=len(sheets),panels=len(figures))))

if __name__=='__main__':main()
