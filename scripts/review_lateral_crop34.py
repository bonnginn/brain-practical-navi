"""Render the 34 crop-expansion candidates, without changing labels."""
import argparse
import hashlib
import json
from review_lateral_detached547 import ROOT, main as render
from compare_lateral_cavity_crop_extent import SHA


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--axis',choices=list('xyz'),required=True)
    args = parser.parse_args()
    data = (ROOT/'work/anatomy-review/lateral-cavity-crop-extent-v1.json').read_bytes()
    if hashlib.sha256(data).hexdigest() != 'fe75335f8d18dbcdd5f5331c4a64dcb930d7f0f5b89d062456c86e1560fb838a':
        raise ValueError('Exploration identity changed')
    report = json.loads(data)
    if report['labelSha256'] != SHA or report['mutation'] or report['adopted']:
        raise ValueError('Unexpected exploration state')
    rows = [r for r in report['results'] if r['margin']==16 and r['threshold']==65000]
    if len(rows)!=1 or len(rows[0]['candidateAppXYZ'])!=34:
        raise ValueError('Candidate identity changed')
    render(args.axis,component_count=34,labels_sha=SHA,prefix='lateral-crop34',
           representative_y=252,candidate_points=rows[0]['candidateAppXYZ'])
