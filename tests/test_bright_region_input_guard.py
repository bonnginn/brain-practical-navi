import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import audit_brainstem_bright_regions as audit


class InputGuardTests(unittest.TestCase):
    def test_invalid_override_rejected_before_volume_read(self):
        for value, cerebellum in [('A' * 64, True), ('a' * 63, True), ('g' * 64, True), ('a' * 64, False)]:
            with self.subTest(value=value, cerebellum=cerebellum):
                with patch.object(audit, 'read_browser_volume') as reader:
                    with self.assertRaises(ValueError):
                        audit.main(audit.ROOT / 'work' / 'guard-test-never-created', cerebellum=cerebellum, label_sha=value)
                    reader.assert_not_called()

    def test_valid_override_is_still_hash_checked_by_reader(self):
        digest = 'a' * 64
        with patch.object(audit, 'read_browser_volume', side_effect=ValueError('SHA mismatch')) as reader:
            with self.assertRaisesRegex(ValueError, 'SHA mismatch'):
                audit.main(audit.ROOT / 'work' / 'guard-test-never-created', cerebellum=True, label_sha=digest)
            reader.assert_called_once_with(audit.DEFAULT_LABELS, audit.MAGIC_LABELS, digest)


if __name__ == '__main__':
    unittest.main()
