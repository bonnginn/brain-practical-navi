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
from explore_lateral_residual116_cavity import SHA


class CandidateReview(unittest.TestCase):
    def test_all_candidates_all_axes_and_images(self):
        data=(ROOT/'work/anatomy-review/lateral-residual116-cavity-exploration-v1/report.json').read_bytes()
        self.assertEqual(hashlib.sha256(data).hexdigest(),'ac225411191fd9f912741ae5e5f10c7647746f63e061883bc2e12a60e3a351b7')
        points=np.array(json.loads(data)['candidateAppXYZ'])
        planes=0
        for axis in 'xyz':
            folder=ROOT/f'work/anatomy-review/lateral-cavity21-series-{axis}-v1'
            report=json.loads((folder/'report.json').read_text())
            np.testing.assert_array_equal(validate_review(report,axis,expected_sha=SHA,expected_count=21),points)
            self.assertIn('unadopted candidate cells',report['limitation'])
            for f in report['figures']:
                planes+=len(f['indices'])
                self.assertEqual(hashlib.sha256((folder/f['path']).read_bytes()).hexdigest(),f['sha256'])
            broken=copy.deepcopy(report);broken['figures'].pop(0)
            with self.assertRaises(ValueError):
                validate_review(broken,axis,expected_sha=SHA,expected_count=21)
        self.assertEqual(planes,78)


if __name__=='__main__':
    unittest.main()
