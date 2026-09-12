import copy
import json
import sys
import unittest
from pathlib import Path
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from render_native100_candidate_context import candidate_mask, render_context
from review_lateral_midline_candidates import candidate_points


class NativeCandidateContext(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.labels = np.zeros((394,466,378),np.uint8)
        cls.points = [[190,240,150],[191,240,150],[192,240,150]]

    def test_projection_mask_is_only_the_requested_cells_without_side_assignment(self):
        mask = candidate_mask(self.labels,self.points,[self.points[1]])
        self.assertEqual(int(mask.sum()),3)
        self.assertEqual(set(np.unique(mask)),{0,1})
        self.assertEqual(int(self.labels.sum()),0)

    def test_saved_assessment_is_held_with_nonduplicated_plane_counts(self):
        path=Path(__file__).resolve().parents[1]/'segmentation-patches/review/lateral-midline672-held-2026-09-12.json'
        record=json.loads(path.read_bytes())
        self.assertEqual(record['candidateCount'],672)
        self.assertEqual(record['adoptedCount'],0)
        for key in ('projectAdopted','expertReviewed','published'):
            self.assertFalse(record[key])
        counts={}
        for evidence in record['evidence']:
            figures=evidence['visuallyInspectedFigures']
            self.assertEqual(len(figures),9)
            self.assertEqual(len({f['path'] for f in figures}),9)
            if evidence['kind']=='native100':
                planes={(p['axis'],p['nativeIndex']) for f in figures for p in f['planes']}
            else:
                planes={(f['axis'],i) for f in figures for i in f['indices']}
            counts[evidence['kind']]=len(planes)
        self.assertEqual(counts,{'native300':27,'native100':24})

    def test_invalid_coordinate_reference_and_existing_tissue_rejected(self):
        for p,r in [([],[]),([[190.5,240,150]],[[190.5,240,150]]),
                    ([[True,240,150]],[[True,240,150]]),
                    ([[-1,240,150]],[[-1,240,150]]),
                    ([[394,240,150]],[[394,240,150]]),
                    (self.points,[self.points[0],self.points[0]]),
                    (self.points,[[191,241,150]]),
                    ([self.points[0],self.points[0]],[self.points[0]])]:
            with self.assertRaises(ValueError):
                candidate_mask(self.labels,p,r)
        changed=self.labels.copy(); changed[tuple(self.points[0])]=25
        with self.assertRaises(ValueError):
            candidate_mask(changed,self.points,[self.points[0]])

    def test_invalid_output_or_radius_rejected_before_source_read(self):
        for prefix,radius in [('../escape',6),('valid',7),('valid',True)]:
            with self.assertRaises(ValueError):
                render_context(self.labels,self.points,[self.points[0]],label_sha='',locator_path='',
                               locator_sha='',prefix=prefix,radius=radius)

    def test_midline_locator_keeps_unassigned_candidates_and_rejects_drift(self):
        selected=[dict(xyz=[190+i%21,240+i//21,150],after=24) for i in range(672)]
        report=dict(labelSha256='84f91400e7f6b9d059707772b01889f74112d62e853bcebfffddaf589b423ba3',
                    count=869,points=selected+[dict(xyz=[100+i,200,150],after=23) for i in range(197)])
        result=candidate_points(report,self.labels)
        self.assertEqual(result.shape,(672,3))
        self.assertTrue(np.all(result[:,1]>=230))
        for mutate in (lambda r:r.update(count=868),lambda r:r['points'].pop(),
                       lambda r:r['points'][0].update(xyz=r['points'][1]['xyz']),
                       lambda r:r['points'][0].update(xyz=[394,240,150])):
            bad=copy.deepcopy(report); mutate(bad)
            with self.assertRaises(ValueError):
                candidate_points(bad,self.labels)
        changed=self.labels.copy(); changed[tuple(result[0])]=23
        with self.assertRaises(ValueError):
            candidate_points(report,changed)


if __name__=='__main__':
    unittest.main()
