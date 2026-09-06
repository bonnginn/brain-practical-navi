"""Verify the real generator preserves nuclear exclusions after morphology.

Small deterministic NumPy morphology stand-in avoids optional NIfTI/SciPy
dependencies. This is a pipeline invariant test, not a real-atlas validation.
"""
import sys
import ast
import types
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from build_bigbrain_practical_seg import atlas_white_matter_candidates


def neighbours(a):
    p = np.pad(a, 1, constant_values=False)
    return [p[1:-1,1:-1,1:-1], p[:-2,1:-1,1:-1], p[2:,1:-1,1:-1],
            p[1:-1,:-2,1:-1], p[1:-1,2:,1:-1], p[1:-1,1:-1,:-2], p[1:-1,1:-1,2:]]


def closing(a, iterations=1):
    assert iterations == 1
    return np.logical_and.reduce(neighbours(np.logical_or.reduce(neighbours(a))))


class CapsuleExclusionTests(unittest.TestCase):
    def test_adopted_build_explicitly_preserves_historical_baseline(self):
        path=Path(__file__).resolve().parents[1]/'scripts/build_bigbrain_practical_seg.py'
        tree=ast.parse(path.read_text(encoding='utf-8'))
        main=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='main')
        calls=[n for n in ast.walk(main) if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=='atlas_white_matter_candidates']
        self.assertEqual(len(calls),1)
        option=next(k for k in calls[0].keywords if k.arg=='preserve_nuclear_exclusions')
        self.assertIs(ast.literal_eval(option.value),False)

    def test_unsupported_grids_fail_before_morphology(self):
        atlas=np.zeros((9,9,9),dtype=np.uint8)
        wm=np.ones(atlas.shape)
        for mode in ('anisotropic','shear','permuted','nonfinite','wrong-row'):
            affine=np.eye(4)
            if mode=='anisotropic': affine[0,0]=0.5
            if mode=='shear': affine[0,1]=0.1
            if mode=='permuted': affine[:2,:2]=[[0,1],[1,0]]
            if mode=='nonfinite': affine[0,3]=np.nan
            if mode=='wrong-row': affine[3,0]=1
            with self.subTest(mode=mode), patch.dict(sys.modules,{'scipy':types.SimpleNamespace(ndimage=None)}):
                with self.assertRaisesRegex(ValueError,'affine|axis-aligned'):
                    atlas_white_matter_candidates(atlas,wm,affine)

    def test_morphology_would_refill_an_isolated_hole(self):
        mask = np.ones((9,9,9), dtype=bool)
        mask[4,4,4] = False
        self.assertTrue(closing(mask)[4,4,4])

    def test_each_neighbouring_nucleus_is_excluded_after_closing(self):
        # Test every source-atlas ID used by the generator, on both hemispheres.
        for side in (-1, 1):
            for label in (100,49,91,40,72,21,78,27):
                with self.subTest(side=side, label=label):
                    atlas = np.zeros((9,9,9), dtype=np.uint8)
                    atlas[4,4,4] = label
                    wm = np.ones(atlas.shape, dtype=np.float32)
                    affine = np.eye(4)
                    affine[0,0] = side
                    affine[0,3] = side*10
                    fake = types.SimpleNamespace(
                        binary_closing=closing,
                        distance_transform_edt=lambda a: np.zeros(a.shape),
                        label=lambda a: (a.astype(int), 1 if a.any() else 0))
                    with patch.dict(sys.modules, {'scipy':types.SimpleNamespace(ndimage=fake)}):
                        _, left, right = atlas_white_matter_candidates(atlas, wm, affine)
                        _, old_left, old_right = atlas_white_matter_candidates(atlas, wm, affine, preserve_nuclear_exclusions=False)
                    self.assertTrue(old_left[4,4,4] or old_right[4,4,4])
                    self.assertFalse(left[4,4,4] or right[4,4,4])
                    selected, opposite = (left,right) if side < 0 else (right,left)
                    self.assertTrue(selected[4,4,3])
                    self.assertFalse(opposite.any())
                    self.assertEqual(atlas[4,4,4], label)


if __name__ == '__main__':
    unittest.main()
