"""One reversible batch: reviewed inferior tips and extraventricular remnants."""
import json
import numpy as np
from scipy import ndimage
from stage_lateral_crop34 import ROOT,digest,stage_reviewed_exclusions
from stage_third_inferior_terminal24 import reviewed_coordinates,REVIEWS
from review_third_inferior_terminal import SHA
from build_orthogonal_review_bundle import DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume

PREFIX='third-remnants91'
# Components are locators after image review, not a size-based removal rule.
COMPONENTS=[((177,205,165),8),((183,219,172),10),((193,191,155),5),
            ((197,191,155),6),((206,225,173),8),((207,219,171),16),
            ((209,209,145),6),((213,205,165),8)]
UPPER_REVIEWS=[('', 'd60f7c3372a6d541aadfcf4533f5c9586b44493aa4fd10eee9e8b964ad5e109b',None),
               ('-ends','4ff0aaffc2e9688cba30286ceba381567bb46028fa229d075df7eec110122fc4',None),
               ('-gaps','f8747912d87bb219c5c3aff5199c855bee900c2d451e0a37e8de17308bac0f15',{'point-0-x.png','point-1-x.png','point-2-y.png'})]


def selected_points(labels):
    cc,_=ndimage.label(labels==25,ndimage.generate_binary_structure(3,3))
    parts=[]
    for seed,count in COMPONENTS:
        ident=cc[seed]
        if ident==0:raise ValueError('Missing component')
        points=np.argwhere(cc==ident)
        if len(points)!=count:raise ValueError('Component changed')
        parts.extend(points.tolist())
    if len(set(map(tuple,parts)))!=67:raise ValueError('Overlapping components')
    upper=np.array(sorted(parts))
    all_points=np.array(sorted(parts+reviewed_coordinates()))
    if len(np.unique(all_points,axis=0))!=91:raise ValueError('Overlapping regional changes')
    return all_points,upper


def main():
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,SHA)
    points,upper=selected_points(labels);evidence=[];upper_figures=[]
    for suffix,sha,names in UPPER_REVIEWS:
        path=ROOT/f'work/anatomy-review/third-superior-remnants-2026-09-08{suffix}-native300-v1/report.json'
        data=path.read_bytes();r=json.loads(data)
        if (digest(data)!=sha or r['labelsSha256']!=SHA or r['existingLabelId']!=25
                or len(r['points'])!=221 or not set(map(tuple,upper)).issubset(set(map(tuple,r['points'])))):
            raise ValueError('Upper evidence changed')
        seen=[f for f in r['figures'] if names is None or f['path'] in names]
        if names is not None and {f['path'] for f in seen}!=names:raise ValueError('Missing reviewed images')
        upper_figures.extend(seen)
        evidence.append(dict(report=path.relative_to(ROOT).as_posix(),sha256=sha,reviewedFigures=seen))
    # Ensure no source plane intersecting these finite cells was omitted. This
    # is coverage accounting only; image interpretation remains in the record.
    from audit_manual_label_space import SOURCE,load_identity_minc
    from render_registered_manual_fine_review import IMAGE_NAME,IMAGE_SHA
    _,start,step,_=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    affine=np.array(json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())['affine'])
    coverage={}
    for d,axis in enumerate('xyz'):
        needed={i for p in upper for i in range(int(np.ceil(((p[d]-.5)*affine[d,d]+affine[d,3]-start[d])/step[d])),
                                                   int(np.ceil(((p[d]+.5)*affine[d,d]+affine[d,3]-start[d])/step[d])))}
        seen={i for f in upper_figures if f['axis']==axis for i in f['indices']}
        if needed-seen:raise ValueError('Unreviewed finite-cell source planes')
        coverage[axis]=dict(requiredFiniteCellPlanes=sorted(needed),inspectedPlanes=sorted(seen))
    for axis,sha in REVIEWS.items():
        path=ROOT/f'work/anatomy-review/third-inferior-terminal-extent-2026-09-08-series-{axis}-v1/report.json'
        data=path.read_bytes();r=json.loads(data)
        if digest(data)!=sha or r['labelsSha256']!=SHA:raise ValueError('Inferior evidence changed')
        evidence.append(dict(report=path.relative_to(ROOT).as_posix(),sha256=sha,reviewedFigures=r['figures']))
    candidate=dict(sourceSha256=SHA,count=91,points=[dict(xyz=p,before=25,after=0) for p in points.tolist()],
        evidence=evidence,upperCoverage=coverage,adopted=False,expertReviewed=False,published=False,
        rationale='Regional exclusion batch after registered300 XYZ image review: 24 inferior external-tip cells plus 67 cells in eight posterior/superior remnants outside the identifiable third-ventricle cavity, along posterior or superior thalamic surface spaces and the remote space below the splenial region. The 67-cell finite extents are covered by inspected XYZ source planes, using 54 contextual sheets and 3 gap sheets. Inferior region: all 69 source planes in 23 sheets. Component identity only locates already reviewed fragments; no automatic deletion by size or distance. Retain 154 other non-main-component cells and all 16 ambiguous neighbouring inferior cells.',
        limitations='AI source-image review, not expert review or completed third-ventricle segmentation. Do not infer a precise cisternal label or reconstruct missing third-ventricle roof/floor tissue. Central superior fragments, cavity omissions and inferior partial-volume boundaries remain unresolved. No native100 review for this batch. Mesh synchronization and product adoption pending.')
    out=ROOT/f'work/anatomy-review/{PREFIX}-candidate-v1.json'
    data=(json.dumps(candidate,indent=2)+'\n').encode()
    with out.open('xb') as stream:stream.write(data)
    stage_reviewed_exclusions(out.relative_to(ROOT).as_posix(),digest(data),PREFIX)


if __name__=='__main__':main()
