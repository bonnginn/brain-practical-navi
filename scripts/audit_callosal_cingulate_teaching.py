"""Reproduce the currently installed commissural teaching cut from staged labels."""
import hashlib
import json

import build_specimen_blocks as blocks
import build_teaching_specimens as teaching
from prepare_callosal_cingulate_broad import ROOT, STAGE

sha=lambda data:hashlib.sha256(data).hexdigest()

def main():
    installed=json.loads((ROOT/"app/teachingSpecimens.json").read_text(encoding="utf-8"))
    if installed["sourceLabelSha256"]!=json.loads((STAGE/"repair.json").read_text(encoding="utf-8"))["beforeSha256"]:
        raise ValueError("Installed teaching source changed")
    original_segmentation=blocks.SEGMENTATION
    original_definitions=blocks.specimen_definitions
    blocks.specimen_definitions=lambda raw,labels:{"commissural-system":original_definitions(raw,labels)["commissural-system"]}
    try:
        for name in ("before","after"):
            blocks.SEGMENTATION=STAGE/("before.bin.gz" if name=="before" else "labels.bin.gz")
            output=STAGE/f"teaching-{name}"
            if output.exists(): raise ValueError(f"Preserve existing output: {output}")
            output.mkdir()
            teaching.generate(output)
            report=json.loads((output/"teaching-specimens.json").read_text(encoding="utf-8"))
            if len(report["specimens"])!=1: raise ValueError("Unexpected teaching specimen count")
            if name=="before":
                for part in installed["specimens"]["commissural-system"]["parts"]:
                    old=(output/part["file"]).read_bytes()
                    current=(ROOT/"public/atlas"/part["file"]).read_bytes()
                    if old!=current or sha(old)!=part["meshSha256"]:
                        raise ValueError(f"Installed teaching mesh cannot reproduce: {part['file']}")
        before=json.loads((STAGE/"teaching-before/teaching-specimens.json").read_text(encoding="utf-8"))["specimens"]["commissural-system"]["parts"]
        after=json.loads((STAGE/"teaching-after/teaching-specimens.json").read_text(encoding="utf-8"))["specimens"]["commissural-system"]["parts"]
        changes=[]
        for old,new in zip(before,after):
            if old["key"]!=new["key"]: raise ValueError("Teaching order changed")
            if old["meshSha256"]!=new["meshSha256"]:
                changes.append(dict(part=old["key"],before=old["meshSha256"],after=new["meshSha256"],
                                    facesBefore=old["faces"],facesAfter=new["faces"]))
        print(json.dumps(changes))
    finally:
        blocks.SEGMENTATION=original_segmentation
        blocks.specimen_definitions=original_definitions

if __name__=="__main__":main()
