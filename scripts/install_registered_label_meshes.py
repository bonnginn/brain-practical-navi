"""Install only the exact staged dependent meshes after validating every target."""
import argparse,json,struct
import numpy as np
from adopt_remaining_registered_labels import ROOT,TARGET,FINAL_SHA
from adopt_registered_red_nuclei import digest
MANIFEST=ROOT/'segmentation-patches/review/registered-dependent-meshes-2026-09-06.json'
MANIFEST_SHA='9f963ddc75101adaf23832a3af326e260bfaab06340b6c62ba145fb457225f24'


def install(staged):
    if digest(MANIFEST.read_bytes())!=MANIFEST_SHA or digest(TARGET.read_bytes())!=FINAL_SHA:
        raise ValueError('Wrong manifest or label revision')
    records=json.loads(MANIFEST.read_text(encoding='utf-8'))
    if len(records)!=22:raise ValueError('Wrong mesh inventory')
    metadata_path=ROOT/'public/atlas/specimen-blocks.json'
    metadata=json.loads(metadata_path.read_text(encoding='utf-8'))
    planned=[]
    for e in records:
        name=e['file'];target=ROOT/'public/atlas'/name
        if not e['beforeMatches'] or digest(target.read_bytes()) not in (e['beforeSha256'],e['afterSha256']):
            raise ValueError('Existing mesh independently changed: '+name)
        data=(staged/name).read_bytes()
        if digest(data)!=e['afterSha256']:raise ValueError('Staged mesh changed: '+name)
        if e['block']:
            part=next(p for p in metadata['specimens'][e['block']] if p['part']==e['part'])
            shade=np.frombuffer(data,dtype='<f4',count=e['vertices'],offset=12+e['vertices']*24)
            part.update(vertices=e['vertices'],faces=e['faces'],shadeMin=round(float(shade.min()),4),shadeMax=round(float(shade.max()),4),registrationSourceSha256=FINAL_SHA,meshSha256=e['afterSha256'],registrationReview='AI-assisted source-registration project adoption; not expert review. Existing meshing and cutaway rules retained.')
        planned.append((target,data))
    serialized=json.dumps(metadata,ensure_ascii=False,indent=2)+'\n'
    for path,data in planned:path.write_bytes(data)
    metadata_path.write_text(serialized,encoding='utf-8')
    print('Installed 22 exact dependent meshes; no other mesh written')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--staged',required=True,type=__import__('pathlib').Path)
    install(p.parse_args().staged)
