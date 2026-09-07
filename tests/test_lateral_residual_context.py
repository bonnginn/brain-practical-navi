"""Source, component and sparse-figure integrity, not anatomical validation."""
import gzip
import hashlib
import json
import unittest
from pathlib import Path
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]


class ResidualContextTests(unittest.TestCase):
    def test_exact_full_components_and_figures(self):
        folder = ROOT/'work/anatomy-review/lateral-residual116-80-context-v1'
        report = json.loads((folder/'report.json').read_text())
        # Retained 7d2b stage, not a mutable future development baseline.
        compressed = (ROOT/'work/anatomy-review/lateral-detached547-stage-v1/labels.bin.gz').read_bytes()
        self.assertEqual(hashlib.sha256(compressed).hexdigest(), report['labelsSha256'])
        labels = np.frombuffer(gzip.decompress(compressed), np.uint8, offset=10).reshape((394, 466, 378), order='F')
        cc, _ = ndimage.label(labels == 24, ndimage.generate_binary_structure(3, 3))
        self.assertFalse(report['mutation']); self.assertFalse(report['adopted'])
        self.assertEqual([r['count'] for r in report['components']], [116, 80])
        for item in report['components']:
            ident = cc[tuple(item['seed'])]
            self.assertGreater(ident, 0)
            points = np.argwhere(cc == ident)
            self.assertEqual(points.tolist(), item['points'])
            self.assertEqual(len(points), item['count'])
            self.assertIn(item['center'], item['points'])
            self.assertEqual(len(item['figures']), 6)
            self.assertEqual(len({f['path'] for f in item['figures']}), 6)
            for d, axis in enumerate('xyz'):
                frames = [f for f in item['figures'] if f['axis'] == axis]
                self.assertEqual(len(frames), 2)
                local = next(f for f in frames if not f.get('locator'))
                whole = next(f for f in frames if f.get('locator'))
                self.assertEqual(local['indices'], list(range(item['center'][d]-1, item['center'][d]+2)))
                self.assertEqual(whole['index'], item['center'][d])
            for f in item['figures']:
                self.assertEqual(hashlib.sha256((folder/f['path']).read_bytes()).hexdigest(), f['sha256'])


if __name__ == '__main__':
    unittest.main()
