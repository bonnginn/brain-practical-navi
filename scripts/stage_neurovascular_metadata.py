"""Generate metadata in new work output and require all five meshes unchanged."""
import contextlib
import hashlib
import io
import json
from unittest.mock import patch
import build_neurovascular_overlays as generator

def main():
    out=generator.ROOT/'work/neurovascular-metadata-v1'
    out.mkdir(exist_ok=False)
    with patch.object(generator,'OUT',out),contextlib.redirect_stdout(io.StringIO()):
        generator.main()
    meshes=sorted(out.glob('*.mesh'))
    if len(meshes)!=5:raise ValueError('Expected five meshes')
    records=[]
    for path in meshes:
        current=(generator.ROOT/'public/atlas'/path.name).read_bytes()
        generated=path.read_bytes()
        if generated!=current:raise ValueError('Unexpected geometry change: '+path.name)
        records.append(dict(file=path.name,sha256=hashlib.sha256(current).hexdigest()))
    report=dict(geometryChanged=False,expertReviewed=False,meshes=records,
                metadataSha256=hashlib.sha256((out/'neurovascular-overlays.json').read_bytes()).hexdigest())
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report))

if __name__=='__main__':main()
