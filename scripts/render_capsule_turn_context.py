"""Wide registered300 axial context for capsule turns; no inferred subdivisions."""
import json
import hashlib
import argparse
import numpy as np
from PIL import Image,ImageDraw
from audit_manual_label_space import SOURCE,load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME,IMAGE_SHA,encode_image
from build_registered_manual_candidate import nearest_labels
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume,_outline

LABEL_SHA='e98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3'
def sha(data):return hashlib.sha256(data).hexdigest()

def oriented_plane(data, axis, index):
    if axis not in ('x','y','z'):
        raise ValueError('Unknown plane axis')
    return np.take(data,index,axis='xyz'.index(axis)).T[::-1]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--orthogonal',action='store_true')
    args=parser.parse_args()
    out=ROOT/('work/anatomy-review/capsule-turn-orthogonal300-v1' if args.orthogonal else 'work/anatomy-review/capsule-turn-context300-v1')
    if out.exists():raise ValueError('Preserve evidence')
    raw,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    geometry_path=ROOT/'public/atlas/bigbrain-icbm500-validation.json'
    geometry=json.loads(geometry_path.read_text(encoding='utf-8'));affine=np.array(geometry['affine'])
    app_low=np.array([135,215,148]);app_high=np.array([260,320,161])
    if args.orthogonal:
        app_low[2]=130;app_high[2]=190
    low=np.floor((app_low@affine[:3,:3].T+affine[:3,3]-start)/step).astype(int)
    high=np.ceil((app_high@affine[:3,:3].T+affine[:3,3]-start)/step).astype(int)+1
    if np.any(low<0) or np.any(high>raw.shape):raise ValueError('Crop outside source')
    shape=high-low;coords=np.indices(shape).reshape(3,-1).T+low
    projected=nearest_labels(labels,coords*step+start,affine[:3,3],np.diag(affine)[:3]).reshape(tuple(shape))
    data=raw[tuple(slice(a,b) for a,b in zip(low,high))];gray=encode_image(data,geometry['intensityWindow'])
    centers=[int(np.rint(((affine@np.array([196,260,z,1]))[2]-start[2])/step[2])) for z in [150,154,158]]
    selections=[('z',center) for center in centers]
    if args.orthogonal:
        selections=[]
        for axis,point in [('x',[175,270,154]),('x',[219,270,154]),('y',[196,270,154])]:
            component='xyz'.index(axis)
            center=int(np.rint(((affine@np.r_[point,1])[component]-start[component])/step[component]))
            selections.append((axis,center))
    figures=[];out.mkdir()
    for axis,center in selections:
        for index in range(center-1,center+2):
            offset=index-low['xyz'.index(axis)]
            a=oriented_plane(gray,axis,offset);lab=oriented_plane(projected,axis,offset)
            rgb=np.repeat(a[:,:,None],3,axis=2)
            for ids,color in [([7,8],[255,90,70]),([9,10],[70,210,255]),([11,12,13,14],[240,200,30]),([15,16],[150,120,255]),([31,32],[60,240,110])]:
                rgb[_outline(np.isin(lab,ids))]=color
            w=a.shape[1]*3;h=a.shape[0]*3
            sheet=Image.new('RGB',(w*2+12,h+50),'#181818');draw=ImageDraw.Draw(sheet)
            draw.text((4,3),f'Registered300 {axis.upper()}{index} | raw LEFT / current500 context RIGHT',fill='white')
            draw.text((4,18),'Caudate coral / putamen cyan / pallidum gold / thalamus violet / capsule green',fill='white')
            draw.text((4,33),'No anterior-limb / genu / posterior-limb boundary assigned.',fill='white')
            sheet.paste(Image.fromarray(a).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,50))
            sheet.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,50))
            path=out/f'{axis}-{index}.png';sheet.save(path)
            figures.append(dict(path=path.name,axis=axis,index=index,sha256=sha(path.read_bytes()),rawEncodedSha256=sha(a.tobytes()),projectedSha256=sha(lab.tobytes())))
    report=dict(sourceSha256=IMAGE_SHA,labelSha256=LABEL_SHA,geometrySha256=sha(geometry_path.read_bytes()),
        lowXYZ=low.tolist(),highExclusiveXYZ=high.tolist(),sourceStart=start.tolist(),sourceStep=step.tolist(),
        scientificAffine=affine.tolist(),intensityWindow=geometry['intensityWindow'],figures=figures,
        adopted=False,mutation=False,visualReviewPending=True)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(planes=len(figures),selections=selections,adopted=False)))

if __name__=='__main__':main()
