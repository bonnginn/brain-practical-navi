"""Stage an explicitly approved subset of the fixed upper-fourth candidates; never install.

The reviewer must first create --decision JSON with approved=true, candidateSha256,
and an explicit points array. Merely running this script cannot treat the 158-point
review subset, or any other inferred subset, as adopted.
"""
import argparse,gzip,hashlib,io,json,struct,sys
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from build_orthogonal_review_bundle import DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
BASE_SHA='d7fc87b5b18e1221c2979aeab9d6fefeefcfd4d353cfc78cab782930f32f8e29'
CANDIDATE=ROOT/'work/ventricle-regional-20260915/upper-fourth-locator.json'
PREFIX='upper-fourth-gap'
def digest(b):return hashlib.sha256(b).hexdigest()
def gzip_fixed(b):
 out=io.BytesIO()
 with gzip.GzipFile(fileobj=out,mode='wb',filename='',mtime=0) as f:f.write(b)
 return out.getvalue()
def replay(labels,points,reverse=False):
 out=labels.copy()
 xyzs=[]
 for p in points:
  xyz=p.get('xyz')
  if (not isinstance(xyz,list) or len(xyz)!=3 or any(type(v) is not int for v in xyz)
      or any(v<0 or v>=labels.shape[axis] for axis,v in enumerate(xyz))):
   raise ValueError('Invalid point coordinate')
  xyzs.append(tuple(xyz))
 if len(set(xyzs))!=len(xyzs):raise ValueError('Duplicate point coordinate')
 for p in points:
  xyz=tuple(p['xyz']);before=p['before'];after=p['after']
  if before not in (0,27) or after!=26:raise ValueError('Only explicit 0/27 -> 26 transitions are allowed')
  source,target=(after,before) if reverse else (before,after)
  if int(out[xyz])!=source:raise ValueError(f'label conflict at {xyz}: {int(out[xyz])} != {source}')
  out[xyz]=target
 return out
def main(decision_path):
 candidate_bytes=CANDIDATE.read_bytes();candidate=json.loads(candidate_bytes);available={tuple(r['xyz']):r for r in candidate['records']}
 decision_bytes=decision_path.read_bytes();decision=json.loads(decision_bytes)
 if decision.get('approved') is not True:raise ValueError('Explicit approved=true decision required')
 if decision.get('candidateSha256')!=digest(candidate_bytes):raise ValueError('Candidate source SHA mismatch')
 selected=decision.get('points')
 if not isinstance(selected,list) or not selected:raise ValueError('Explicit non-empty points list required')
 xyzs=[tuple(p) for p in selected]
 if len(set(xyzs))!=len(xyzs) or any(x not in available for x in xyzs):raise ValueError('Decision points must be a unique subset of the fixed 161 candidates')
 _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,BASE_SHA)
 entries=[{'xyz':list(x),'before':int(before[x]),'after':26} for x in xyzs]
 after=replay(before,entries)
 if np.count_nonzero(before!=after)!=len(entries) or not np.array_equal(replay(after,entries,True),before):raise ValueError('Exact reversible difference failed')
 raw=gzip.decompress(DEFAULT_LABELS.read_bytes());payload=raw[:10]+after.tobytes(order='F');stored=gzip_fixed(payload)
 out=ROOT/f'work/anatomy-review/{PREFIX}-stage-v1'
 if out.exists():raise ValueError('Preserve existing stage evidence')
 evidence=[]
 for item in decision.get('evidence',[]):
  path=ROOT/item['path'];actual=digest(path.read_bytes())
  if actual!=item['sha256']:raise ValueError('Evidence SHA mismatch: '+str(path))
  evidence.append(item)
 record={'beforeSha256':BASE_SHA,'afterSha256':digest(stored),'afterRawVoxelSha256':digest(after.tobytes(order='F')),
  'points':entries,'count':len(entries),'transition':'mixed-to-26','candidateSource':{'path':CANDIDATE.relative_to(ROOT).as_posix(),'sha256':digest(candidate_bytes),'count':len(available)},
  'decision':{'path':decision_path.relative_to(ROOT).as_posix(),'sha256':digest(decision_bytes)},'evidence':evidence,
  'countsBefore':{str(k):int((before==k).sum()) for k in (0,26,27)},'countsAfter':{str(k):int((after==k).sum()) for k in (0,26,27)},
  'status':'explicit-review-decision-work-stage-only','adopted':False,'expertReviewed':False,'installed':False,
  'limitation':'Work stage only. Exact reviewer-selected cells are reversible; this script makes no anatomical boundary inference and does not install assets.'}
 out.mkdir(parents=True);(out/'before.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes());(out/'labels.bin.gz').write_bytes(stored);(out/'repair.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'prefix':PREFIX,'recordSha256':digest((out/'repair.json').read_bytes()),'afterSha256':record['afterSha256'],'count':len(entries)}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--decision',type=Path,required=True);a=p.parse_args();main(a.decision.resolve())
