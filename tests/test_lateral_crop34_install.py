import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
import install_lateral_crop34 as installer


class InstallTests(unittest.TestCase):
    def test_plan_readonly_exact(self):
        before = installer.SOURCE.read_bytes()
        if installer.digest(before) not in (installer.SHA, installer.FINAL):
            # A historical installer must refuse to overwrite a newer adoption.
            with self.assertRaisesRegex(ValueError, 'Unrelated current labels'):
                installer.plan()
            self.assertEqual(installer.SOURCE.read_bytes(), before)
            return
        changes = installer.plan()
        self.assertEqual(installer.SOURCE.read_bytes(), before)
        self.assertEqual(len(changes), 20)
        self.assertEqual(len({p for p, _ in changes}), 20)
        self.assertEqual(installer.digest(dict(changes)[installer.SOURCE]), installer.FINAL)
        self.assertTrue(all(p.is_relative_to(ROOT) for p, _ in changes))

    def test_bad_replay_rejected(self):
        before = installer.SOURCE.read_bytes()
        with patch.object(installer, 'replay', lambda labels, points, reverse=False: labels.copy()):
            with self.assertRaisesRegex(ValueError, 'Reconstruction differs'):
                installer.plan()
        self.assertEqual(installer.SOURCE.read_bytes(), before)

    def test_native_review_record_required(self):
        before = installer.SOURCE.read_bytes()
        points, evidence = installer.reviewed_points()
        with patch.object(installer, 'reviewed_points', return_value=(points, evidence[:3])):
            with self.assertRaisesRegex(ValueError, 'Review evidence changed'):
                installer.plan()
        self.assertEqual(installer.SOURCE.read_bytes(), before)


class RegionalBatchTests(unittest.TestCase):
    prefix = 'left-lower-majority'
    record_sha = 'e094c70de4401800e7c838e0ba83df8638a9b4eafde283b722a062ad5317ca31'
    impact_sha = 'be827be3b15ac2499fdc2ba5829dcc6f9355d9caa972f48b74d057be8b68730d'

    def test_changed_blocks_require_pinned_report(self):
        before = installer.SOURCE.read_bytes()
        with self.assertRaisesRegex(ValueError, 'pinned impact report'):
            installer.plan_unchanged_blocks(self.prefix, self.record_sha)
        with self.assertRaisesRegex(ValueError, 'Evidence changed'):
            installer.plan_unchanged_blocks(self.prefix, self.record_sha, '0'*64)
        self.assertEqual(installer.SOURCE.read_bytes(), before)

    def test_regional_preflight_retains_changed_mesh_and_does_not_write(self):
        before = installer.SOURCE.read_bytes()
        stage = ROOT/'work/anatomy-review'/f'{self.prefix}-stage-v1'
        if before not in ((stage/'before.bin.gz').read_bytes(), (stage/'labels.bin.gz').read_bytes()):
            with self.assertRaisesRegex(ValueError, 'Unrelated current labels'):
                installer.plan_unchanged_blocks(self.prefix, self.record_sha, self.impact_sha)
            self.assertEqual(installer.SOURCE.read_bytes(), before)
            return
        changes = installer.plan_unchanged_blocks(self.prefix, self.record_sha, self.impact_sha)
        self.assertEqual(installer.SOURCE.read_bytes(), before)
        self.assertEqual(len(changes), len(dict(changes)))
        outputs = dict(changes)
        mesh = 'block-diencephalon-tissue.mesh'
        self.assertEqual(outputs[ROOT/'tests/fixtures/block-diencephalon-tissue-pre-left-lower-majority.mesh'],
                         (ROOT/'work/anatomy-review/left-lower-majority-meshes-v1'/('installed-'+mesh)).read_bytes())
        self.assertEqual(installer.digest(outputs[installer.ATLAS/mesh]),
                         'f47e360a0b2ec1636321e3f6539b2c80741e9518ea56a7885f2d579cf69ff06b')
        self.assertEqual(installer.digest(outputs[installer.SOURCE]),
                         'daae0550693c30f447ccf3b806c7acf62fbf6432e657c10ef978f7f0f9ef9ce1')


class MixedExclusionTests(unittest.TestCase):
    def test_exclusion_batch_replays_and_retains_recovery_without_writing(self):
        import gzip
        import numpy as np
        before_bytes=installer.SOURCE.read_bytes()
        stage=ROOT/'work/anatomy-review/ventricular-exclusions46-stage-v1'
        if before_bytes not in ((stage/'before.bin.gz').read_bytes(), (stage/'labels.bin.gz').read_bytes()):
            with self.assertRaisesRegex(ValueError, 'Unrelated current labels'):
                installer.plan_unchanged_blocks('ventricular-exclusions46',
                    'df144c3615712322e24abe0b7809a85093ea36191b28dd9a42e10bec050b3fe4',
                    'e21033c73247c0fcd1418123cb2b24e6a8467c68aae078fc8fb79163f8c99618')
            self.assertEqual(installer.SOURCE.read_bytes(), before_bytes)
            return
        outputs=dict(installer.plan_unchanged_blocks('ventricular-exclusions46',
            'df144c3615712322e24abe0b7809a85093ea36191b28dd9a42e10bec050b3fe4',
            'e21033c73247c0fcd1418123cb2b24e6a8467c68aae078fc8fb79163f8c99618'))
        baseline=(ROOT/'work/anatomy-review/ventricular-exclusions46-stage-v1/before.bin.gz').read_bytes()
        self.assertEqual(installer.digest(baseline),'c26c0a6d1f777684226ff2a02ffcab6438a9e0a3a94c3d09981ff2bf04e8845c')
        before=np.frombuffer(gzip.decompress(baseline),dtype=np.uint8,offset=10)
        after=np.frombuffer(gzip.decompress(outputs[installer.SOURCE]),dtype=np.uint8,offset=10)
        changed=before!=after
        self.assertEqual(int(changed.sum()),46)
        self.assertEqual(int(((before==23)&changed).sum()),12)
        self.assertEqual(int(((before==25)&changed).sum()),34)
        self.assertTrue(np.all(after[changed]==0))
        self.assertEqual(outputs[ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-ventricular-exclusions46.bin.gz'],baseline)
        self.assertEqual(installer.SOURCE.read_bytes(),before_bytes)
        self.assertEqual(installer.digest(outputs[installer.SOURCE]),'56dcff45e44fbcc40f59a4e6e06bf707e49dcdeee86f8b16bd169b81bc472c91')


if __name__ == '__main__':
    unittest.main()
