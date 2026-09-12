"""Read-only component locators selected after the full midline XYZ review."""
import argparse
import json
import numpy as np
from scipy import ndimage
from review_lateral_midline_candidates import LABEL_SHA, LOCATOR, LOCATOR_SHA, candidate_points
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_lateral_detached547 import digest


def selected_points(points):
    # Connected groups identify the reviewed locations, not anatomical acceptance.
    low=points.min(0)-1; high=points.max(0)+2
    mask=np.zeros(high-low,bool);mask[tuple((points-low).T)]=True
    cc,_=ndimage.label(mask,np.ones((3,3,3)))
    result=[]
    for seed,count in [([199,268,173],44),([190,262,173],31)]:
        ident=cc[tuple(np.array(seed)-low)]
        group=np.argwhere(cc==ident)+low if ident else np.empty((0,3),int)
        if len(group)!=count:raise ValueError('Review locator component changed')
        result.extend(group.tolist())
    result=np.array(result)
    if len(np.unique(result,axis=0))!=75:raise ValueError('Duplicate groups')
    return result


def main(native100=False):
    payload=(ROOT/LOCATOR).read_bytes()
    if digest(payload)!=LOCATOR_SHA:raise ValueError('Locator hash changed')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    points=selected_points(candidate_points(json.loads(payload),labels))
    refs=[points[np.argmin(np.sum((points-p)**2,axis=1))] for p in
          [(192,266,170),(204,266,170),(202,268,172)]]
    if native100:
        from render_native100_candidate_context import render_context
        render_context(labels,points,refs,label_sha=LABEL_SHA,locator_path=LOCATOR,
                       locator_sha=LOCATOR_SHA,prefix='lateral-superomedial75-native100-v1')
    else:
        from review_lateral_detached547 import main as render
        render(component_count=75,candidate_points=points,labels_sha=LABEL_SHA,
               prefix='lateral-superomedial75',label_id=24,context_margin=12,
               reference_points=refs,selection_title='UNADOPTED 75 superomedial rim candidates')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--native100',action='store_true')
    main(parser.parse_args().native100)
