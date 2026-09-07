"""Stage removal of the isolated inferior ID25 fragment outside visible tissue."""
import json
from stage_lateral_crop34 import ROOT,digest,stage_reviewed_exclusions


def main():
    source='6626f8eb6da43ebd6f41e39e247c32338fb06588ee94b407549cd0a30f61aa08'
    evidence=[];points=None
    for folder,sha in [
        ('third-inferior4-current-native300-v1','06fdee8330644fbe7f877f18bc2272fc2e30db662aa03e6c9416a0273e0533fd'),
        ('third-inferior4-current-extent-native300-v1','225bef8f67becab91689d0ec496792bb6f7e5dc0396af80eb24094d506c80c2b'),
    ]:
        path=ROOT/f'work/anatomy-review/{folder}/report.json';data=path.read_bytes();r=json.loads(data)
        if digest(data)!=sha or r['labelsSha256']!=source or len(r['points'])!=4 or len(r['figures'])!=3:
            raise ValueError('Review changed')
        if points is not None and points!=r['points']:raise ValueError('Point set mismatch')
        points=r['points']
        evidence.append(dict(report=path.relative_to(ROOT).as_posix(),sha256=sha,reviewedFigures=r['figures']))
    candidate=dict(sourceSha256=source,count=4,points=[dict(xyz=p,before=25,after=0) for p in points],evidence=evidence,
        adopted=False,expertReviewed=False,published=False,
        rationale='Registered300 XYZ at both ends of the component show four cells inferior to the visible tissue boundary, detached in the external bright space rather than within a tissue-bounded third-ventricle recess. Reviewed unique source planes X321–325/Y431–435/Z178–180. Remove this isolated false positive; do not infer that every disconnected component is erroneous or that all adjacent bright space is ventricular.',
        limitations='AI source-image review, not expert review. Registered300 only; source tissue loss cannot establish premortem anatomy. Neighbouring fragments are not included. Mesh synchronization and product adoption pending.')
    out=ROOT/'work/anatomy-review/third-inferior4-candidate-v1.json'
    data=(json.dumps(candidate,indent=2)+'\n').encode()
    with out.open('xb') as stream:stream.write(data)
    stage_reviewed_exclusions(out.relative_to(ROOT).as_posix(),digest(data),'third-inferior4')


if __name__=='__main__':main()
