import sys,unittest
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import build_specimen_blocks as b
from build_orthogonal_review_bundle import read_browser_volume,MAGIC_LABELS
class SpecimenAxisContract(unittest.TestCase):
    def test_real_review_xyz_converts_to_specimen_zyx(self):
        path=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-islands-8238.bin.gz'
        _,_,xyz=read_browser_volume(path,MAGIC_LABELS,'82384fa6961b4eb6aa272aa556f76febd4027cf1f67937504ee227ac0a8e4726')
        zyx,dims=b.read_volume(path,MAGIC_LABELS)
        self.assertEqual(xyz.shape,tuple(dims));self.assertEqual(zyx.shape,tuple(reversed(dims)))
        np.testing.assert_array_equal(xyz.transpose(2,1,0)[::2,::2,::2],zyx[::2,::2,::2])
    def test_stage_call_sites_explicitly_convert_xyz_to_zyx(self):
        for file in ('prepare_brainstem_paired_adoption.py','prepare_brainstem_three_adoption.py','prepare_cerebellar_island_adoption.py'):
            code=(ROOT/'scripts'/file).read_text(encoding='utf-8')
            self.assertIn('tissue_zyx=raw.transpose(2,1,0)[::2,::2,::2]',code)
            self.assertIn('b.specimen_definitions(tissue_zyx,labels.transpose(2,1,0)[::2,::2,::2])',code)
            self.assertIn('b.specimen_definitions(tissue_zyx,result.transpose(2,1,0)[::2,::2,::2])',code)
