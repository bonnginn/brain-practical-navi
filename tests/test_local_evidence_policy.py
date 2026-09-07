import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import local_evidence_case as policy


class EvidencePolicyTests(unittest.TestCase):
    def test_absent_external_evidence_is_explicitly_skipped(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)/'absent-evidence'
            with patch.object(policy,'EVIDENCE_ROOT',root):
                with self.assertRaises(unittest.SkipTest):
                    policy.call_with_local_evidence_policy(self,lambda method:(root/'report.json').read_bytes(),None)

    def test_missing_committed_fixture_still_fails(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            with patch.object(policy,'EVIDENCE_ROOT',root/'absent-evidence'):
                with self.assertRaises(FileNotFoundError):
                    policy.call_with_local_evidence_policy(self,lambda method:(root/'fixture.json').read_bytes(),None)

    def test_incomplete_local_evidence_still_fails(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            with patch.object(policy,'EVIDENCE_ROOT',root):
                with self.assertRaises(FileNotFoundError):
                    policy.call_with_local_evidence_policy(self,lambda method:(root/'report.json').read_bytes(),None)

    def test_assertion_is_never_hidden(self):
        def fail(method): raise AssertionError('real regression')
        with self.assertRaisesRegex(AssertionError,'real regression'):
            policy.call_with_local_evidence_policy(self,fail,None)
