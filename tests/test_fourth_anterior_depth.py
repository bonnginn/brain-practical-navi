import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from explore_fourth_anterior_depth import ROOT, main


class DepthExploration(unittest.TestCase):
    def test_explicit_identity_and_safe_output_required(self):
        for args in ({'prefix':'../outside'}, {'source_sha':'unknown'}):
            with self.assertRaises(ValueError): main(**args)

    def test_record_keeps_all_intervening_support(self):
        r=json.loads((ROOT/'work/anatomy-review/fourth-anterior-depth-through-brainstem-2bf9-v1.json').read_bytes())
        self.assertEqual(r['allowedSourceLabels'],[0,27])
        self.assertEqual(r['count'],27)
        self.assertEqual(sum(p['before']==0 for p in r['candidateChanges']),16)
        self.assertEqual(sum(p['before']==27 for p in r['candidateChanges']),11)
        expected=[]
        for c in r['columns']:
            self.assertEqual(len(c['supportMinima']),c['length'])
            accepted=0
            for v in c['supportMinima']:
                if v<r['threshold']:break
                accepted+=1
            self.assertEqual(accepted,c['acceptedCount'])
            expected.extend([[c['x'],c['firstY']+j,c['z']] for j in range(accepted)])
        self.assertEqual(r['points'],expected)
        self.assertEqual([p['xyz'] for p in r['candidateChanges']],expected)
        self.assertTrue(all(p['after']==26 for p in r['candidateChanges']))
        self.assertEqual(r['guardReached'],0)
        self.assertFalse(r['labelMutation'])
        self.assertFalse(r['adopted'])

    def test_fraction_requires_explicit_valid_proportion(self):
        for value in (True, '0.8', .49, 1.01, float('nan')):
            with self.assertRaises(ValueError):main(majority_fraction=value)

    def test_posterior_fraction_record_reconstructs_contiguous_selection(self):
        r=json.loads((ROOT/'work/anatomy-review/fourth-upper-posterior-fraction80-ad444-v1.json').read_bytes())
        self.assertEqual(r['direction'],'posterior')
        self.assertEqual(r['zRangeInclusive'],[85,97])
        self.assertEqual(len(r['sampleOffsetsVoxel']),125)
        self.assertEqual(len({tuple(p) for p in r['sampleOffsetsVoxel']}),125)
        expected=[]
        for c in r['columns']:
            self.assertEqual(c['direction'],-1)
            self.assertEqual(len(c['sampledFractions']),c['length'])
            self.assertEqual(len(c['supportMinima']),c['length'])
            count=0
            for fraction in c['sampledFractions']:
                self.assertTrue(0<=fraction<=1)
            for fraction in c['sampledFractions']:
                if fraction<r['samplingFractionThreshold']:break
                count+=1
            self.assertEqual(count,c['acceptedCount'])
            expected.extend([[c['x'],c['firstY']-i,c['z']] for i in range(count)])
        self.assertEqual(r['points'],expected)
        self.assertEqual(r['count'],111)
        self.assertEqual(len({tuple(p) for p in expected}),111)
        self.assertFalse(r['adopted'])
        self.assertFalse(r['labelMutation'])
        self.assertEqual(r['guardReached'],0)


if __name__=='__main__':unittest.main()
