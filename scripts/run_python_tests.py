"""Run portable tests and explicitly report absent local image-review evidence."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tests'))
from local_evidence_case import call_with_local_evidence_policy


def configure(suite):
    for test in suite:
        if isinstance(test, unittest.TestSuite):
            configure(test)
        else:
            call = test._callTestMethod
            test._callTestMethod = lambda method, test=test, call=call: call_with_local_evidence_policy(test, call, method)


if __name__ == '__main__':
    (ROOT/'work').mkdir(exist_ok=True)
    suite = unittest.defaultTestLoader.discover(str(ROOT/'tests'), pattern='test_*.py')
    configure(suite)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    sys.exit(not result.wasSuccessful())
