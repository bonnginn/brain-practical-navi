import hashlib
import sys
import tempfile
import unittest
from pathlib import Path
import h5py
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_manual_label_space import load_identity_minc


def fixture(path, *, order=b'zspace,yspace,xspace', real_max=22, step=0.5, rotated=False):
    with h5py.File(path, 'w') as f:
        root = f.create_group('minc-2.0'); root.attrs['history'] = np.bytes_('synthetic unit test')
        g = root.create_group('image/0')
        image = g.create_dataset('image', data=np.arange(8, dtype=np.uint16).reshape(2, 2, 2))
        image.attrs['dimorder'] = np.bytes_(order); image.attrs['valid_range'] = [0., 22.]
        g.create_dataset('image-min', data=0.); g.create_dataset('image-max', data=float(real_max))
        for axis, name in enumerate(('xspace', 'yspace', 'zspace')):
            a = root.create_group('dimensions/'+name).attrs
            a['units'] = np.bytes_('mm'); a['direction_cosines'] = np.eye(3)[(axis+1)%3 if rotated else axis]
            a['start'] = [-98., -134., -72.][axis]; a['step'] = step
    return hashlib.sha256(path.read_bytes()).hexdigest()


class ManualSpaceTests(unittest.TestCase):
    def test_valid_scalar_identity_layout(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'test.mnc'; sha = fixture(path)
            values, start, step, history = load_identity_minc(path, sha)
            np.testing.assert_array_equal(values, np.arange(8).reshape(2, 2, 2).transpose(2, 1, 0))
            np.testing.assert_array_equal(start, [-98., -134., -72.])
            np.testing.assert_array_equal(step, [0.5, 0.5, 0.5])
            self.assertEqual(history, 'synthetic unit test')
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), sha)

    def test_rejects_wrong_identity_layout_and_scaling(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'test.mnc'; sha = fixture(path)
            with self.assertRaises(ValueError): load_identity_minc(path, '0'*64)
            for kwargs in (dict(order=b'xspace,yspace,zspace'), dict(real_max=44), dict(rotated=True)):
                sha = fixture(path, **kwargs)
                with self.assertRaises(ValueError): load_identity_minc(path, sha)

    def test_rejects_nonpositive_and_nonfinite_steps(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'test.mnc'
            for step in (0, -0.5, float('nan')):
                sha = fixture(path, step=step)
                with self.assertRaises(ValueError): load_identity_minc(path, sha)


if __name__ == '__main__': unittest.main()
