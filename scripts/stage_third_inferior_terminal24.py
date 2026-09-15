"""Stage only two image-reviewed external ID25 tips; never truncate by Z alone."""
import itertools
import json
import numpy as np
from stage_lateral_crop34 import ROOT, digest, stage_reviewed_exclusions
from review_third_inferior_terminal import SHA

PREFIX='third-inferior-terminal24'
REVIEWS={
    'x':'c2b05f0c060ef72b6a9abdc52d12f03be95cc7ceb548f3305fdfca5bc9ab457c',
    'y':'042b1d44511d3103d55e18f73f6073410eab260b956e3fd7355b6a58660d0622',
    'z':'ec05f97dd0b5261dd6740d5a33a78c18bb2fe28cd7a9e11e272bb8a8739320fc',
}


def reviewed_coordinates():
    # Explicit footprints selected after XYZ original-image review. The 16
    # neighbouring cells X195–196/Y265–268/Z107–108 are deliberately retained.
    tip=list(itertools.product((195,196),(267,268),range(103,107)))
    fragment=list(itertools.product((197,198),(259,260),(107,108)))
    return sorted([list(p) for p in tip+fragment])


def replay(labels, reverse=False):
    points=np.asarray(reviewed_coordinates())
    if labels.ndim!=3 or np.any(points>=labels.shape):raise ValueError('Unexpected bounds')
    old,new=(0,25) if reverse else (25,0)
    if np.any(labels[tuple(points.T)]!=old):raise ValueError('Source conflict')
    out=labels.copy();out[tuple(points.T)]=new
    return out


def main():
    points=reviewed_coordinates();evidence=[]
    for axis,sha in REVIEWS.items():
        path=ROOT/f'work/anatomy-review/third-inferior-terminal-extent-2026-09-08-series-{axis}-v1/report.json'
        data=path.read_bytes();report=json.loads(data)
        if (digest(data)!=sha or report['labelsSha256']!=SHA or report['existingLabelId']!=25
                or len(report['points'])!=143 or report['seriesAxis']!=axis
                or not set(map(tuple,points)).issubset(set(map(tuple,report['points'])))):
            raise ValueError('Reviewed region changed')
        evidence.append(dict(report=path.relative_to(ROOT).as_posix(),sha256=sha,reviewedFigures=report['figures']))
    candidate=dict(sourceSha256=SHA,count=24,points=[dict(xyz=p,before=25,after=0) for p in points],
        evidence=evidence,adopted=False,expertReviewed=False,published=False,
        rationale='Reviewed all 23 regional original300 XYZ sheets: X316–336, Y430–459, Z170–187 (69 unique source planes). Exclude two explicit footprints that extend into visible external space below the retained tissue: a 16-cell terminal tip and an 8-cell posterior fragment. Connectivity alone is not anatomical evidence. Keep the neighbouring 16 cells at X195–196/Y265–268/Z107–108 and all higher tissue-bracketed cavity labels; no global Z cut or component deletion.',
        limitations='AI registered300 source-image review, not expert review. Missing or damaged floor tissue cannot establish premortem infundibular-recess anatomy. This conservative visible-specimen exclusion does not reconstruct the third-ventricle floor. Native100 confirmation, mesh synchronization and product adoption pending.')
    out=ROOT/f'work/anatomy-review/{PREFIX}-candidate-v1.json'
    data=(json.dumps(candidate,indent=2)+'\n').encode()
    with out.open('xb') as stream:stream.write(data)
    stage_reviewed_exclusions(out.relative_to(ROOT).as_posix(),digest(data),PREFIX)


if __name__=='__main__':main()
