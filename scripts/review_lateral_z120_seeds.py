"""Inspect existing tiny lateral labels that seed a non-ventricular flood at Z120."""
import argparse
import json
import numpy as np
from scipy import ndimage
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from review_lateral_detached547 import main as render

LABEL_SHA = '4d12523a818aed809bde703dc12615c09c56304dd3d72e7f9c3f5771032b5c62'
SEEDS = {23: (149, 231, 120), 24: (240, 240, 120)}


def selected_components(labels):
    result = {}
    for ident, count in ((23, 4), (24, 7)):
        cc, _ = ndimage.label(labels == ident, ndimage.generate_binary_structure(3, 3))
        key = int(cc[SEEDS[ident]])
        if not key:
            raise ValueError('Missing seed')
        points = np.argwhere(cc == key)
        if len(points) != count:
            raise ValueError('Seed component changed')
        result[ident] = points
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--render', action='store_true')
    args = parser.parse_args()
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    for ident, points in selected_components(labels).items():
        print(json.dumps(dict(labelId=ident, count=len(points), points=points.tolist())))
        if args.render:
            for axis in 'xyz':
                render(axis, component_count=len(points), existing_points=points,
                       existing_label_id=ident, label_id=ident, labels_sha=LABEL_SHA,
                       prefix=f'lateral-z120-id{ident}-full-september12', context_margin=18)
