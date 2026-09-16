"""Stage published same-specimen LGN layers after official coordinate conversion."""
import gzip,json,hashlib
import numpy as np
from stage_aqueduct_fourth44 import ROOT,encode,digest
from build_orthogonal_review_bundle import DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
BASE_SHA='a0d068e7497a1b926f3a53b290ddc8a6760a7a1027e37bb40a363b397fe2557c'
PREFIX='lgn-layers2571'

def replay(labels,points,reverse=False):
 out=labels.copy();seen=set()
 for p in points:
  xyz=p['xyz']
  if not isinstance(xyz,list) or len(xyz)!=3 or any(type(v) is not int or v<0 or v>=labels.shape[i] for i,v in enumerate(xyz)):raise ValueError('Invalid coordinate')
  key=tuple(xyz)
  if key in seen or p['before'] not in (0,16) or p['after'] not in (44,45):raise ValueError('Invalid LGN transition')
  if p['before']==16 and p['after']!=45:raise ValueError('Invalid overlap side')
  seen.add(key);old,new=(p['after'],p['before']) if reverse else (p['before'],p['after'])
  if int(out[key])!=old:raise ValueError('Label conflict')
  out[key]=new
 if len(seen)!=2571:raise ValueError('LGN point count differs')
 return out

def main():
 source=ROOT/'work/visual-pathway-completion-20260916-v4';projection=source/'official-app500-projection-v1';candidate=projection/'lgb-layers-app500.npz'
 if digest(candidate.read_bytes())!='4d6cd5ee9d8edeaf4d37e626827771e4f3f5a615c755f714c382759a81aebf1e':raise ValueError('Published-source candidate changed')
 data=np.load(candidate);xyz=data['xyz'];side=data['side'];layer=data['layer']
 _,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,BASE_SHA)
 if set(side.tolist())!={1,2}:raise ValueError('Unexpected source sides')
 if (int((side==1).sum()),int((side==2).sum()))!=(1197,1374) or np.any(np.isin(before,[44,45])):raise ValueError('Source/new IDs changed')
 points=[dict(xyz=p.astype(int).tolist(),before=int(before[tuple(p)]),after=43+int(s),providerLayer=int(l)) for p,s,l in zip(xyz,side,layer)]
 after=replay(before,points)
 if not np.array_equal(replay(after,points,True),before):raise ValueError('Reverse differs')
 evidence=[]
 for path in [candidate,projection/'report.json',source/'native-provider-alignment-v1/report.json',source/'provider-volumes.json',source/'datacite-metadata.json']:
  evidence.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(path.read_bytes())))
 base=DEFAULT_LABELS.read_bytes();stored=encode(gzip.decompress(base)[:10]+after.tobytes(order='F'))
 record=dict(beforeSha256=BASE_SHA,afterSha256=digest(stored),afterRawVoxelSha256=digest(after.tobytes(order='F')),count=len(points),points=points,transition='mixed-lgn-layers',evidence=evidence,
  countsBefore={str(k):int((before==k).sum()) for k in (16,44,45)},countsAfter={str(k):int((after==k).sum()) for k in (16,44,45)},
  status='published-source-resampling-work-stage-only',adopted=False,installed=False,expertReviewed=False,published=False,
  sourceDataset=dict(doi='10.25493/33Z0-BX',license='CC BY-NC-SA 4.0',licenseUrl='https://creativecommons.org/licenses/by-nc-sa/4.0/',scope='Same BigBrain specimen; six layers per side; deep-learning-supported published delineation, not a new manual expert review of this application'),
  rationale='Published native BigBrain LGN layers sampled through official linear, native nonlinear and improved ICBM grids. Nearest-neighbour at app500 voxel centres; no filling between layers, smoothing, side mirroring or tract extension. Source identities and native raw-image alignment retained.',
  limitation='Work stage. Root review of solid voxel extent and one pre-existing right thalamic overlap required before installation. Optic tract, chiasm and radiation are separate structures and are not completed by this LGN map.')
 out=ROOT/f'work/anatomy-review/{PREFIX}-stage-v1';out.mkdir(exist_ok=False);(out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(stored);(out/'repair.json').write_text(json.dumps(record,indent=2)+'\n')
 print(json.dumps(dict(recordSha256=digest((out/'repair.json').read_bytes()),afterSha256=record['afterSha256'],counts=record['countsAfter'])))

if __name__=='__main__':main()
