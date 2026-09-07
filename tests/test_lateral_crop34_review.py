import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_lateral_detached547 import validate_review
from compare_lateral_cavity_crop_extent import SHA


class CandidateReview(unittest.TestCase):
    def test_exact_candidates_complete_axes_and_image_bytes(self):
        data=(ROOT/'work/anatomy-review/lateral-cavity-crop-extent-v1.json').read_bytes()
        self.assertEqual(hashlib.sha256(data).hexdigest(),'fe75335f8d18dbcdd5f5331c4a64dcb930d7f0f5b89d062456c86e1560fb838a')
        rows=[r for r in json.loads(data)['results'] if r['margin']==16 and r['threshold']==65000]
        self.assertEqual(len(rows),1)
        points=np.array(rows[0]['candidateAppXYZ'])
        planes=0
        for axis in 'xyz':
            folder=ROOT/f'work/anatomy-review/lateral-crop34-series-{axis}-v1'
            report=json.loads((folder/'report.json').read_text())
            np.testing.assert_array_equal(validate_review(report,axis,expected_sha=SHA,expected_count=34),points)
            self.assertIn('unadopted candidate cells',report['limitation'])
            for f in report['figures']:
                planes+=len(f['indices'])
                self.assertEqual(hashlib.sha256((folder/f['path']).read_bytes()).hexdigest(),f['sha256'])
            broken=copy.deepcopy(report);broken['figures'].pop(0)
            with self.assertRaises(ValueError):
                validate_review(broken,axis,expected_sha=SHA,expected_count=34)
        self.assertEqual(planes,132)


if __name__=='__main__':unittest.main()
