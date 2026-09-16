"""Stage the image-reviewed aqueduct/fourth-ventricle junction; no product writes."""
import gzip, hashlib, io, json
from pathlib import Path
import numpy as np
from scipy import ndimage
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

ROOT=Path(__file__).resolve().parents[1]
BASE_SHA='065ebcef8e76dcbaab292750815d5135d92b1da1123a92b802d2efff2e41a912'
PREFIX='aqueduct-fourth44'
HERE=ROOT/'work/ventricle-connection-20260916'
EXCLUDED={(194,201,105),(195,201,102),(195,203,112)}

def digest(data):return hashlib.sha256(data).hexdigest()
def encode(data):
 out=io.BytesIO()
 with gzip.GzipFile(fileobj=out,mode='wb',filename='',mtime=0) as f:f.write(data)
 return out.getvalue()

def replay(labels,points,reverse=False):
 if len(points)!=44:raise ValueError('Expected reviewed 44-cell set')
 xyz=np.asarray([p['xyz'] for p in points])
 if xyz.shape!=(44,3) or xyz.dtype.kind not in 'iu' or len(np.unique(xyz,axis=0))!=44 or np.any(xyz<0) or np.any(xyz>=labels.shape):raise ValueError('Invalid coordinates')
 out=labels.copy()
 for p in points:
  if p['before'] not in (0,27) or p['after'] not in (26,41):raise ValueError('Invalid transition')
  old,new=(p['after'],p['before']) if reverse else (p['before'],p['after'])
  t=tuple(p['xyz'])
  if int(out[t])!=old:raise ValueError('Label conflict')
  out[t]=new
 return out

def main():
 source=HERE/'candidate47-review-v1/report.json';review=json.loads(source.read_bytes())
 if review['sourceLabelsSha256']!=BASE_SHA:raise ValueError('Review baseline differs')
 selected=[p for p in review['points'] if tuple(p) not in EXCLUDED]
 if len(selected)!=44:raise ValueError('Candidate subset differs')
 _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,BASE_SHA)
 # Keep the pre-existing partial aqueduct's caudal extent as the operational
 # inter-label boundary. This is not a newly inferred anatomical plane.
 entries=[dict(xyz=p,before=int(before[tuple(p)]),after=41 if p[2]>=114 else 26) for p in selected]
 after=replay(before,entries)
 assert np.count_nonzero(before!=after)==44 and np.array_equal(replay(after,entries,True),before)
 evidence=[]
 for rel in ['candidate47-review-v1/report.json','candidate-cell-fractions.json','bend-cells-v1/report.json','native-continuous-v1/report.json','native-to-aqueduct-v2/report.json']:
  p=HERE/rel;evidence.append(dict(path=p.relative_to(ROOT).as_posix(),sha256=digest(p.read_bytes())))
 for f in review['figures']:
  p=source.parent/f['file']
  if digest(p.read_bytes())!=f['sha256']:raise ValueError('Reviewed figure changed')
 evidence[0]['visuallyInspectedFigures']=[dict(path=f['file'],sha256=f['sha256']) for f in review['figures']]
 connectivity={}
 for name,lab in [('before',before),('after',after)]:
  c,_=ndimage.label(np.isin(lab,[25,26,41]),ndimage.generate_binary_structure(3,1))
  groups={str(k):int(np.argmax(np.bincount(c[lab==k]))) for k in [25,26,41]}
  connectivity[name]=dict(mainComponentIds=groups,allThreeConnected=len(set(groups.values()))==1)
 if connectivity['before']['allThreeConnected'] or not connectivity['after']['allThreeConnected']:raise ValueError('Unexpected measured connectivity')
 base=DEFAULT_LABELS.read_bytes();raw=gzip.decompress(base);stored=encode(raw[:10]+after.tobytes(order='F'))
 record=dict(beforeSha256=BASE_SHA,afterSha256=digest(stored),afterRawVoxelSha256=digest(after.tobytes(order='F')),points=entries,count=44,transition='mixed-aqueduct-fourth-repair',evidence=evidence,
  countsBefore={str(k):int((before==k).sum()) for k in [0,26,27,41]},countsAfter={str(k):int((after==k).sum()) for k in [0,26,27,41]},connectivity=connectivity,
  excludedPoints=[list(p) for p in sorted(EXCLUDED)],adopted=False,expertReviewed=False,installed=False,status='AI-image-reviewed-work-stage-only',
  rationale='Native100 axial Z390-448, sagittal X723-737 at step2, coronal Y585-635 at step5 reviewed as raw/current/candidate pairs (78 planes). The narrow lumen continues between brainstem and roof into the existing fourth ventricle. Three wall-dominated candidate cells excluded; the bend cell [195,201,105] included after independent raw-image and subvoxel review. Intensity fractions and six-neighbour connectivity are secondary checks, not anatomical attribution. Existing partial aqueduct extent Z114 retained as an operational naming boundary; additions at/above this extent use ID41, caudal additions ID26.',
  limitation='AI project review, not expert review. Completes the sampled main-cavity connection, not all ventricular walls, foramina or exits. Inter-label aqueduct/fourth naming boundary remains approximate. Existing two detached fourth-ventricle cells retained pending separate tissue review. Mesh synchronization and product adoption pending.')
 out=ROOT/f'work/anatomy-review/{PREFIX}-stage-v1';out.mkdir(exist_ok=False)
 (out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(stored);(out/'repair.json').write_text(json.dumps(record,indent=2)+'\n')
 print(json.dumps(dict(recordSha256=digest((out/'repair.json').read_bytes()),afterSha256=record['afterSha256'],countsAfter=record['countsAfter'],connectivity=connectivity)))

if __name__=='__main__':main()
