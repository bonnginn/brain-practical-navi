"""Read-only original300 context for the retained inferior third-ventricle label.

Uses the current published label revision. A connected component is a locator,
not proof that its inferior end is anatomically ventricular. No label writes.
"""
from review_lateral_detached547 import main as render
import argparse
import numpy as np
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

SHA = '3aa4127843d1ca59ee4fa2d542632748ec542958c76329b627b3968b6d53f45e'

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--extent',choices=['x','y','z'])
    args=parser.parse_args()
    if args.extent:
        _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,SHA)
        points=np.argwhere(labels[:,:,:111]==25)
        # This is a regional locator, NOT a proposed flat-Z exclusion rule.
        render(args.extent,component_count=len(points),labels_sha=SHA,
               prefix='third-inferior-terminal-extent-2026-09-08',label_id=25,
               context_margin=12,existing_points=points,existing_label_id=25)
    else:
        render(component_count=11756, seed=(197,259,107), labels_sha=SHA,
               prefix='third-inferior-terminal-2026-09-08', label_id=25,
               context_margin=12,
               reference_points=[[197,259,107],[198,260,107],[196,267,107]],
               selection_title='ID25 main component (location only)')
