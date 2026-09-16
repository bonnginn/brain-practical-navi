"""Stage the image-reviewed partial fornix body; never infer crura or columns."""
import gzip,json
import numpy as np
from stage_aqueduct_fourth44 import ROOT,encode,digest
from build_orthogonal_review_bundle import DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
BASE_SHA='3d4b134c721aa4d99857b0b9bdb5276f2475ef5277149d6b02dc060412a851ab'
PREFIX='fornix-body987'

def replay(labels,points,reverse=False):
 out=labels.copy();seen=set()
 for p in points:
  xyz=p['xyz']
  if not isinstance(xyz,list) or len(xyz)!=3 or any(type(v) is not int or v<0 or v>=labels.shape[i] for i,v in enumerate(xyz)):raise ValueError('Invalid coordinate')
  key=tuple(xyz)
  if key in seen or p['before']!=0 or p['after']!=46:raise ValueError('Invalid fornix transition')
  seen.add(key);old,new=(46,0) if reverse else (0,46)
  if int(out[key])!=old:raise ValueError('Label conflict')
  out[key]=new
 if len(seen)!=987:raise ValueError('Fornix point count differs')
 return out

def main():
 source=ROOT/'work/fornix-completion-20260916/body-contours-v1'
 candidate=source/'refined987-v2/candidate.json';data=json.loads(candidate.read_text(encoding='utf-8'))
 if data['sourceCandidateSha256']!='a989fbedb5fdd61da1ff96cbe54a7a5e0f0015e25cf5005ca0681a4bb00731e8' or data['measurementSha256']!='2cfa5bd49431d60c7901537df36be77221d2a1ac4f441a946c7bee833af1b88f':raise ValueError('Candidate provenance differs')
 _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,BASE_SHA)
 if np.any(before==46):raise ValueError('ID46 already occupied')
 points=[dict(xyz=list(map(int,p['xyz'].split())),before=0,after=46,side=int(p['side'])) for p in data['rows']]
 if [sum(p['side']==s for p in points) for s in (1,2)]!=[464,523]:raise ValueError('Side counts differ')
 after=replay(before,points)
 if not np.array_equal(replay(after,points,True),before):raise ValueError('Reverse differs')
 reviewed=[]
 for folder in ('review','refined987-v2'):
  for path in sorted((source/folder).glob('*.png')):reviewed.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(path.read_bytes())))
 decision=dict(approved=True,expertReviewed=False,reviewer='primary AI project review; not expert review',sourceLabelSha256=BASE_SHA,
  reviewedFigures=reviewed,sourceCandidateSha256=data['sourceCandidateSha256'],measurementSha256=data['measurementSha256'],candidateSha256=digest(candidate.read_bytes()),
  rationale='Native100 coronal hand contours, continuous Y778-862 (85 planes), orthogonal X630-745 every5 (24) and Z635-700 every5 (14), then 12 refined planes and three endpoint three-axis panels reviewed. Retain 987 cells inside the traced bilateral body interval. Exclude 55 partial-volume uncertainty flags and three isolated superior/marginal endpoint cells; intensity screening does not establish anatomical identity. Correct subvoxel measurement transforms every app-space sample through the full inverse registration.',
  limitation='Partial body only, native Y780-860 (about 8 mm). Superior attachment to septal tissue and anterior/posterior cuts are scope limits, not established anatomical boundaries. Crura, columns, fimbria and complete continuity to hippocampus/mammillary body are not represented. Small internal tissue clefts may remain at 0.5 mm sampling. Not expert-reviewed.')
 decision_path=source/'primary-body987-decision.json';decision_path.write_text(json.dumps(decision,indent=2)+'\n',encoding='utf-8')
 base=DEFAULT_LABELS.read_bytes();stored=encode(gzip.decompress(base)[:10]+after.tobytes(order='F'))
 record=dict(beforeSha256=BASE_SHA,afterSha256=digest(stored),afterRawVoxelSha256=digest(after.tobytes(order='F')),count=987,points=points,transition='mixed-fornix-body-partial',
  decision=dict(path=decision_path.relative_to(ROOT).as_posix(),sha256=digest(decision_path.read_bytes())),
  evidence=[dict(path=p.relative_to(ROOT).as_posix(),sha256=digest(p.read_bytes())) for p in (candidate,source/'sampling-v2/measurements.json',source/'candidate.json')],
  countsBefore={'46':0},countsAfter={'46':987},status='image-reviewed-work-stage-only',adopted=False,installed=False,expertReviewed=False,published=False,partialExtent=True,
  rationale=decision['rationale'],limitation=decision['limitation'])
 out=ROOT/f'work/anatomy-review/{PREFIX}-stage-v1';out.mkdir(exist_ok=False)
 (out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(stored);(out/'repair.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(dict(recordSha256=digest((out/'repair.json').read_bytes()),afterSha256=record['afterSha256'],decisionSha256=record['decision']['sha256'])))

if __name__=='__main__':main()
