"""Import the user's X180 reference stroke, never a voxel patch or approval."""
import hashlib,json
import numpy as np
from PIL import Image,ImageDraw
from build_orthogonal_review_bundle import ROOT

RESPONSE=ROOT/'work/image-review-responses/2026-09-06T09-11-18.521Z-b219c5b5-03f9-46f0-86ee-eb54b1a88fd9'
REFERENCE=ROOT/'work/user-review-midbrain-limit.png'
REFERENCE_SHA='ca29607edadd955da84d559a324b98f8cb8e348b4af7ac81ef051278b560e965'

def to_voxel(point):
    x,y=point
    if not np.isfinite([x,y]).all() or not (454<=x<884 and 58<=y<488):
        raise ValueError('Point outside the pinned right-hand X180 image panel')
    # Pixel centers: a 5x nearest-neighbor block's center is at +2.5 CSS pixels.
    return [180.,185+(x-454)/5-.5,180-((y-58)/5-.5)]

def main():
    path=RESPONSE/'annotation.json';data=json.loads(path.read_text(encoding='utf-8'))
    if data['sourceHash']!=REFERENCE_SHA or hashlib.sha256(REFERENCE.read_bytes()).hexdigest()!=REFERENCE_SHA or [data['width'],data['height']]!=[896,556]:raise ValueError('Reference mismatch')
    for name,key in [('source.png','sourcePngSha256'),('annotated.png','annotatedPngSha256')]:
        if hashlib.sha256((RESPONSE/name).read_bytes()).hexdigest()!=data[key]:raise ValueError('Response image hash mismatch')
    with Image.open(REFERENCE) as a,Image.open(RESPONSE/'source.png') as b:
        if not np.array_equal(np.asarray(a.convert('RGB')),np.asarray(b.convert('RGB'))):raise ValueError('Source image pixels changed')
    if len(data['strokes'])!=1:raise ValueError('Expected one submitted reference stroke')
    points=data['strokes'][0]['points'];voxels=[to_voxel(p) for p in points]
    record=dict(format='user-boundary-reference',version=1,responseId=data['id'],annotationSha256=hashlib.sha256(path.read_bytes()).hexdigest(),sourceReferenceSha256=REFERENCE_SHA,
      annotatedPngSha256=data['annotatedPngSha256'],axis='x',sliceIndex=180,sourceLabelSha256='e7e61a7060c7f1ddfa8106ba659c0488e077495acdd6564862db44663d233ea3',
      meaning='User-provided approximate upper limit for midbrain review on this slice only. User also questions thalamus identification.',
      thalamusApproved=False,expertApproval=False,voxelMutation=False,interpolatedAcrossSlices=False,
      panelOrigin=[454,58],scale=5,coordinateConvention='Continuous voxel-center indices; nearest-neighbor image pixels occupy unit-width cells centered on integer indices.',
      pointsXYZ=voxels)
    out=ROOT/'segmentation-patches/review/user-midbrain-upper-reference-2026-09-06.json'
    with out.open('x',encoding='utf-8') as f:json.dump(record,f,indent=2);f.write('\n')
    # Transfer the same stroke to the unlabelled raw panel, preserving all source pixels.
    figure=Image.open(REFERENCE).convert('RGB');draw=ImageDraw.Draw(figure)
    draw.line([(x-442,y) for x,y in points],fill='#00a344',width=4)
    preview=ROOT/'work/user-midbrain-upper-reference-raw.png'
    if preview.exists():raise ValueError('Preview already exists')
    figure.save(preview)
    print(json.dumps(dict(pointCount=len(points),minXYZ=np.min(voxels,axis=0).tolist(),maxXYZ=np.max(voxels,axis=0).tolist(),record=str(out))))

if __name__=='__main__':main()
