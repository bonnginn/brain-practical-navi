"""Read-only numerical coverage inventory, not anatomical acceptance."""
import json
import numpy as np
from build_orthogonal_review_bundle import (
    ROOT,DEFAULT_LABELS,MAGIC_LABELS,EXPECTED_LABELS_SHA256,read_browser_volume,
)

def measure(mask):
    points=np.argwhere(mask)
    if not len(points): return {'count':0}
    lo=points.min(axis=0);hi=points.max(axis=0)
    local=mask[tuple(slice(int(a),int(b)+1) for a,b in zip(lo,hi))]
    profiles={}
    for a,axis in enumerate('xyz'):
        counts=np.count_nonzero(local,axis=tuple(i for i in range(3) if i!=a))
        profiles[axis]={'first':int(lo[a]),'last':int(hi[a]),'counts':counts.tolist(),
                        'firstToPeak':float(counts[0]/counts.max()),'lastToPeak':float(counts[-1]/counts.max())}
    return {'count':int(len(points)),'bbox':{'min':lo.tolist(),'max':hi.tolist()},
            'profiles':profiles}

def main():
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,EXPECTED_LABELS_SHA256)
    out=ROOT/'work/anatomy-review/label-extent-v1.json'
    result={'labelsSha256':EXPECTED_LABELS_SHA256,'labelMutation':False,
            'policy':'All occupied voxels numerically measured. Endpoint area ratios are triage indicators only, not proof of correct anatomy. Connectivity is not tested.',
            'items':[{'id':i,**measure(labels==i)} for i in range(1,41)]}
    out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps([{'id':r['id'],'count':r['count'],
                      'largeEnds':{a:[round(p['firstToPeak'],3),round(p['lastToPeak'],3)] for a,p in r.get('profiles',{}).items() if max(p['firstToPeak'],p['lastToPeak'])>=.4}} for r in result['items']]))

if __name__=='__main__':main()
