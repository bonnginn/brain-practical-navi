"""Read-only orthogonal overlays of the exact extended fornix interior draft."""
import hashlib
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT


def main(wide=False, wide_coronal=False, bend_series=False, bend_coordinates=False, combined=False, connection_series=False, connection_details=False, right_connection=False):
    if right_connection:
        wide=True
        combined=True
    if connection_details:
        connection_series=True
        bend_coordinates=True
    if connection_series:
        combined=True
        wide_coronal=True
    if bend_coordinates:bend_series=True
    if bend_series:wide_coronal=True
    if wide_coronal:wide=True
    path=ROOT/'work/anatomy-review/fornix-core-draft-body-extension-v2/report.json'
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    if digest!='c4dc1bc17eaf9be89ae044803f3e38300eb02833294011450785f1150cb5d1ef':
        raise ValueError('Draft evidence changed')
    report=json.loads(path.read_text(encoding='utf-8'))
    points=np.asarray(report['sourcePoints'],dtype=int)
    if points.shape!=(1098,3) or len(set(map(tuple,points)))!=1098:
        raise ValueError('Invalid point set')
    bend_digest=None
    if combined:
        bend_path=ROOT/'work/anatomy-review/fornix-bend-core-draft-v1/report.json'
        bend_digest=hashlib.sha256(bend_path.read_bytes()).hexdigest()
        if bend_digest!='b89f0852a00defefe16e569068820cba876ad00fd178a011031b7adb3f7bee4c':raise ValueError('Bend draft changed')
        bend=np.asarray(json.loads(bend_path.read_text(encoding='utf-8'))['sourcePoints'],dtype=int)
        points=np.concatenate((points,bend))
        if points.shape!=(1228,3) or len(set(map(tuple,points)))!=1228:raise ValueError('Combined points differ')
    out=ROOT/'work/anatomy-review'/('fornix-draft-wide-sagittal-v1' if wide else 'fornix-draft-orthogonal-v1')
    if wide_coronal:out=ROOT/'work/anatomy-review/fornix-draft-wide-coronal-v1'
    if bend_series:out=ROOT/'work/anatomy-review/fornix-bend-series-v1'
    if bend_coordinates:out=ROOT/'work/anatomy-review/fornix-bend-coordinates-v1'
    if combined:out=ROOT/'work/anatomy-review/fornix-combined-orthogonal-v1'
    if connection_series:out=ROOT/'work/anatomy-review/fornix-connection-series-v1'
    if connection_details:out=ROOT/'work/anatomy-review/fornix-connection-details-v1'
    if right_connection:out=ROOT/'work/anatomy-review/fornix-right-connection-sagittal-v1'
    if out.exists():raise ValueError('Preserve existing evidence')
    raw,_,_,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    low=np.array([305,393,275]);high=np.array([350,434,325])
    if wide:low=np.array([305,340,230]);high=np.array([350,475,345])
    if bend_series:low=np.array([305,393,255]);high=np.array([350,440,325])
    if combined:low=np.array([305,393,255]);high=np.array([350,455,325])
    if np.any(points<low) or np.any(points>=high):raise ValueError('Draft outside crop')
    crop=raw[tuple(slice(a,b) for a,b in zip(low,high))]
    mask=np.zeros(crop.shape,dtype=bool);mask[tuple((points-low).T)]=True
    out.mkdir();figures=[]
    for axis in ((1,) if wide_coronal else (0,) if wide else (0,2)):
        sheets=[]
        indices=range(int(points[:,axis].min())-1,int(points[:,axis].max())+2)
        if wide:indices=[318,321,327,330,333]
        if wide_coronal:indices=[392,398,404,422,428,434,440,446]
        if bend_series:indices=range(421,436)
        if bend_coordinates:indices=[422,428,434]
        if combined:indices=[320,321,322,329,330,331] if axis==0 else [284,287,290,293]
        if connection_series:indices=range(416,435)
        if connection_details:indices=range(419,426)
        if right_connection:indices=range(328,336)
        for index in indices:
            gray=encode_image(np.take(crop,index-low[axis],axis=axis),geometry['intensityWindow']).T[::-1,:]
            selected=np.take(mask,index-low[axis],axis=axis).T[::-1,:]
            rgb=np.repeat(gray[:,:,None],3,axis=2);overlay=rgb.copy()
            overlay[selected]=np.rint(.65*overlay[selected]+.35*np.array([255,120,0])).astype(np.uint8)
            h,w=gray.shape;scale=3 if wide else 5
            if bend_series:scale=4
            if right_connection:scale=6
            sheet=Image.new('RGB',(max(650,w*scale*2+12),h*scale+38),'#181818')
            ImageDraw.Draw(sheet).text((4,3),f'Registered300 {"XYZ"[axis]}{index}: raw / orange exact interior draft\nNot adopted. Other axes increase rightwards / upwards.',fill='white')
            for col,picture in enumerate((rgb,overlay)):
                sheet.paste(Image.fromarray(picture).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),38))
            if bend_coordinates:
                # Separate raw panel with ticks at actual integer cell centers.
                scale=8;left=36;top=40
                sheet=Image.new('RGB',(w*scale+left+10,h*scale+top+10),'#181818')
                sheet.paste(Image.fromarray(rgb).resize((w*scale,h*scale),Image.Resampling.NEAREST),(left,top))
                draw=ImageDraw.Draw(sheet)
                draw.text((4,3),f'Registered300 Y{index}; raw only; X right / Z up',fill='white')
                for x in range(305,350,5):
                    px=left+(x-low[0]+.5)*scale
                    draw.text((px-8,22),str(x),fill='white')
                    draw.line((px,top-4,px,top),fill='white')
                for z in range(255,325,5):
                    py=top+(high[2]-1-z+.5)*scale
                    draw.text((3,py-4),str(z),fill='white')
                    draw.line((left-4,py,left,py),fill='white')
            sheets.append((index,sheet))
        group_size=1 if wide else 3
        if connection_series:group_size=3
        if bend_series:group_size=3
        if bend_coordinates:group_size=1
        for offset in range(0,len(sheets),group_size):
            group=sheets[offset:offset+group_size]
            contact=Image.new('RGB',(group[0][1].width,sum(s.height for _,s in group)))
            dy=0
            for _,s in group:contact.paste(s,(0,dy));dy+=s.height
            target=out/f'{"xyz"[axis]}-{offset//group_size}.png';contact.save(target)
            figures.append(dict(path=target.name,axis='xyz'[axis],indices=[i for i,_ in group],sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(dict(draftReportSha256=digest,bendReportSha256=bend_digest,sourceSha256=IMAGE_SHA,figures=figures,mutation=False,adopted=False,visualReviewPending=True),indent=2)+'\n',encoding='utf-8')
    print(json.dumps(figures))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wide',action='store_true')
    parser.add_argument('--wide-coronal',action='store_true')
    parser.add_argument('--bend-series',action='store_true')
    parser.add_argument('--bend-coordinates',action='store_true')
    parser.add_argument('--combined',action='store_true')
    parser.add_argument('--connection-series',action='store_true')
    parser.add_argument('--connection-details',action='store_true')
    parser.add_argument('--right-connection',action='store_true')
    args=parser.parse_args()
    main(args.wide,args.wide_coronal,args.bend_series,args.bend_coordinates,args.combined,args.connection_series,args.connection_details,args.right_connection)
