"""Read-only integrity/coverage of recorded review figures, not a vision test.

An actual visual-review statement is in MANUAL_REGISTERED_CANDIDATE_REVIEW.md.
This audit cannot infer anatomical approval from files, hashes, or counts.
"""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'work/anatomy-review'
# Manifest identity, collection, sheet count, comparison count.
BUNDLES=(
    ('manual-all22-registered-review-v1','manifest.json','8327baa5acd0b427cd1ff6dfce70c185738b6c9f0d1de6a0700ff8c5c91e04e4','groups',210,810),
    ('manual-all22-conflicts-background-v1','report.json','697b07ca1766c7917d8628efcfa71e842ad15456d2b7069c2355a4bf0ced1e39','findings',112,324),
    ('manual-all22-conflicts-small-v1','report.json','7fb08ede05d4deb089bcdf809b32671ab32a46749c9891b1e4b4ae42377e584f','findings',49,145),
    ('manual-all22-conflicts-pairs-v1','report.json','d1ad402143dfb60aa02dabe92a4efc0fe28c13af360e19338748093b44a0719c','overlapGroups',425,1253),
    ('manual-fine-boundaries-v2','report.json','e639abacd8fa64e816f252448d0bda01f011ebefa63042d775b681f96a4401f4','regions',15,45),
    ('manual-fine-conflict-boundaries-v1','report.json','758ddba871f590074078b03d1b07aa6c9a2acf85cc60a2beb2515e6c078af19d','regions',12,36),
    ('manual-practical-composite-review-v1','manifest.json','7af9fbd8d65a80dddf85c457879f58b6d036a4b28abe687c46d86931109ee0a3','groups',18,54),
)


def verify_sheets(folder, groups):
    files=set(); planes=0
    for group in groups:
        for sheet in group.get('sheets',[]):
            path=(folder/sheet['file']).resolve()
            if not path.is_relative_to(folder.resolve()) or path in files or not path.is_file():
                raise ValueError('Missing, repeated, or out-of-directory review sheet')
            if hashlib.sha256(path.read_bytes()).hexdigest()!=sheet['sha256']:
                raise ValueError('Review sheet digest mismatch')
            files.add(path)
            entries=sheet.get('planes',sheet.get('nativeIndices',[]))
            if not entries: raise ValueError('Missing plane evidence')
            planes+=len(entries)
    return len(files),planes


def main():
    results=[]
    for name,filename,digest,collection,count,planes in BUNDLES:
        folder=BASE/name;path=folder/filename
        if hashlib.sha256(path.read_bytes()).hexdigest()!=digest:
            raise ValueError('Review manifest digest mismatch: '+name)
        report=json.loads(path.read_text(encoding='utf-8'))
        if report['adopted'] is not False or report['labelMutation'] is not False:
            raise ValueError('Unexpected adoption/mutation claim')
        observed=verify_sheets(folder,report[collection])
        if observed!=(count,planes): raise ValueError('Review coverage mismatch: '+name)
        results.append(dict(bundle=name,sheets=count,comparisons=planes,manifestSha256=digest))
    print(json.dumps(dict(integrityPassed=True,anatomicalApproval=False,
        scope='Recorded figure integrity only; repeated anatomical planes are not unique voxels or independent expert reviews.',
        sheets=sum(r['sheets'] for r in results),comparisons=sum(r['comparisons'] for r in results),bundles=results)),flush=True)


if __name__=='__main__':main()
