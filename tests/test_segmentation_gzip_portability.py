import gzip
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import adopt_registered_red_nuclei as encoder


class GzipPortabilityTests(unittest.TestCase):
    def test_os_header_is_neutral_without_changing_voxels(self):
        volume=np.arange(24,dtype=np.uint8).reshape(2,3,4)
        expected=encoder.encode(volume)
        original=gzip.compress
        def linux_header(*args,**kwargs):
            data=original(*args,**kwargs)
            return data[:9]+b'\x03'+data[10:]
        with patch.object(encoder.gzip,'compress',linux_header):
            actual=encoder.encode(volume)
        self.assertEqual(actual,expected)
        self.assertEqual(actual[9],255)
        self.assertEqual(gzip.decompress(actual)[10:],volume.tobytes(order='F'))
