"""Geometry and read-only rendering tests, not anatomical validation."""
import json
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from render_pallidal_current300_review import select_planes,render_row,CENTER,LABEL_SHA,digest


class PallidalCurrentTests(unittest.TestCase):
    def test_continuous_span_and_deduplication(self):
        affine=np.diag([.5,.5,.5,1.]);affine[:3,3]=[-98,-134,-72]
        start=np.array([-98,-134,-72]);step=np.array([.3,.3,.3])
        planes,ends=select_planes(affine,start,step)
        self.assertEqual(ends,[387,410])
        self.assertEqual([i for a,i in planes if a == 'y'],list(range(387,411)))
        self.assertEqual([i for a,i in planes if a == 'x'],[406,407,408])
        self.assertEqual([i for a,i in planes if a == 'z'],[251,252,253])
        self.assertEqual(len(planes),30);self.assertEqual(len(set(planes)),30)
        bad=affine.copy();bad[0,1]=.2
        with self.assertRaises(ValueError): select_planes(bad,start,step)

    def test_row_does_not_mutate_inputs(self):
        gray=np.arange(61**3,dtype=np.uint8).reshape((61,61,61))
        labels=np.zeros_like(gray);labels[20:40,20:40,20:40]=12
        oldgray=gray.copy();oldlabels=labels.copy()
        row,record=render_row(gray,labels,'y',30,[0,0,0])
        self.assertTrue(np.array_equal(gray,oldgray));self.assertTrue(np.array_equal(labels,oldlabels))
        self.assertEqual(row.size,(500,308));self.assertEqual(record['globalIndex'],30)

    def test_generated_report_and_public_baseline(self):
        folder=ROOT/'work/anatomy-review/pallidal-current300-v1'
        report=json.loads((folder/'report.json').read_text(encoding='utf-8'))
        self.assertFalse(report['mutation']);self.assertFalse(report['adopted'])
        self.assertFalse(report['expertReviewed']);self.assertTrue(report['visualReviewPending'])
        selected,ends=select_planes(report['appAffine'],report['sourceStart'],report['sourceStep'])
        actual=[(p['axis'],p['globalIndex']) for f in report['figures'] for p in f['planes']]
        self.assertEqual(actual,selected);self.assertEqual(report['coronalRegisteredYInclusive'],ends)
        for f in report['figures']:
            self.assertLessEqual(len(f['planes']),3)
            self.assertEqual(digest((folder/f['path']).read_bytes()),f['sha256'])
        self.assertEqual(digest((ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()),LABEL_SHA)


if __name__ == '__main__': unittest.main()
