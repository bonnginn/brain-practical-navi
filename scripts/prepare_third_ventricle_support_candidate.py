"""Work-only alternative to the discontinuous Y-bracket candidate. Never installs labels."""
import hashlib
import json
import argparse
import numpy as np
from scipy.ndimage import label
from copy import deepcopy
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from review_third_ventricle_native300 import LABEL_SHA

SOURCE_SHA = '80a54c322225cf60592a1419073264e35d3d346d1c58c47d28084f036eeab84a'


def eligible(record):
    # Existing Y-bracketing is diagnostic, not a necessary cavity condition.
    # A known intervening structure still vetoes selection. Missing brackets do
    # not establish that the voxel is anatomically third ventricle.
    return (record['before'] == 0 and record['after'] == 25
            and record['supportCornerMinimum'] >= 65000
            and (not record['bracketedBy25'] or record['noOtherLabelBetween']))


def seed_component(points, seed):
    points = np.asarray(points, dtype=int)
    seed = np.asarray(seed, dtype=int)
    if points.ndim != 2 or points.shape[1] != 3 or not len(points):
        raise ValueError('Invalid points')
    low, high = points.min(0), points.max(0)
    if np.any(seed < low) or np.any(seed > high):
        raise ValueError('Seed outside candidate')
    mask = np.zeros(high-low+1, dtype=bool)
    mask[tuple((points-low).T)] = True
    components, _ = label(mask)  # Explicitly the default 6-neighbour structure.
    chosen = int(components[tuple(seed-low)])
    if chosen == 0:
        raise ValueError('Seed not selected')
    return components[tuple((points-low).T)] == chosen


def main(central_core=False):
    source = ROOT/'work/anatomy-review/third-ventricle-expanded-candidate-v1/candidate.json'
    out = ROOT/'work/anatomy-review/third-ventricle-support-candidate-v1'
    if central_core:
        out = ROOT/'work/anatomy-review/third-ventricle-central-core-candidate-v1'
    if out.exists():
        raise ValueError('Evidence exists')
    if hashlib.sha256(source.read_bytes()).hexdigest() != SOURCE_SHA:
        raise ValueError('Source evidence changed')
    original = json.loads(source.read_text(encoding='utf-8'))
    if original['inputCompressedSha256'] != LABEL_SHA:
        raise ValueError('Wrong source label identity')
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA)
    records = deepcopy(original['records'])
    for record in records:
        if labels[tuple(record['xyz'])] != 0:
            raise ValueError('Existing structure would be overwritten')
        record['previouslySelected'] = record['selected']
        record['selected'] = bool(eligible(record))
    selected = [r for r in records if r['selected']]
    added = [r for r in selected if not r['previouslySelected']]
    if len(selected) != 2072 or len(added) != 848:
        raise ValueError('Unexpected candidate delta')
    if central_core:
        # This voxel was inspected in the Z152/153 original300 comparison.
        # Connectivity identifies that cavity candidate, not its anatomical validity.
        keep = seed_component([r['xyz'] for r in selected], [196, 240, 153])
        for record, retain in zip(selected, keep):
            record['selected'] = bool(retain)
        selected = [r for r in records if r['selected']]
        added = [r for r in selected if not r['previouslySelected']]
        xyz = np.asarray([r['xyz'] for r in selected])
        if len(selected) != 1587 or xyz.min(0).tolist() != [192,223,135] or xyz.max(0).tolist() != [200,260,164]:
            raise ValueError('Central component changed')
    report = dict(inputCompressedSha256=LABEL_SHA, sourceEvidenceSha256=SOURCE_SHA,
                  source300Sha256=original['source300Sha256'], records=records,
                  candidateBoxInclusive=original['candidateBoxInclusive'],
                  selectedCount=len(selected), newlySelectedCount=len(added),
                  centralCore=central_core, reviewSeed=([196,240,153] if central_core else None),
                  adopted=False, expertReviewed=False, labelMutation=False,
                  limitation='Finite exploratory ROI, not an anatomical boundary. Original300 support values are reused from pinned evidence. No global filling or existing-label overwrite. All changed planes and ROI edges need renewed review; eligibility alone never authorizes adoption.')
    out.mkdir()
    destination = out/'candidate.json'
    destination.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(selected=len(selected), additional=len(added),
                         sha256=hashlib.sha256(destination.read_bytes()).hexdigest(), installed=False)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--central-core', action='store_true')
    main(parser.parse_args().central_core)
