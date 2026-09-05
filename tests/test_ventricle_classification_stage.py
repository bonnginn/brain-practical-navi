"""Exact new classification stage against the unchanged distributed baseline."""
import hashlib
import sys
import unittest
from unittest.mock import patch as mock_patch
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import build_bigbrain_practical_seg as b
from apply_segmentation_patch import read_volume,validate_patch


class VentricleClassificationTests(unittest.TestCase):
    def test_report_path_failure_after_valid_edits_leaves_volume_unchanged(self):
        source=b.ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz'
        dims,payload=read_volume(source)
        volume=np.frombuffer(bytes(payload),dtype=np.uint8).reshape(dims,order='F').copy()
        record=b.ROOT/'segmentation-patches/review/ventricle-classification-project-review-2026-09-06.json'
        validated=validate_patch(record,dims,len(payload),payload,hashlib.sha256(source.read_bytes()).hexdigest())
        with mock_patch.object(b,'validate_patch',return_value=validated):
            with self.assertRaises(ValueError):
                b.apply_approved_ventricle_classification_patch(volume,b.ROOT.parent/'outside-review.json')
        self.assertEqual(hashlib.sha256(volume.tobytes(order='F')).hexdigest(),b.AQUEDUCT_SOURCE_LABELS_SHA256)

    def test_actual_project_record_exact_edits_and_restore(self):
        source=b.ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz'
        dims,payload=read_volume(source)
        volume=np.frombuffer(bytes(payload),dtype=np.uint8).reshape(dims,order='F').copy()
        path=b.ROOT/'segmentation-patches/review/ventricle-classification-project-review-2026-09-06.json'
        patch,edits,_=validate_patch(path,dims,len(payload),payload,hashlib.sha256(source.read_bytes()).hexdigest())
        self.assertIn('専門家レビューでもない',patch['review']['reason'])
        audit=b.apply_approved_ventricle_classification_patch(volume,path)
        flat=volume.ravel(order='F');before=np.frombuffer(payload,dtype=np.uint8)
        self.assertEqual(np.flatnonzero(flat!=before).tolist(),sorted(i for i,_ in edits))
        self.assertEqual(int(np.count_nonzero(flat==26)),8520)
        self.assertEqual(int(np.count_nonzero(flat==41)),16)
        self.assertEqual(hashlib.sha256(flat.tobytes()).hexdigest(),'261beb616856653d4d7acd2d411a98f1435eb6beab8b91a2b8ac7b5642909d18')
        self.assertEqual(audit['transitions'],{'26->0':31,'26->41':16})
        self.assertEqual(volume[193,195,114],26)
        for i,_ in edits:flat[i]=26
        np.testing.assert_array_equal(flat,before)


if __name__=='__main__':unittest.main()
