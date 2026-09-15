import sys
import unittest
import gzip
import json
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_callosal_remaining304 import replay, digest, LABEL_SHA


class CallosalRemaining304(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.record=json.loads((ROOT/'segmentation-patches/review/callosal-remaining304-adoption-2026-09-12.json').read_bytes())
        blob=(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosal-remaining304.bin.gz').read_bytes()
        if digest(blob)!=LABEL_SHA:
            raise ValueError('Fixture changed')
        cls.before=np.frombuffer(gzip.decompress(blob),np.uint8,offset=10).reshape((394,466,378),order='F')
        cls.expected=cls.before.copy()
        cls.expected[tuple(np.asarray(cls.record['points']).T)]=0

    def test_exact_local_reversible_exclusion(self):
        result=replay(self.before,self.record['points'])
        self.assertTrue(np.array_equal(result,self.expected))
        self.assertEqual(int(np.count_nonzero(result!=self.before)),304)
        self.assertEqual(int((result==30).sum()),145715)
        self.assertEqual(digest(result.tobytes(order='F')),self.record['afterRawVoxelSha256'])
        self.assertTrue(np.array_equal(replay(result,self.record['points'],True),self.before))

    def test_rejects_changed_duplicate_and_conflicting_points(self):
        points=np.array(self.record['points'])
        changed=points.copy();changed[0]=changed[1]
        with self.assertRaisesRegex(ValueError,'identity'):
            replay(self.before,changed)
        changed=points.copy();changed[0,0]=-1
        with self.assertRaisesRegex(ValueError,'Invalid'):
            replay(self.before,changed)
        with self.assertRaisesRegex(ValueError,'Invalid'):
            replay(self.before,points.astype(float))
        with self.assertRaisesRegex(ValueError,'Conflicting'):
            replay(self.expected,points)
        self.assertEqual(int((self.before==30).sum()),146019)


if __name__=='__main__':
    unittest.main()
