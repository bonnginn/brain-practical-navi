"""Stage a native-image-reviewed right interventricular connection core."""
import gzip,json
import numpy as np
from scipy import ndimage
from stage_aqueduct_fourth44 import ROOT,digest,encode
from build_orthogonal_review_bundle import DEFAULT_LABELS,MAGIC_LABELS,read_browser_volume
BASE_SHA='633e8b51db19e57b7d81c069e1093ddfe80a62eaab0fd3ea3e5bc970cfc6f450'
PREFIX='right-foramen36'

def replay(labels,points,reverse=False):
 xyz=np.asarray(points)
 if xyz.shape!=(36,3) or xyz.dtype.kind not in 'iu' or len(np.unique(xyz,axis=0))!=36 or np.any(xyz<0) or np.any(xyz>=labels.shape):raise ValueError('Invalid fixed 36-cell set')
 old,new=(25,0) if reverse else (0,25)
 if np.any(labels[tuple(xyz.T)]!=old):raise ValueError('Label conflict')
 out=labels.copy();out[tuple(xyz.T)]=new;return out

def main():
 here=ROOT/'work/fornix-completion-20260916';p=here/'foramen36-review-v1/report.json';review=json.loads(p.read_bytes())
 if review['sourceLabelsSha256']!=BASE_SHA or review['adopted']:raise ValueError('Review identity differs')
 points=review['points'];_,_,before=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,BASE_SHA);after=replay(before,points)
 if int((after!=before).sum())!=36 or not np.array_equal(replay(after,points,True),before):raise ValueError('Reverse differs')
 evidence=[]
 for source in [p,here/'right-foramen-native-v1/report.json',here/'foramen-gap-samples.json',here/'wide-native-v1/report.json']:
  evidence.append(dict(path=source.relative_to(ROOT).as_posix(),sha256=digest(source.read_bytes())))
 evidence[0]['visuallyInspectedFigures']=[]
 for f in review['figures']:
  if digest((p.parent/f['file']).read_bytes())!=f['sha256']:raise ValueError('Reviewed figure changed')
  evidence[0]['visuallyInspectedFigures'].append(dict(path=f['file'],sha256=f['sha256']))
 evidence[-1]['visuallyInspectedFigures']=[dict(path='y900.png',sha256=digest((here/'wide-native-v1/y900.png').read_bytes()))]
 topology={}
 for name,lab in [('before',before),('after',after)]:
  cc,n=ndimage.label(np.isin(lab,[23,24,25,26,41]),ndimage.generate_binary_structure(3,1));ids={str(k):int(np.argmax(np.bincount(cc[lab==k]))) for k in [23,24,25,26,41]};topology[name]=dict(mainComponentIds=ids,allFiveConnected=len(set(ids.values()))==1)
 if topology['before']['allFiveConnected'] or not topology['after']['allFiveConnected']:raise ValueError('Unexpected connection measurement')
 base=DEFAULT_LABELS.read_bytes();stored=encode(gzip.decompress(base)[:10]+after.tobytes(order='F'))
 record=dict(beforeSha256=BASE_SHA,afterSha256=digest(stored),afterRawVoxelSha256=digest(after.tobytes(order='F')),points=points,count=36,transition='0->25',evidence=evidence,connectivity=topology,countsBefore={'25':int((before==25).sum())},countsAfter={'25':int((after==25).sum())},
  status='AI-image-reviewed-work-stage-only',adopted=False,installed=False,expertReviewed=False,
  rationale='Native100 whole coronal context Y900 plus 42 raw/candidate orthogonal planes (Z546-565 every plane, X722-746 every second plane, Y890-906 every second plane) show the selected core within the lumen between the descending midline tissue and the right ventricular wall, joining the existing third-ventricular cavity to the right lateral cavity. A wall-dominated point [200,267,148] is excluded. Subvoxel intensity fractions and adjacency are supporting checks only. No tissue or existing labels are overwritten. This lower app-Z148-151 region is distinct from the held 597 superior candidates.',
  limitation='Project image review, not expert approval. A conservative lumen-core repair, not complete foraminal walls or a histologically exact lateral/third naming boundary. Existing label naming is continued from ID25 into the intervening unlabeled core. This does not close external ventricular outlets, remove all islands, or finish fornix/visual pathways. Mesh synchronization and product adoption pending.')
 out=ROOT/f'work/anatomy-review/{PREFIX}-stage-v1';out.mkdir(exist_ok=False);(out/'before.bin.gz').write_bytes(base);(out/'labels.bin.gz').write_bytes(stored);(out/'repair.json').write_text(json.dumps(record,indent=2)+'\n')
 print(json.dumps(dict(recordSha256=digest((out/'repair.json').read_bytes()),afterSha256=record['afterSha256'],connectivity=topology)))

if __name__=='__main__':main()
