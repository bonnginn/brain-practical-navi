"""Stage the image-reviewed anterior subset without changing development assets."""
import json
from stage_lateral_crop34 import ROOT, digest, save_ventricular_region


def main():
    relative='work/anatomy-review/fourth-remaining-anterior173-candidate-v1.json'
    data=(ROOT/relative).read_bytes()
    if digest(data)!='d4db863bb6d509ed2b5855c3918e09459cee17089c67bf2e84c0ea40b30ce5b5':
        raise ValueError('Candidate changed')
    candidate=json.loads(data); points=candidate['points']
    if len(points)!=173 or candidate['adopted'] or candidate['expertReviewed']:
        raise ValueError('Candidate status/count changed')
    parent_relative='work/anatomy-review/fourth-ventricle-remaining-wall31fa-candidate-v1/candidate.json'
    parent_bytes=(ROOT/parent_relative).read_bytes()
    if digest(parent_bytes)!=candidate['parentCandidateSha256']:
        raise ValueError('Parent changed')
    parent=json.loads(parent_bytes)
    supported={tuple(r['xyz']) for r in parent['records'] if r['selected'] and r['supportCornerMinimum']>=65000}
    if not set(map(tuple,points)).issubset(supported):raise ValueError('Unsupported point')
    evidence=[dict(path=relative,sha256=digest(data)),dict(path=parent_relative,sha256=digest(parent_bytes))]
    reviews=[('fourth-remaining-anterior173-native300-v1','300a9d68d82f71a918a54563784117c4a121e95344917ec7440edfe88ea68e53',9),
             ('fourth-remaining-wall509-series-y-v1','d86b90d638332563d407443cc3c932febd6dfbf9b812475922f664bf3338c7c6',19)]
    for folder,sha,count in reviews:
        path=ROOT/f'work/anatomy-review/{folder}/report.json'; payload=path.read_bytes(); report=json.loads(payload)
        if digest(payload)!=sha or report['labelsSha256']!=candidate['sourceSha256'] or len(report['figures'])!=count:
            raise ValueError('Review changed')
        if not set(map(tuple,points)).issubset(set(map(tuple,report['points']))):raise ValueError('Review does not cover subset')
        for figure in report['figures']:
            if digest((path.parent/figure['path']).read_bytes())!=figure['sha256']:raise ValueError('Image changed')
        evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=sha,visuallyInspectedFigures=report['figures']))
    save_ventricular_region(points,candidate['sourceSha256'],evidence,'fourth-remaining-anterior173',
        'All 57 parent-candidate coronal planes and all nine subset representative XYZ triplets were visually reviewed. These 173 candidate cells follow the brainstem-facing cavity margin without extending the cerebellar-facing open edge. The geometric anterior-envelope rule groups candidates; source-image correspondence supports this local repair.',
        'AI image review, not expert review or complete fourth-ventricle segmentation. Original300 finite sampling and representative X/Z views do not establish microscopic boundaries. The other 336 candidates and further-than-one-layer omissions remain unadopted. Mesh synchronization and product adoption pending.',label_id=26)


if __name__=='__main__':main()
