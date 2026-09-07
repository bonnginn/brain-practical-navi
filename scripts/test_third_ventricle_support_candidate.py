"""Selection regression, not an anatomical validation."""
import unittest
from prepare_third_ventricle_support_candidate import eligible, seed_component


class SelectionTest(unittest.TestCase):
    def record(self, **changes):
        return dict(dict(before=0, after=25, supportCornerMinimum=65535,
                         bracketedBy25=True, noOtherLabelBetween=True), **changes)

    def test_missing_bracket_does_not_create_artificial_gap(self):
        self.assertTrue(eligible(self.record()))
        self.assertTrue(eligible(self.record(bracketedBy25=False, noOtherLabelBetween=False)))

    def test_tissue_support_still_required(self):
        self.assertFalse(eligible(self.record(supportCornerMinimum=64999)))

    def test_known_intervening_structure_vetoes(self):
        self.assertFalse(eligible(self.record(noOtherLabelBetween=False)))

    def test_only_background_to_third_ventricle(self):
        self.assertFalse(eligible(self.record(before=23)))
        self.assertFalse(eligible(self.record(after=24)))

    def test_seed_not_largest_component_and_no_diagonal_join(self):
        points = [[0,0,0], [1,0,0], [2,0,0], [5,5,5], [6,6,6]]
        self.assertEqual(seed_component(points, [5,5,5]).tolist(), [False,False,False,True,False])

    def test_missing_seed_rejected(self):
        with self.assertRaises(ValueError):
            seed_component([[0,0,0], [2,2,2]], [1,1,1])


if __name__ == '__main__':
    unittest.main()
