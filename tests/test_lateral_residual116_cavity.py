"""Reproduce a work-only threshold locator, without asserting anatomy."""
import hashlib
import json
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
import explore_lateral_residual116_cavity as audit


class CavityTest(unittest.TestCase):
    def test_threshold_variant_guards_before_loading(self):
        for value in (True,65400.0,64000,'65400'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                audit.main(locator_threshold=value)
        with self.assertRaisesRegex(ValueError,'distinct regional'):
            audit.main(locator_threshold=65400)

    def test_thresholds_finite_mapping_and_figures(self):
        folder = ROOT/'work/anatomy-review/lateral-residual116-cavity-exploration-v1'
        report = json.loads((folder/'report.json').read_text())
        self.assertEqual(report['labelSha256'],audit.SHA)
        self.assertEqual(report['sourceSha256'],audit.IMAGE_SHA)
        _,_,labels = audit.read_browser_volume(ROOT/'work/anatomy-review/lateral-residual80-stage-v1/labels.bin.gz',audit.MAGIC_LABELS,audit.SHA)
        raw,start,step,_ = audit.load_identity_minc(audit.SOURCE/audit.IMAGE_NAME,audit.IMAGE_SHA)
        crop = raw[tuple(slice(a,b) for a,b in zip(audit.LOW,audit.HIGH))]
        for threshold in [64500,65000,65400]:
            trial,faces = audit.connected_trial(crop,audit.SEED-audit.LOW,threshold)
            self.assertEqual(report['trials'][str(threshold)],dict(count=int(trial.sum()),cropFaceContacts=faces))
        mask,_ = audit.connected_trial(crop,audit.SEED-audit.LOW,65000)
        origin = np.array([-98.,-134.,-72.]); spacing = np.array([.5,.5,.5])
        mapped = np.unique(np.rint(((np.argwhere(mask)+audit.LOW)*step+start-origin)/spacing).astype(int),axis=0)
        self.assertEqual(len(mapped),856)
        np.testing.assert_array_equal(mapped,np.array([r['xyz'] for r in report['records']]))
        candidates = []
        for p,r in zip(mapped,report['records']):
            support = audit.support_record((p*spacing+origin-start)/step,spacing/step,mask,audit.LOW)
            self.assertEqual(r,dict(xyz=p.tolist(),currentLabel=int(labels[tuple(p)]),**support))
            if support['fullySupported'] and labels[tuple(p)]==0:
                candidates.append(p.tolist())
        self.assertEqual(candidates,report['candidateAppXYZ'])
        self.assertEqual(len(candidates),21)
        self.assertFalse(report['mutation']); self.assertFalse(report['adopted'])
        self.assertEqual(len(report['figures']),9)
        for f in report['figures']:
            self.assertEqual(hashlib.sha256((folder/f['path']).read_bytes()).hexdigest(),f['sha256'])


if __name__ == '__main__':
    unittest.main()
