import gzip
import hashlib
import json
from pathlib import Path
import unittest
import numpy as np
from scipy.ndimage import binary_dilation, generate_binary_structure

ROOT = Path(__file__).resolve().parents[1]


class FourthRemainingCandidateTest(unittest.TestCase):
    def test_exact_current_empty_face_neighbours_and_selection(self):
        path = ROOT / 'work/anatomy-review/fourth-ventricle-remaining-wall31fa-candidate-v1/candidate.json'
        payload = path.read_bytes()
        self.assertEqual(hashlib.sha256(payload).hexdigest(), '0cea75569178c174e34e1aed2aabadf1a341efefc1ea93ac2de18b1297f4040e')
        report = json.loads(payload)
        source = (ROOT / 'tests/fixtures/bigbrain-practical-segmentation-pre-fourth-remaining-anterior173.bin.gz').read_bytes()
        self.assertEqual(hashlib.sha256(source).hexdigest(), report['inputCompressedSha256'])
        labels = np.frombuffer(gzip.decompress(source), np.uint8, offset=10).reshape((394,466,378), order='F')
        adjacent = binary_dilation(labels == 26, structure=generate_binary_structure(3,1))
        low = np.array([178,156,58]); high = np.array([213,195,98])
        points = np.indices(high-low+1).reshape(3,-1).T + low
        expected = points[(labels[tuple(points.T)] == 0) & adjacent[tuple(points.T)]]
        np.testing.assert_array_equal(expected, [r['xyz'] for r in report['records']])
        self.assertEqual(len(expected), 2485)
        self.assertEqual(sum(r['selected'] for r in report['records']), 509)
        for row in report['records']:
            self.assertEqual(row['selected'], row['supportCornerMinimum'] >= 65000)
            self.assertEqual((row['before'],row['after']), (0,26))
        self.assertFalse(report['adopted'])
        self.assertFalse(report['expertReviewed'])
        self.assertFalse(report['labelMutation'])


if __name__ == '__main__':
    unittest.main()
