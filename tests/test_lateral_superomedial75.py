import copy
import json
import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from stage_lateral_superomedial75 import replay, ROOT, LABEL_SHA
from build_orthogonal_review_bundle import MAGIC_LABELS, read_browser_volume


class SuperomedialRepair(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path=ROOT/'segmentation-patches/review/lateral-superomedial75-adoption-2026-09-12.json'
        if not path.exists():path=ROOT/'work/anatomy-review/lateral-superomedial75-stage-v1/repair.json'
        cls.record=json.loads(path.read_bytes());cls.entries=cls.record['points']
        fixture=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-superomedial75.bin.gz'
        if not fixture.exists():fixture=ROOT/'work/anatomy-review/lateral-superomedial75-stage-v1/before.bin.gz'
        _,_,cls.before=read_browser_volume(fixture,MAGIC_LABELS,LABEL_SHA)

    def test_exact_difference_reverse_and_other_labels_preserved(self):
        after=replay(self.before,self.entries)
        self.assertEqual(int(np.count_nonzero(after!=self.before)),75)
        self.assertTrue(np.array_equal(replay(after,self.entries,True),self.before))
        self.assertTrue(np.array_equal(after[self.before!=0],self.before[self.before!=0]))
        self.assertEqual(sum(e['after']==23 for e in self.entries),31)
        self.assertEqual(sum(e['after']==24 for e in self.entries),44)

    def test_wrong_side_point_count_bool_and_conflicts_rejected(self):
        for mutate in (lambda e:e.pop(),lambda e:e[0].update(after=25),
                       lambda e:e[0].update(after=47-e[0]['after']),
                       lambda e:e[0]['xyz'].__setitem__(0,True),
                       lambda e:e[0]['xyz'].__setitem__(0,394),
                       lambda e:e[0].update(before=True),
                       lambda e:e[0].update(xyz=e[1]['xyz'])):
            entries=copy.deepcopy(self.entries);mutate(entries)
            with self.assertRaises(ValueError):replay(self.before,entries)
        before=self.before.copy();before[tuple(self.entries[0]['xyz'])]=25
        with self.assertRaises(ValueError):replay(before,self.entries)

    def test_review_coverage_is_scoped_not_expert_approval(self):
        self.assertFalse(self.record['expertReviewed'])
        self.assertEqual(len(self.record['evidence']),4)
        counts=[len(e['visuallyInspectedFigures']) for e in self.record['evidence']]
        self.assertEqual(counts,[16,22,17,9])
        self.assertIn('sparse',self.record['limitation'])


if __name__=='__main__':unittest.main()
