"""Coordinate regression tests, not anatomical approval of the trial."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from render_inferior_horn_core_draft import draft_points


class DraftTests(unittest.TestCase):
    def test_explicit_triangle_and_planes(self):
        actual=set(map(tuple,draft_points()))
        expected={(x,y,z) for y in range(315,320)
                  for z,xs in [(232,range(443,448)),(233,range(444,447)),(234,[445])]
                  for x in xs}
        self.assertEqual(actual,expected)
        self.assertEqual(len(draft_points()),45)

    def test_revision_does_not_mutate_original(self):
        original=draft_points()
        revised=draft_points();revised[:,2]-=2
        self.assertEqual(original[:,2].min(),232)
        self.assertEqual(revised[:,2].min(),230)
        self.assertTrue((original[:,:2]==revised[:,:2]).all())


if __name__=='__main__':unittest.main()
