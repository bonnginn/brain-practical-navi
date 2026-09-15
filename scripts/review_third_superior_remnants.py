"""Read-only raw context for remaining ID25 components above the inferior tip."""
import numpy as np
import argparse
from scipy import ndimage
from review_lateral_detached547 import main as render
from review_third_inferior_terminal import SHA
from build_orthogonal_review_bundle import DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    mode=parser.add_mutually_exclusive_group()
    mode.add_argument('--ends',action='store_true')
    mode.add_argument('--coverage-gaps',action='store_true')
    mode.add_argument('--roof-extent',choices=['x','y','z'],
                      help='Read-only continuous review of the retained 152-cell roof region after remnants91')
    args=parser.parse_args()
    if args.roof_extent:
        current_sha='bd0c1c048262876fd5f84d7fd5622c9ddb341b6a18716b14a03e5ad57ff360fb'
        _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,current_sha)
        cc,_=ndimage.label(labels==25,ndimage.generate_binary_structure(3,3))
        # Component seeds are review locators, not an exclusion or cavity rule.
        groups=[]
        for seed,count in [((193,241,172),145),((193,248,172),1),
                           ((196,254,168),1),((197,250,169),1),((197,259,161),4)]:
            ident=cc[seed]
            group=np.argwhere(cc==ident) if ident else np.empty((0,3),int)
            if len(group)!=count:raise ValueError('Retained roof inventory changed')
            groups.append(group)
        points=np.concatenate(groups)
        if len(np.unique(points,axis=0))!=152:raise ValueError('Duplicate component locator')
        render(args.roof_extent,component_count=152,labels_sha=current_sha,
               prefix='third-roof152-2026-09-08',label_id=25,context_margin=20,
               existing_points=points,existing_label_id=25)
        raise SystemExit(0)
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,SHA)
    cc,_=ndimage.label(labels==25,ndimage.generate_binary_structure(3,3))
    main_id=cc[197,259,107]
    points=np.argwhere((cc!=0)&(cc!=main_id))
    if len(points)!=221:raise ValueError('Remaining component inventory changed')
    anchors=[[177,205,165],[183,219,171],[213,205,165],[207,219,171],
             [193,191,155],[209,209,145],[194,252,168],[202,267,148],[206,225,173]]
    if args.ends:
        anchors=[[178,206,166],[184,221,172],[214,206,166],[208,222,172],
                 [194,192,156],[198,192,156],[197,191,155],[210,210,146],[206,226,174]]
    if args.coverage_gaps:
        anchors=[points[(points[:,0]==205)&(points[:,1]>=225)][0].tolist(),
                 points[(points[:,0]==210)&(points[:,1]<=210)][0].tolist(),
                 points[(points[:,0]<=184)&(points[:,1]==220)][0].tolist()]
    refs=[]
    for anchor in anchors:
        distances=np.sum((points-anchor)**2,axis=1)
        if distances.min()>4:raise ValueError('Reference neighbourhood changed')
        refs.append(points[np.argmin(distances)].tolist())
    render(component_count=221,labels_sha=SHA,
           prefix='third-superior-remnants-2026-09-08'+('-ends' if args.ends else '-gaps' if args.coverage_gaps else ''),label_id=25,
           context_margin=8,existing_points=points,existing_label_id=25,
           reference_points=refs)
