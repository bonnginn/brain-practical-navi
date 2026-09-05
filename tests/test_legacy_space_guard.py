import ast
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
import build_bigbrain_manual_seg as manual


class LegacySpaceGuardTests(unittest.TestCase):
    def test_guard_requires_acknowledgement_and_new_work_subdirectory(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(manual, 'ROOT', Path(directory)):
            root = Path(directory); work = root/'work'; work.mkdir()
            accepted = work/'new-historical-reproduction'
            with self.assertRaisesRegex(ValueError, 'Known nonlinear'):
                manual.require_legacy_reproduction(accepted, False)
            self.assertEqual(manual.require_legacy_reproduction(accepted, True), accepted.resolve())
            self.assertFalse(accepted.exists())
            for rejected in (root/'public'/'atlas', root/'outside', work, root):
                with self.assertRaises(ValueError): manual.require_legacy_reproduction(rejected, True)
            accepted.mkdir()
            with self.assertRaises(ValueError): manual.require_legacy_reproduction(accepted, True)

    def test_both_clis_refuse_before_missing_input_loading(self):
        root = Path(__file__).resolve().parents[1]
        for filename in ('build_bigbrain_manual_seg.py', 'build_bigbrain_practical_seg.py'):
            args = [sys.executable, '-X', 'utf8', str(root/'scripts'/filename), 'missing-image.zipentry', 'missing-label.zipentry', '--output-dir', str(root/'public'/'atlas')]
            if 'practical' in filename:
                args.extend(['--cerebra', 'missing-cerebra.nii', '--wm-prob', 'missing-wm.nii'])
            result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8')
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('Known nonlinear image/manual space mismatch', result.stderr)
            self.assertNotIn('FileNotFoundError', result.stderr)
            result = subprocess.run(args+['--legacy-grid-reproduction'], capture_output=True, text=True, encoding='utf-8')
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('new subdirectory inside work/', result.stderr)
            self.assertNotIn('FileNotFoundError', result.stderr)

    def test_guard_precedes_input_and_writes_in_both_main_functions(self):
        root = Path(__file__).resolve().parents[1]
        for filename, first_loader in (('build_bigbrain_manual_seg.py', 'load_entry'), ('build_bigbrain_practical_seg.py', 'load_nifti_entry')):
            tree = ast.parse((root/'scripts'/filename).read_text(encoding='utf-8'))
            main = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'main')
            calls = [n for n in ast.walk(main) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)]
            guard = next(n.lineno for n in calls if n.func.id == 'require_legacy_reproduction')
            self.assertLess(guard, min(n.lineno for n in calls if n.func.id == first_loader))
            self.assertLess(guard, min(n.lineno for n in calls if n.func.id == 'write_browser_volume'))


if __name__ == '__main__': unittest.main()
