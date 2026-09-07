"""Run portable tests normally; explicitly report absent local image evidence.

Native source images and generated review figures are intentionally not checked
in. Only their absence in a checkout without the local evidence directory is a
skip. Missing committed fixtures, assertions and incomplete local evidence fail.
"""
from pathlib import Path
import unittest

EVIDENCE_ROOT = Path(__file__).resolve().parents[1] / 'work/anatomy-review'


def call_with_local_evidence_policy(test, call, method):
        local_evidence_absent = not EVIDENCE_ROOT.exists()
        try:
            return call(method)
        except FileNotFoundError as error:
            missing = Path(error.filename).resolve() if error.filename else None
            if local_evidence_absent and missing and missing.is_relative_to(EVIDENCE_ROOT.resolve()):
                test.skipTest('Requires uncommitted native-image review evidence: ' + str(missing.relative_to(EVIDENCE_ROOT.resolve())))
            raise
