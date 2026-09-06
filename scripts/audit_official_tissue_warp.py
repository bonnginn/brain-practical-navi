"""Compare published-displacement mapping against the actual app original.

Sparse global measurement and five original-image planes, not label adoption.
Grid interpolation is trilinear (not libminc's cubic); record that limitation.
"""
import hashlib
import json
import argparse
import numpy as np
import nibabel as nib
from scipy.ndimage import map_coordinates
from PIL import Image, ImageDraw
from audit_official_tissue_alignment import SOURCES, CLASS_NAMES
from review_bigbrain_grid_transform import ROOT, XFM_SHA, GRID_SHAS, load_published_grids, inverse_chain, forward_chain
from build_orthogonal_review_bundle import DEFAULT_IMAGE, DEFAULT_LABELS, MAGIC_IMAGE, MAGIC_LABELS, EXPECTED_IMAGE_SHA256, EXPECTED_LABELS_SHA256, read_browser_volume, _oriented_crop, _outline


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cubic',action='store_true',help='Independent Catmull-Rom grid interpolation')
    args=parser.parse_args()
    source = ROOT/'work/official-bigbrain-tissue'
    out = ROOT/('work/anatomy-review/official-tissue-warp-cubic-v2' if args.cubic else 'work/anatomy-review/official-tissue-warp-v1')
    out.mkdir(parents=True, exist_ok=True)
    for name, digest in SOURCES.items():
        if hashlib.sha256((source/name).read_bytes()).hexdigest() != digest:
            raise ValueError('Official tissue source changed')
    _, dims, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, EXPECTED_LABELS_SHA256)
    geometry = json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine = np.array(geometry['affine'])
    classified = nib.load(source/'full_cls_400um_2009b_sym.nii.gz')
    original = nib.load(source/'full8_400um_2009b_sym.nii.gz')
    if classified.shape != original.shape or not np.array_equal(classified.affine, original.affine):
        raise ValueError('Class/image grid mismatch')
    intensity = original.dataobj.get_unscaled().astype(np.float32)*original.dataobj.slope+original.dataobj.inter
    classes = np.asarray(classified.dataobj, dtype=np.uint8)
    inv_source = np.linalg.inv(original.affine)
    method = 'catmull-rom' if args.cubic else 'linear'
    grids = load_published_grids(method)
    print('Loaded checked published grids', flush=True)
    low, high = geometry['intensityWindow']

    def sample(points):
        world = nib.affines.apply_affine(affine, points)
        mapped, valid = inverse_chain(grids, world, return_valid=True)
        if np.any(~valid & (raw[tuple(points.T)] != 255)):
            failures = ~valid & (raw[tuple(points.T)] != 255)
            print(json.dumps(dict(failedTissuePoints=points[failures].tolist(), failedMappedPoints=mapped[failures].tolist())),flush=True)
            raise ValueError('Inverse failed inside observed app tissue; comparison rejected')
        coords = nib.affines.apply_affine(inv_source, mapped).T
        values = map_coordinates(intensity, coords, order=1, mode='constant', cval=65535, prefilter=False)
        tissue = values < 65000
        encoded = np.rint(np.clip((values-low)/(high-low), 0, 1)*250).astype(np.uint8)
        encoded[~tissue] = 255
        cls = map_coordinates(classes, coords, order=0, mode='constant', cval=1, prefilter=False)
        encoded[~valid] = 255; cls[~valid] = 1
        return encoded, cls, mapped, valid

    # Fixed global sample including background, so tissue Dice is not restricted
    # to app-positive voxels. ~330k points rather than 69 million inversions.
    points = np.stack(np.meshgrid(*[np.arange(2,n,6) for n in dims], indexing='ij'), axis=-1).reshape(-1,3)
    encoded, cls, mapped, valid = sample(points)
    observed = raw[tuple(points.T)]
    common = valid&(encoded != 255)&(observed != 255)
    world = nib.affines.apply_affine(affine, points)
    residual = np.max(np.abs(forward_chain(grids,mapped)-world), axis=1)
    report = dict(sourceDigests=SOURCES, transformSha256=XFM_SHA, gridSha256=GRID_SHAS, imageSha256=EXPECTED_IMAGE_SHA256, labelsSha256=EXPECTED_LABELS_SHA256,
        gridInterpolation=method+'; independent implementation, not native MINC', imageInterpolation='trilinear', classInterpolation='nearest', encodingWindow=[low,high],
        sourceShape=list(original.shape), sourceAffine=original.affine.tolist(), sampleCount=len(points), commonTissueSamples=int(common.sum()),
        tissueDice=float(2*common.sum()/((valid&(encoded!=255)).sum()+(valid&(observed!=255)).sum())), intensityCorrelation=float(np.corrcoef(encoded[common],observed[common])[0,1]),
        meanAbsoluteEncodedDifference=float(np.abs(encoded[common].astype(float)-observed[common]).mean()),
        inverseResidualMaxMm=float(residual[valid].max()), unsolvedBackgroundSampleCount=int((~valid).sum()), unsolvedTissueSampleCount=int(np.sum(~valid&(observed!=255))), displacementMmPercentiles=np.percentile(np.linalg.norm(mapped[valid]-world[valid],axis=1),[0,50,95,99,100]).tolist(),
        registrationAccepted=False, labelAdoption=False, publicMutation=False, classNames=CLASS_NAMES, figures=[])
    print(json.dumps({k:report[k] for k in ('tissueDice','intensityCorrelation','meanAbsoluteEncodedDifference','inverseResidualMaxMm')}), flush=True)
    palette = np.array([[0,0,0],[255,255,255],[90,145,230],[245,210,80],[145,110,180],[210,130,220],[80,190,130],[220,80,160],[50,190,215],[235,145,65]],dtype=np.uint8)
    crop = {'min':[0,0,0], 'max':(np.array(dims)-1).tolist()}
    for axis, index in [('x',195),('x',211),('y',262),('z',114),('z',196)]:
        a = 'xyz'.index(axis)
        shape = list(dims); shape[a] = 1
        plane_points = np.indices(shape).reshape(3,-1).T
        plane_points[:,a] = index
        plane_encoded, plane_classes, _, plane_valid = sample(plane_points)
        e3 = np.full(dims,255,dtype=np.uint8); c3 = np.ones(dims,dtype=np.uint8)
        e3[tuple(plane_points.T)] = plane_encoded; c3[tuple(plane_points.T)] = plane_classes
        r = _oriented_crop(raw,axis,index,crop); e = _oriented_crop(e3,axis,index,crop); c = _oriented_crop(c3,axis,index,crop); s = _oriented_crop(labels,axis,index,crop)
        rgb = np.rint(.55*np.repeat(r[:,:,None],3,axis=2)+.45*palette[c]).astype(np.uint8)
        rgb[_outline(s==30)] = [255,30,30]
        h,w = r.shape; sheet = Image.new('RGB',(w*3,h+44),'#151515')
        ImageDraw.Draw(sheet).multiline_text((8,4),f'{axis.upper()}={index}: APP ORIGINAL | OFFICIAL IMAGE after published warp | OFFICIAL CLASSES + ID30 red\nResearch comparison only: {method} displacement interpolation; class3 yellow / cortical gray blue / layerI purple.',fill='white',spacing=3)
        for col,data in enumerate([r,e,rgb]):
            sheet.paste(Image.fromarray(data).convert('RGB'),(col*w,44))
        file = f'{axis}-{index}.png'; sheet.save(out/file)
        report['figures'].append(dict(file=file,axis=axis,index=index,unsolvedBackgroundPointCount=int((~plane_valid).sum()),sha256=hashlib.sha256((out/file).read_bytes()).hexdigest()))
        print(file,flush=True)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')


if __name__ == '__main__':
    main()
