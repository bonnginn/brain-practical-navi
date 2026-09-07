"""Current adoption preflight: exact replay, no writes, and impact rejection."""
import copy
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import install_fourth_anterior105_repair as install


class FourthAnteriorInstallTests(unittest.TestCase):
    def test_installed_plan_is_byte_identical_and_does_not_write(self):
        before=install.DEFAULT_LABELS.read_bytes()
        if install.digest(before) not in (install.BASE_SHA, install.FINAL):
            with self.assertRaisesRegex(ValueError, 'Current source differs'):
                install.plan()
            self.assertEqual(install.DEFAULT_LABELS.read_bytes(), before)
            return
        changes=install.plan()
        self.assertEqual(len(changes),12)
        self.assertEqual(len({str(p) for p,_ in changes}),12)
        for path,data in changes:
            self.assertEqual(path.read_bytes(),data,str(path))
        self.assertEqual(install.DEFAULT_LABELS.read_bytes(),before)

    def test_duplicate_impact_cannot_replace_missing_part(self):
        original=install.checked
        def wrong(path,sha):
            report=original(path,sha)
            if 'blockMaskImpact' in report:
                report=copy.deepcopy(report)
                report['blockMaskImpact'][0]=report['blockMaskImpact'][1]
            return report
        before=install.DEFAULT_LABELS.read_bytes()
        original_read = Path.read_bytes
        baseline = (install.WORK/'fourth-ventricle-anterior105-stage-v1/base.bin.gz').read_bytes()
        def historical_read(path):
            return baseline if path == install.DEFAULT_LABELS else original_read(path)
        with patch.object(install,'checked',side_effect=wrong), patch.object(Path,'read_bytes',historical_read):
            with self.assertRaisesRegex(ValueError,'Incomplete block coverage'):
                install.plan()
        self.assertEqual(install.DEFAULT_LABELS.read_bytes(),before)


if __name__=='__main__':unittest.main()
