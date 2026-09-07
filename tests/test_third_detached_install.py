import sys
import unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import install_third_detached8 as installer


class InstallTests(unittest.TestCase):
    def test_plan_is_readonly_and_exact(self):
        before=installer.SOURCE.read_bytes()
        changes=installer.plan()
        self.assertEqual(installer.SOURCE.read_bytes(),before)
        self.assertEqual(len(changes),9)
        self.assertEqual(len({p for p,_ in changes}),9)
        data=dict(changes)[installer.SOURCE]
        self.assertEqual(installer.digest(data),installer.FINAL)
        self.assertTrue(all(p.is_relative_to(ROOT) for p,_ in changes))

    def test_bad_replay_rejected_without_writes(self):
        before=installer.SOURCE.read_bytes()
        def bad_replay(labels):return labels.copy()
        with patch.object(installer,'replay',bad_replay):
            with self.assertRaisesRegex(ValueError,'Reconstruction differs'):installer.plan()
        self.assertEqual(installer.SOURCE.read_bytes(),before)


if __name__=='__main__':unittest.main()
