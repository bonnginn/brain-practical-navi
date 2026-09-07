"""Display the pinned 21 unadopted finite candidates on all registered300 planes."""
import argparse
import hashlib
import json
from review_lateral_detached547 import ROOT, main as render
from explore_lateral_residual116_cavity import SHA


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--axis',choices=list('xyz'),required=True)
    args=parser.parse_args()
    data=(ROOT/'work/anatomy-review/lateral-residual116-cavity-exploration-v1/report.json').read_bytes()
    if hashlib.sha256(data).hexdigest()!='ac225411191fd9f912741ae5e5f10c7647746f63e061883bc2e12a60e3a351b7':
        raise ValueError('Candidate evidence changed')
    report=json.loads(data)
    if report['labelSha256']!=SHA or report['adopted'] or report['mutation']:
        raise ValueError('Candidate identity changed')
    render(args.axis,component_count=21,labels_sha=SHA,prefix='lateral-cavity21',
           representative_y=244,candidate_points=report['candidateAppXYZ'])
