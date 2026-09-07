import sys
import tempfile
import unittest
from pathlib import Path
import h5py
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from inspect_hypothalamus_roi import decode_identity_roi


class NativeRoiDecode(unittest.TestCase):
    def fixture(self, f):
        g = f.create_group('minc-2.0')
        image = g.create_dataset('image/0/image', data=np.arange(24, dtype='uint16').reshape(2, 3, 4))
        image.attrs['dimorder'] = np.bytes_('yspace,zspace,xspace')
        image.attrs['valid_range'] = [0, 65535]
        for name, value in [('image-min', 0), ('image-max', 65535)]:
            d = g.create_dataset('image/0/'+name, data=[value, value])
            d.attrs['dimorder'] = np.bytes_('yspace')
        for axis, name in enumerate(('xspace', 'yspace', 'zspace')):
            d = g.create_group('dimensions/'+name)
            d.attrs['units'] = np.bytes_('mm')
            d.attrs['direction_cosines'] = np.eye(3)[axis]
            d.attrs['start'] = axis*10
            d.attrs['step'] = .1
        return g

    def test_axes_and_voxels(self):
        with tempfile.TemporaryFile() as stream, h5py.File(stream, 'w') as f:
            g = self.fixture(f)
            data, start, step = decode_identity_roi(g)
            self.assertEqual(data.shape, (4, 2, 3))
            self.assertEqual(data[3, 1, 2], 23)
            np.testing.assert_array_equal(data[:, 0, 1], [4, 5, 6, 7])
            np.testing.assert_array_equal(start, [0, 10, 20])
            np.testing.assert_array_equal(step, [.1, .1, .1])

    def test_nonidentity_slice_scaling_rejected(self):
        with tempfile.TemporaryFile() as stream, h5py.File(stream, 'w') as f:
            g = self.fixture(f)
            g['image/0/image-max'][1] = 30000
            with self.assertRaises(ValueError):
                decode_identity_roi(g)

    def test_wrong_layout_or_orientation_rejected(self):
        for wrong in ('layout', 'orientation', 'step'):
            with self.subTest(wrong=wrong), tempfile.TemporaryFile() as stream, h5py.File(stream, 'w') as f:
                g = self.fixture(f)
                if wrong == 'layout':
                    g['image/0/image'].attrs['dimorder'] = np.bytes_('zspace,yspace,xspace')
                elif wrong == 'orientation':
                    g['dimensions/xspace'].attrs['direction_cosines'] = [-1, 0, 0]
                else:
                    g['dimensions/xspace'].attrs['step'] = 0
                with self.assertRaises(ValueError):
                    decode_identity_roi(g)


if __name__ == '__main__':
    unittest.main()
