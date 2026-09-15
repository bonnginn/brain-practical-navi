"""Stage 416 explicitly reviewed partial anterior-commissure-core cells; never install."""
import argparse, gzip, hashlib, io, json, sys
from pathlib import Path
import numpy as np
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from build_orthogonal_review_bundle import DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
BASE_SHA='4e9b48aa687e21f38d140dd4745319875112130c84301434e68ce4713ba27b5f'
DECISION_SHA='fece73c2d314aa999804db75c50b0b51f56cf944ef56604931a8337c509dcd36'
DEFAULT_DECISION=ROOT/'work/nonventricular-20260915/white-band/ac-candidates-v2/primary-decision416.json'
PREFIX='anterior-commissure-core416'
def digest(data):return hashlib.sha256(data).hexdigest()
def gzip_fixed(data):
 out=io.BytesIO()
 with gzip.GzipFile(fileobj=out,mode='wb',filename='',mtime=0) as stream:stream.write(data)
 return out.getvalue()
def replay(labels,points,reverse=False):
 out=labels.copy();seen=[]
 for point in points:
  xyz=point.get('xyz')
  if not isinstance(xyz,list) or len(xyz)!=3 or any(type(v) is not int for v in xyz) or any(v<0 or v>=labels.shape[i] for i,v in enumerate(xyz)):raise ValueError('Invalid point coordinate')
  if point.get('before')!=0 or point.get('after')!=42:raise ValueError('Only explicit 0->42 transitions are allowed')
  seen.append(tuple(xyz))
 if len(set(seen))!=len(seen):raise ValueError('Duplicate point coordinate')
 for point in points:
  xyz=tuple(point['xyz']);source,target=(42,0) if reverse else (0,42)
  if int(out[xyz])!=source:raise ValueError(f'label conflict at {xyz}: {int(out[xyz])} != {source}')
  out[xyz]=target
 return out
def main(decision_path):
 decision_bytes=decision_path.read_bytes()
 if digest(decision_bytes)!=DECISION_SHA:raise ValueError('Decision SHA mismatch')
 decision=json.loads(decision_bytes)
 if decision.get('approved') is not True or decision.get('expertReviewed') is not False or decision.get('sourceLabelsSha256')!=BASE_SHA or decision.get('targetId')!=42:raise ValueError('Decision metadata differs')
 candidates={}
 sources=[]
 for source in decision.get('candidateSources',[]):
  path=ROOT/source['path'];data=path.read_bytes()
  if digest(data)!=source['sha256']:raise ValueError('Candidate source SHA mismatch')
  payload=json.loads(data)
  rows=payload.get('records',payload.get('points',[]))
  for row in rows:
   xyz=tuple(row['xyz'] if isinstance(row,dict) else row);candidates[xyz]=row
  sources.append({**source,'count':len(rows)})
 points=decision.get('points')
 if not isinstance(points,list) or len(points)!=416 or len({tuple(p['xyz']) for p in points})!=416:raise ValueError('Exactly 416 unique explicit points required')
 if any(tuple(p['xyz']) not in candidates for p in points):raise ValueError('Decision point absent from fixed candidate source')
 _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,BASE_SHA);after=replay(before,points)
 if np.count_nonzero(before!=after)!=416 or not np.array_equal(replay(after,points,True),before):raise ValueError('Exact reversible difference failed')
 components,count=ndimage.label(after==42,ndimage.generate_binary_structure(3,1));sizes=sorted(np.bincount(components.ravel())[1:].tolist(),reverse=True)
 if count!=6 or sizes!=[317,88,8,1,1,1]:raise ValueError('Reviewed component geometry differs')
 evidence=[]
 for item in decision.get('evidence',[]):
  path=ROOT/item['path'];data=path.read_bytes()
  if digest(data)!=item['sha256']:raise ValueError('Evidence SHA mismatch: '+str(path))
  for figure in item.get('visuallyInspectedFigures',[]):
   f=path.parent/figure['path']
   if digest(f.read_bytes())!=figure['sha256']:raise ValueError('Evidence figure SHA mismatch: '+str(f))
  evidence.append(item)
 raw=gzip.decompress(DEFAULT_LABELS.read_bytes());stored=gzip_fixed(raw[:10]+after.tobytes(order='F'))
 out=ROOT/f'work/anatomy-review/{PREFIX}-stage-v1'
 if out.exists():raise ValueError('Preserve existing stage evidence')
 record={'beforeSha256':BASE_SHA,'afterSha256':digest(stored),'afterRawVoxelSha256':digest(after.tobytes(order='F')),'points':points,'count':416,'transition':'0->42','targetId':42,
  'candidateSources':sources,'decision':{'path':decision_path.relative_to(ROOT).as_posix(),'sha256':DECISION_SHA},'evidence':evidence,'countsBefore':{'0':int((before==0).sum()),'42':int((before==42).sum())},'countsAfter':{'0':int((after==0).sum()),'42':int((after==42).sum())},'components6':count,'componentSizes':sizes,
  'partial':True,'status':'explicit-review-decision-work-stage-only','adopted':False,'expertReviewed':False,'installed':False,'reviewNote':decision['reviewNote'],'limitation':decision['limitation']+' Work stage only; no assets installed.'}
 out.mkdir(parents=True);(out/'before.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes());(out/'labels.bin.gz').write_bytes(stored);rp=out/'repair.json';rp.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'recordSha256':digest(rp.read_bytes()),'afterSha256':record['afterSha256'],'afterRawVoxelSha256':record['afterRawVoxelSha256'],'count':416,'components6':count}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--decision',type=Path,default=DEFAULT_DECISION);a=p.parse_args();main(a.decision.resolve())
