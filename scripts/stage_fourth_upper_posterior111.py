"""Stage one image-reviewed upper posterior cavity batch without product mutation."""
import json
import numpy as np
from stage_lateral_crop34 import ROOT, digest, save_ventricular_region

SOURCE_SHA='ad444107086e647dc8f2816e276ffb12e4feb01a36dd7f1a8d731440e0501f31'
LOCATOR='fourth-upper-posterior-fraction80-ad444-v1.json'
LOCATOR_SHA='3714e8abea25256d0f32050f2d0d7687d4205e814df913007390bede5af6c1ad'


def main():
    work=ROOT/'work/anatomy-review'
    data=(work/LOCATOR).read_bytes();r=json.loads(data)
    if digest(data)!=LOCATOR_SHA or r['sourceSha256']!=SOURCE_SHA or r['count']!=111:
        raise ValueError('Locator changed')
    points=np.asarray(r['points'])
    evidence=[dict(path=(work/LOCATOR).relative_to(ROOT).as_posix(),sha256=LOCATOR_SHA,
        scope='Partial-volume locator only; not proof of anatomical identity')]
    for folder,sha,count in [
        ('fourth-upper-posterior111-series-z-v1','d8d1c0e90fec79f9d81aa41d94b0b89313ce56cef61e5fab32cad8b7628a0da0',8),
        ('fourth-upper-posterior111-native300-v1','15d3848a2cbc09ce1b087799dc967a88e4f9c790d825185d1afe6925f203c13d',9),
    ]:
        path=work/folder/'report.json';data=path.read_bytes();review=json.loads(data)
        if (digest(data)!=sha or review['labelsSha256']!=SOURCE_SHA
                or not np.array_equal(review['points'],points) or len(review['figures'])!=count):
            raise ValueError('Image evidence changed')
        for f in review['figures']:
            if digest((path.parent/f['path']).read_bytes())!=f['sha256']:raise ValueError('Figure changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=sha,
            visuallyInspectedFigures=review['figures'],scope='All generated Z contact sheets' if count==8 else 'Three representative XYZ views; not all-point orthogonal review'))
    save_ventricular_region(points,SOURCE_SHA,evidence,'fourth-upper-posterior111',
        'Original registered300 Z140–163 consecutive planes and representative XYZ at [187,181,86], [188,180,89], [192,189,96] were visually inspected. The candidates follow the cavity side of the oblique posterior roof and tapering upper margin, without extending through the visible tissue roof. Partial-volume sampling discovers curved boundary omissions; source morphology and continuity, not brightness alone, support this local repair.',
        'AI image review, not expert review or ground truth. Registered300 resolution and partial volume limit fine roof assessment. No native100 review for this batch. Caudal open space, unseeded columns and remaining ventricular defects are not resolved. Product adoption and mesh synchronization pending.',label_id=26)


if __name__=='__main__':main()
