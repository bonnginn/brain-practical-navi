"""Installation guards, not anatomical validity tests."""
import copy
import json
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from install_inferior_outer40_repair import validate_impact


class Outer40InstallTests(unittest.TestCase):
    def test_exact_unchanged_mesh_matrix(self):
        impact=json.loads((ROOT/'work/anatomy-review/inferior-horn-outer40-meshes-v1/report.json').read_text())
        manifest=json.loads((ROOT/'public/atlas/specimen-blocks.json').read_text(encoding='utf-8'))
        validate_impact(impact,manifest)
        for kind in ['missing','duplicate','unknown','changed','input','output','blocked']:
            bad=copy.deepcopy(impact)
            if kind=='missing':bad['blockMaskImpact'].pop()
            if kind=='duplicate':bad['blockMaskImpact'][-1]=bad['blockMaskImpact'][0]
            if kind=='unknown':bad['blockMaskImpact'][0]['part']='unknown'
            if kind=='changed':bad['blockMaskImpact'][0]['changedMaskVoxels']=1
            if kind in ('input','output'):bad[kind+'Sha256']='wrong'
            if kind=='blocked':bad['installationBlocked']=True
            with self.subTest(kind=kind),self.assertRaises(ValueError):validate_impact(bad,manifest)


if __name__=='__main__':unittest.main()
