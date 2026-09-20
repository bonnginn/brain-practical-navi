"""One right-sided virtual prosection with broad roof and temporal cuts.

Design reference: Practical Brain Dissection (2012), pp.71–77.
Coordinates are an app-specific preparation, not traced book geometry.
Source labels are read-only; all retained tissue shares one mesh surface.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import build_specimen_blocks as b
from build_teaching_specimens import surface_ids, subset_mesh


def preparation(raw, seg):
    z, y, x = b.world_grids(raw.shape)
    region = ((0, 80), (-65, 65), (-56, 30))
    original = b.largest_component(raw < 252) & ~np.isin(seg, b.VENTRICLES)
    original &= b.bounds(z, y, x, x=region[0], y=region[1], z=region[2])
    # Broad sagittal ramps, shared by grey and white matter. No protective
    # label shells or excavation around isolated solid structures.
    roof_y = [-65, -40, -25, -10, 10, 25, 45, 65]
    roof_z = [-9, -9, 3, 5, 5, -3, -14, -14]
    roof = np.interp(y, roof_y, roof_z)
    cut = z > roof
    # A second access from the temporal/lateral side opens the inferior horn.
    # The hippocampal floor remains attached to the medial temporal tissue.
    temporal_y = [-35, -25, -15, -5, 5, 15]
    temporal_x = [24, 23, 25, 25, 24, 23]
    temporal_z = [-12, -14, -23, -29, -35, -39]
    window = (y >= -35) & (y <= 15)
    window = window & (x >= np.interp(y, temporal_y, temporal_x))
    window = window & (z >= np.interp(y, temporal_y, temporal_z))
    # Complete the roof opening vertically into the existing cavity. This is
    # one-sided unroofing, not a radial peel around the ventricle or nuclei:
    # the floor and lateral/medial walls retain their supporting tissue.
    ventricular_roof = np.maximum.accumulate((seg == 24), axis=0)
    body = original & ~(cut | window | ventricular_roof)
    # Remove detached cutting debris, never add tissue across a cavity.
    body = b.largest_component(body)
    return body, region, dict(roofY=roof_y, roofZ=roof_z,
                             temporalY=temporal_y, temporalX=temporal_x,
                             temporalZ=temporal_z)


def generate(out):
    rawfine, dims = b.read_volume(b.BIGBRAIN, b'BBV1')
    fine, sdims = b.read_volume(b.SEGMENTATION, b'BBS1')
    assert dims == sdims
    raw, seg = rawfine[::2, ::2, ::2], fine[::2, ::2, ::2]
    body, region, cuts = preparation(raw, seg)
    mesh = b.mesh_from_mask(body, raw, True)
    ids = surface_ids(mesh, body, fine)
    parts = []
    assigned = np.zeros(len(ids), bool)
    for name, labels, color in [('caudate', [8], '#dc914b'),
                                 ('thalamus', [16], '#8d82c4'),
                                 ('hippocampus', [18], '#c8798d'),
                                 ('tissue', [], '#c9a27d')]:
        keep = np.isin(ids, labels) if labels else ~assigned
        assigned |= keep
        assert keep.any(), name
        p = b.write_mesh('teaching-block-lateral-ventricle-'+name,
                         subset_mesh(mesh, keep), out, compress=True)
        p.update(key=name, role='structure' if labels else 'tissue',
                 source='manual-segmentation' if labels else 'specimen-derived',
                 color=color, geometrySamplingMm=1, surfaceOnly=True)
        if labels: p['sourceLabelIds'] = labels
        parts.append(p)
    cavity = b.fine_cavity_mask(fine, 24, region)
    p = b.write_mesh('teaching-block-lateral-ventricle-ventricular-cavity',
                     b.mesh_from_fine_cavity(cavity), out, compress=True)
    p.update(key='ventricular-cavity', role='cavity', source='same-grid-segmentation',
             color='#45aebe', geometrySamplingMm=.5)
    parts.append(p)
    report = dict(parts=parts, boundsXYZmm=region, surfaceFaces=len(mesh[3]),
                  bodyVoxels=int(body.sum()),
                  colourMethod='Partition of one shared external/cut surface',
                  preparation='Right hemisphere: broad roof ramps and lateral temporal opening',
                  cuts=cuts, retainedLabelVoxels={str(i):int((body & (seg==i)).sum())
                                                 for i in (8,16,18)})
    assert sum(p['faces'] for p in parts if p['role']!='cavity') == len(mesh[3])
    (out/'lateral-ventricle.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    np.savez_compressed(out/'preparation-mask.npz',body=body)
    print(json.dumps({k:v for k,v in report.items() if k!='parts'}),flush=True)
    print('source label SHA',hashlib.sha256(b.SEGMENTATION.read_bytes()).hexdigest(),flush=True)


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args()
    args.output_dir.mkdir(parents=True,exist_ok=False)
    generate(args.output_dir)
