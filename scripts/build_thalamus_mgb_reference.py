"""Rebuild source-backed MGB representative positions; no label mutation."""
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FILES={'work/mgb-same-specimen-2026-10-01/projection-report.json': 'b17b1ced5b3bd3cfdff7689a47c12c0110856a691705a5059d945a7f3b969d3c', 'work/mgb-same-specimen-2026-10-01/provider-volumes.json': 'dae103b80610b31ac4ee8c691f718eb6015463e7bee9c0f82bab0cffc50035dd', 'work/anatomy-review/mgb-native100-2026-10-01/report.json': '0ef4a2ba026809b3b81ac0658b4b54c296134f34de6d70fb7a0e73709afcc917'}
for name,digest in FILES.items():
 assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest,name
p=ROOT/"work/mgb-same-specimen-2026-10-01/projection-report.json"
r=json.loads(p.read_bytes())
provider=ROOT/"work/mgb-same-specimen-2026-10-01/provider-volumes.json"
assert hashlib.sha256(provider.read_bytes()).hexdigest()==r["providerRecordSha256"]
source=json.loads(provider.read_bytes())
for row in source["volumes"]:
 folder=provider.parent/row["name"]
 for name,key in [("info.json","infoSha256"),("transform.json","transformSha256")]:
  assert hashlib.sha256((folder/name).read_bytes()).hexdigest()==row[key]
 assert hashlib.sha256((provider.parent/(row["name"]+"-overview.nii.gz")).read_bytes()).hexdigest()==row["volumeSha256"]
 for chunk in row["chunks"]:assert hashlib.sha256((folder/(chunk["key"]+".bin")).read_bytes()).hexdigest()==chunk["sha256"]
review=ROOT/"work/anatomy-review/mgb-native100-2026-10-01/report.json"
for figure in json.loads(review.read_bytes())["figures"]:
 assert hashlib.sha256((review.parent/figure["file"]).read_bytes()).hexdigest()==figure["sha256"]
j=dict(sourceDataset=dict(doi=r["doi"],license=r["license"],paper="https://doi.org/10.3389/fnana.2022.837485",providerRecordSha256=r["providerRecordSha256"]),method=r["method"],sourceScales=r["sourceScales"],transformShas=r["transformShas"],maxInverseForwardRoundtripErrorMm=r["maxInverseForwardRoundtripErrorMm"],applicationDimensionsXYZ=[394,466,378],references=[dict(side=s["side"],displayReferencePointXYZmm=s["displayCentroidXYZ"],applicationReferenceXYZ=s["applicationCentroidXYZ"],sampledVoxelCount=s["count"]) for s in r["sides"]],review=dict(path=review.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(review.read_bytes()).hexdigest(),planesViewed=18,expertReviewed=False),scope="Representative points of published same-BigBrain MGB subdivision unions at app500 sampling. Positions only; no nucleus boundary, left/right mirroring, tract or label adoption.")
(ROOT/"app/thalamusMgbReference.json").write_text(json.dumps(j,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(dict(referenceCount=len(j["references"]),labelMutation=False)))
