"""Reproduce all overlays in a new work directory; only anterior may change."""
import argparse,contextlib,io,json,hashlib
from pathlib import Path
from unittest.mock import patch
import build_neurovascular_overlays as g

def main(output):
    output=output.resolve()
    if output.exists() or not output.is_relative_to(g.ROOT/'work'):raise ValueError('New work output required')
    output.mkdir()
    with patch.object(g,'OUT',output),contextlib.redirect_stdout(io.StringIO()):g.main()
    sha=lambda b:hashlib.sha256(b).hexdigest()
    records=[]
    for file in sorted(output.glob('*.mesh')):
        old=(g.ROOT/'public/atlas'/file.name).read_bytes();new=file.read_bytes()
        if file.name!='overlay-arteries-anterior.mesh' and old!=new:raise ValueError('Unexpected change: '+file.name)
        records.append(dict(file=file.name,beforeSha256=sha(old),afterSha256=sha(new),changed=old!=new))
    (output/'report.json').write_text(json.dumps(dict(expertReviewed=False,scope='schematic PComm topology only',meshes=records),indent=2)+'\n',encoding='utf-8')
    print(json.dumps(records,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);main(p.parse_args().output)
