import gzip
import json
from pathlib import Path
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]


class FourthAnteriorStageTest(unittest.TestCase):
    def test_exact_reversible_subset(self):
        folder=ROOT/'work/anatomy-review/fourth-remaining-anterior173-stage-v1'
        report=json.loads((folder/'repair.json').read_text())
        candidate=json.loads((ROOT/'work/anatomy-review/fourth-remaining-anterior173-candidate-v1.json').read_text())
        before_bytes=gzip.decompress((folder/'before.bin.gz').read_bytes())
        after_bytes=gzip.decompress((folder/'labels.bin.gz').read_bytes())
        self.assertEqual(before_bytes[:10],after_bytes[:10])
        before=np.frombuffer(before_bytes,np.uint8,offset=10).reshape((394,466,378),order='F')
        after=np.frombuffer(after_bytes,np.uint8,offset=10).reshape(before.shape,order='F')
        points=np.array(candidate['points'])
        np.testing.assert_array_equal(np.argwhere(before!=after),points)
        self.assertEqual(len(points),173)
        self.assertTrue(np.all(before[tuple(points.T)]==0))
        self.assertTrue(np.all(after[tuple(points.T)]==26))
        restored=after.copy();restored[tuple(points.T)]=0
        np.testing.assert_array_equal(restored,before)
        self.assertEqual(int((after==26).sum()),8814)
        self.assertEqual(report['transition'],'0->26')
        self.assertFalse(report['adopted']);self.assertFalse(report['expertReviewed'])
        np.testing.assert_array_equal(before[tuple(np.array(candidate['otherPoints']).T)],after[tuple(np.array(candidate['otherPoints']).T)])


if __name__=='__main__':unittest.main()
