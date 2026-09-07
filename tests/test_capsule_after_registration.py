import sys,unittest,hashlib
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import audit_capsule_after_registration as a

class CapsuleReview(unittest.TestCase):
    def test_explicit_development_target_is_pinned_and_unchanged(self):
        target=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
        expected='2983ac84a194043b0f974a6ee93fd34e74efce94d7c58c66e69f34f1475a7ef3'
        r=a.inspect(target,expected)
        self.assertEqual(r['inputSha256'],expected)
        self.assertEqual([(i['stillCapsule'],i['nowManual']) for i in r['items']],[(711,145),(684,76)])
        self.assertEqual(hashlib.sha256(target.read_bytes()).hexdigest(),expected)
        with self.assertRaisesRegex(ValueError,'Wrong version'):a.inspect(target,'0'*64)
    def test_read_only_current_classification(self):
        before=hashlib.sha256(a.TARGET.read_bytes()).hexdigest()
        r=a.inspect()
        self.assertEqual([(i['stillCapsule'],i['nowManual']) for i in r['items']],[(711,145),(684,76)])
        self.assertFalse(r['adopted']);self.assertFalse(r['mutation'])
        self.assertEqual(before,hashlib.sha256(a.TARGET.read_bytes()).hexdigest())
    def test_wrong_current_version_fails_closed(self):
        with patch.object(a,'FINAL_SHA','0'*64):
            with self.assertRaisesRegex(ValueError,'Wrong version'):a.inspect()
