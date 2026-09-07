import hashlib
import json
import sys
import unittest
from pathlib import Path
import numpy as np
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from review_lateral_detached547 import read_browser_volume,DEFAULT_LABELS,MAGIC_LABELS,main
from review_left_lateral677 import SHA
from stage_lateral_detached547 import validate_review


class LeftReviewTest(unittest.TestCase):
    def test_contiguous_geometry_all_axes_not_visual_approval(self):
        reference=json.loads((ROOT/'work/anatomy-review/left-lateral677-native300-v1/report.json').read_text())
        total=0
        for axis in 'xyz':
            folder=ROOT/f'work/anatomy-review/left-lateral677-series-{axis}-v1'
            report=json.loads((folder/'report.json').read_text())
            self.assertEqual(report['labelId'],23)
            points=validate_review(report,axis,expected_sha=SHA,expected_count=677)
            np.testing.assert_array_equal(points,reference['points'])
            for f in report['figures']:
                total+=len(f['indices'])
                self.assertEqual(hashlib.sha256((folder/f['path']).read_bytes()).hexdigest(),f['sha256'])
        self.assertEqual(total,147)

    def test_exact_left_component_and_sparse_figure_identity(self):
        folder=ROOT/'work/anatomy-review/left-lateral677-native300-v1'
        data=(folder/'report.json').read_bytes()
        self.assertEqual(hashlib.sha256(data).hexdigest(),'bb93d856159ce0a572dbdfef17c7fa8a7e1edd62b7a8a6789c01db0b6331e834')
        report=json.loads(data)
        self.assertEqual(report['labelId'],23);self.assertEqual(report['labelsSha256'],SHA)
        self.assertFalse(report['mutation']);self.assertFalse(report['adopted'])
        self.assertIsNone(report['seriesAxis'])
        _,_,labels=read_browser_volume(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-left-lower-cavity.bin.gz',MAGIC_LABELS,SHA)
        cc,_=ndimage.label(labels==23,ndimage.generate_binary_structure(3,3))
        points=np.argwhere(cc==cc[121,231,112])
        self.assertEqual(len(points),677)
        np.testing.assert_array_equal(points,report['points'])
        self.assertEqual(report['referencePoints'],[[121,231,112],[125,246,105],[132,258,92]])
        self.assertEqual(len(report['figures']),9)
        for f in report['figures']:
            self.assertEqual(len(f['indices']),3)
            self.assertEqual(hashlib.sha256((folder/f['path']).read_bytes()).hexdigest(),f['sha256'])
        self.assertIn('not all boundary planes',report['limitation'])

    def test_reject_other_label_ids_before_reading(self):
        for ident in [0,27,True,23.0]:
            with self.assertRaises(ValueError):main(label_id=ident)


if __name__=='__main__':unittest.main()
