"""Stage 282 explicitly reviewed partial septal-membrane cells; never install."""
import argparse, gzip, hashlib, io, json, sys
from pathlib import Path
import numpy as np
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from build_orthogonal_review_bundle import DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
BASE_SHA='cbbf21552628767d4d19a146229490ce34c661947bbc3948eac6080bae76a4f0'
DECISION_SHA='7b0dd21728b4fbffcfab68c6ffb87a1128daf370a678b0ce5e3073631b82fe2a'
DEFAULT_DECISION=ROOT/'work/nonventricular-20260915/septum-candidates-v1/primary-decision282.json'
PREFIX='septal-membrane282'
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
  if point.get('before')!=0 or point.get('after')!=43:raise ValueError('Only explicit 0->43 transitions are allowed')
  seen.append(tuple(xyz))
 if len(set(seen))!=len(seen):raise ValueError('Duplicate point coordinate')
 for point in points:
  xyz=tuple(point['xyz']);source,target=(43,0) if reverse else (0,43)
  if int(out[xyz])!=source:raise ValueError(f'label conflict at {xyz}: {int(out[xyz])} != {source}')
  out[xyz]=target
 return out
def main(decision_path):
 decision_bytes=decision_path.read_bytes()
 if digest(decision_bytes)!=DECISION_SHA:raise ValueError('Decision SHA mismatch')
 decision=json.loads(decision_bytes)
 if decision.get('approved') is not True or decision.get('expertReviewed') is not False or decision.get('sourceLabelsSha256')!=BASE_SHA or decision.get('targetId')!=43:raise ValueError('Decision metadata differs')
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
 if not isinstance(points,list) or len(points)!=282 or len({tuple(p['xyz']) for p in points})!=282:raise ValueError('Exactly 282 unique explicit points required')
 if any(tuple(p['xyz']) not in candidates for p in points):raise ValueError('Decision point absent from fixed candidate source')
 _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,BASE_SHA);after=replay(before,points)
 if np.count_nonzero(before!=after)!=282 or not np.array_equal(replay(after,points,True),before):raise ValueError('Exact reversible difference failed')
 components,count=ndimage.label(after==43,ndimage.generate_binary_structure(3,1));sizes=sorted(np.bincount(components.ravel())[1:].tolist(),reverse=True)
 if count!=8 or sizes!=[181,71,12,7,5,3,2,1]:raise ValueError('Reviewed component geometry differs')
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
 record={'beforeSha256':BASE_SHA,'afterSha256':digest(stored),'afterRawVoxelSha256':digest(after.tobytes(order='F')),'points':points,'count':282,'transition':'0->43','targetId':43,
  'candidateSources':sources,'decision':{'path':decision_path.relative_to(ROOT).as_posix(),'sha256':DECISION_SHA},'evidence':evidence,'countsBefore':{'0':int((before==0).sum()),'43':int((before==43).sum())},'countsAfter':{'0':int((after==0).sum()),'43':int((after==43).sum())},'components6':count,'componentSizes':sizes,
  'partial':True,'status':'explicit-review-decision-work-stage-only','adopted':False,'expertReviewed':False,'installed':False,'reviewNote':decision['reviewNote'],'limitation':decision['limitation']+' Work stage only; no assets installed.'}
 out.mkdir(parents=True);(out/'before.bin.gz').write_bytes(DEFAULT_LABELS.read_bytes());(out/'labels.bin.gz').write_bytes(stored);rp=out/'repair.json';rp.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'recordSha256':digest(rp.read_bytes()),'afterSha256':record['afterSha256'],'afterRawVoxelSha256':record['afterRawVoxelSha256'],'count':282,'components6':count}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--decision',type=Path,default=DEFAULT_DECISION);a=p.parse_args();main(a.decision.resolve())
