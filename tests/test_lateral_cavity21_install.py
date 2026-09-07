import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
import install_lateral_cavity21 as installer


class InstallTests(unittest.TestCase):
    def test_plan_readonly_exact(self):
        before = installer.SOURCE.read_bytes()
        changes = installer.plan()
        self.assertEqual(installer.SOURCE.read_bytes(), before)
        self.assertEqual(len(changes), 22)
        self.assertEqual(len({p for p, _ in changes}), 22)
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


if __name__ == '__main__':
    unittest.main()
