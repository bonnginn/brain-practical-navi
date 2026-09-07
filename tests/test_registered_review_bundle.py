import hashlib
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_registered_review_bundle import verify_sheets


class ReviewBundleTests(unittest.TestCase):
    def test_integrity_counts_and_duplicate_missing_changed_rejection(self):
        with tempfile.TemporaryDirectory() as directory:
            folder=Path(directory);(folder/'a.png').write_bytes(b'fixture')
            sheet=dict(file='a.png',sha256=hashlib.sha256(b'fixture').hexdigest(),planes=[['x',1],['y',2]])
            self.assertEqual(verify_sheets(folder,[dict(sheets=[sheet])]),(1,2))
            for sheets in ([sheet,sheet],[dict(sheet,file='missing.png')],[dict(sheet,sha256='0'*64)],[dict(sheet,planes=[])],[dict(sheet,file='../escape.png')]):
                with self.assertRaises(ValueError): verify_sheets(folder,[dict(sheets=sheets)])


if __name__=='__main__':unittest.main()
