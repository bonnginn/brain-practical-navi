import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from inventory_current_ventricle_components import inventory


class InventoryTests(unittest.TestCase):
    def test_diagonal_and_isolated_edge(self):
        mask = np.zeros((7, 8, 9), dtype=bool)
        mask[0, 0, 0] = mask[1, 1, 1] = mask[6, 7, 8] = True
        before = mask.copy()
        result = inventory(mask)
        self.assertEqual((result['voxels'], result['components6'], result['components26']), (3, 3, 2))
        self.assertEqual([r['parent26Voxels'] for r in result['records']], [2, 2, 1])
        self.assertEqual(result['records'][-1]['seedXYZ'], [6, 7, 8])
        np.testing.assert_array_equal(mask, before)

    def test_face_connected_and_empty(self):
        mask = np.zeros((4, 5, 6), dtype=bool)
        self.assertEqual(inventory(mask)['records'], [])
        mask[1:3, 2, 3] = True
        result = inventory(mask)
        self.assertEqual(result['components6'], 1)
        self.assertEqual(result['records'][0]['minXYZ'], [1, 2, 3])
        self.assertEqual(result['records'][0]['maxXYZ'], [2, 2, 3])
        self.assertEqual(result['records'][0]['voxels'], 2)


if __name__ == '__main__':
    unittest.main()
