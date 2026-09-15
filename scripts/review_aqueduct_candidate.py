"""Render the entire unadopted lumen candidate; no product writes."""
import argparse
import hashlib
import json
import numpy as np
from explore_aqueduct_continuity import ROOT,SHA
from review_lateral_detached547 import main as render


def main(axis):
    path=ROOT/'work/anatomy-review/aqueduct-enclosed-continuity-2026-09-08-majority-v1/candidate.json'
    data=path.read_bytes()
    if hashlib.sha256(data).hexdigest()!='400c889260474100be776389bcb9819e3e442c5381fce40d406283708cc37f44':
        raise ValueError('Candidate changed')
    report=json.loads(data)
    if report['inputSha256']!=SHA or report['candidateCount']!=273 or report['adopted'] or report['labelMutation']:
        raise ValueError('Candidate identity changed')
    points=np.array([p['xyz'] for p in report['points']]);before=np.array([p['before'] for p in report['points']])
    render(axis,component_count=273,labels_sha=SHA,prefix='aqueduct273-2026-09-08',
        candidate_points=points,label_id=41,context_margin=22,candidate_before_labels=before)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--axis',choices=['x','y','z'],required=True)
    main(parser.parse_args().axis)
