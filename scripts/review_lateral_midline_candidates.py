"""Read-only midline candidate review; seed-side identity is not cavity identity."""
import json
import argparse
import numpy as np
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_lateral_detached547 import digest
from review_lateral_detached547 import main as render

LABEL_SHA = '96fb242a78c66cc4ab9fd69e8bd6ed3cef5fca51b67f0338f063da98ae02381b'
LOCATOR = 'work/anatomy-review/lateral-middle-native300-september12-v1/report.json'
LOCATOR_SHA = '60e2845777b438bf11455f156c31078f217825aba7ebbac19354428accd0ea89'


def record_review():
    """Record actual sparse inspection separately from immutable generated reports."""
    output = ROOT/'segmentation-patches/review/lateral-midline672-held-2026-09-12.json'
    if output.exists():
        raise ValueError('Preserve prior assessment')
    evidence=[]
    for kind,expected in [('native300','f10436e4c1418bfeafc6eb9a75248aed669f36141d0c09e08bbf096980197017'),
                          ('native100','9429f097dce1de4850f15931f043f14bc451ef2a6f43f576792cd53a6475ad5d')]:
        path = ROOT/f'work/anatomy-review/lateral-midline672-september12-{kind}-v1/report.json'
        data=path.read_bytes(); report=json.loads(data)
        if digest(data)!=expected or len(report['figures'])!=9:
            raise ValueError('Inspected report differs')
        for figure in report['figures']:
            if digest((path.parent/figure['path']).read_bytes())!=figure['sha256']:
                raise ValueError('Inspected figure differs')
        evidence.append(dict(kind=kind,path=path.relative_to(ROOT).as_posix(),sha256=expected,
                             visuallyInspectedFigures=report['figures']))
    record=dict(currentLabelSha256=LABEL_SHA,locatorPath=LOCATOR,locatorSha256=LOCATOR_SHA,
        candidateCount=672,adoptedCount=0,projectAdopted=False,expertReviewed=False,published=False,
        status='AI-sparse-image-review-held',evidence=evidence,
        referencesAppXYZ=[[199,262,149],[201,264,158],[191,266,170]],
        rationale='The representative registered300 and native100 views show candidates near the lateral '
        'lumen rim as well as near choroidal tissue and the transition to the third ventricle. Some '
        'projected candidate boundaries intersect visible tissue. A seed-side inherited destination '
        'therefore does not establish the anatomical cavity assignment. Do not fill this mixed set as '
        'one bilateral lateral-ventricle batch or reassign it wholesale to the third ventricle.',
        nextStep='Trace the fornix, choroidal tissue and foramen transition as one region before '
        'defining the cavity-partition convention. Separate actual tissue exclusions from pure lumen '
        'cells, then inspect contiguous candidate extent before any adoption.',
        literature=dict(doi='10.3389/fnana.2022.894606',scope='Methods sections on lateral/third ventricles '
        'and transverse cerebral fissure; background protocol comparison, not imported boundary labels.'),
        limitation='18 sparse sheets (54 panels), not full 672-cell or full native-plane validation. '
        'Native100 references share three sagittal planes: 24 unique native100 plus 27 registered300 '
        'planes. Numerical roundtrip consistency is not anatomical registration accuracy. '
        'No current labels, meshes or quiz targets changed by this assessment.')
    payload=(json.dumps(record,indent=2)+'\n').encode('utf-8')
    output.write_bytes(payload)
    print(json.dumps(dict(path=output.relative_to(ROOT).as_posix(),sha256=digest(payload))))


def candidate_points(report, labels):
    if (report['labelSha256'] != '84f91400e7f6b9d059707772b01889f74112d62e853bcebfffddaf589b423ba3'
            or report['count'] != 869 or len(report['points']) != 869):
        raise ValueError('Locator identity changed')
    selected = [p for p in report['points'] if p['xyz'][1] >= 230]
    q = np.asarray([p['xyz'] for p in selected])
    if (q.shape != (672,3) or q.dtype.kind not in 'iu' or len(np.unique(q,axis=0)) != 672
            or labels.shape != (394,466,378) or np.any(q < 0) or np.any(q >= labels.shape)
            or np.any(labels[tuple(q.T)] != 0)):
        raise ValueError('Candidate count, coordinates or current state changed')
    return q


def main(native100=False):
    payload = (ROOT/LOCATOR).read_bytes()
    if digest(payload) != LOCATOR_SHA:
        raise ValueError('Locator digest changed')
    _, _, labels = read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
    points = candidate_points(json.loads(payload), labels)
    refs = [points[np.argmin(np.sum((points-np.array(p))**2,axis=1))] for p in
            [(200,262,147),(200,260,158),(191,266,170)]]
    if native100:
        from render_native100_candidate_context import render_context
        return render_context(labels, points, refs, label_sha=LABEL_SHA,
                              locator_path=LOCATOR, locator_sha=LOCATOR_SHA,
                              prefix='lateral-midline672-september12-native100-v1')
    render(component_count=672, candidate_points=points, labels_sha=LABEL_SHA,
           prefix='lateral-midline672-september12', label_id=24, context_margin=22,
           reference_points=refs, selection_title='UNADOPTED midline candidates; NOT side assignment')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group()
    group.add_argument('--native100', action='store_true')
    group.add_argument('--record-reviewed', action='store_true')
    args=parser.parse_args()
    record_review() if args.record_reviewed else main(args.native100)
