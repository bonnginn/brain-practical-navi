"""Synthetic per-Y scaling and bounded-read tests; no production source reads."""
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import h5py
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from read_native100_crop import read_crop


class Native100CropTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(dir=ROOT/'work')
        self.file=h5py.File(Path(self.temp.name)/'synthetic.mnc','w')
        self.group=self.file.create_group('minc-2.0/image/0')
        self.raw=np.arange(4*3*5,dtype=np.uint16).reshape((4,3,5))*1000
        image=self.group.create_dataset('image',data=self.raw)
        image.attrs['dimorder']='yspace,zspace,xspace';image.attrs['valid_range']=[0.,65535.]
        for name,values in [('image-min',[0,100,500,700]),('image-max',[65535,10000,500,20000])]:
            scale=self.group.create_dataset(name,data=values,dtype='float64');scale.attrs['dimorder']='yspace'
        dimensions=self.file.create_group('minc-2.0/dimensions')
        for i,(axis,length) in enumerate(zip('xyz',[5,4,3])):
            node=dimensions.create_dataset(axis+'space',shape=(),dtype='float64')
            node.attrs.update(start=-10.+i,step=.1,units='mm',length=length,direction_cosines=np.eye(3)[i])

    def tearDown(self):
        self.file.close();self.temp.cleanup()

    def test_unequal_and_constant_scaling_with_exact_bounded_reads(self):
        original=h5py.Dataset.__getitem__;calls=[]
        def bounded(dataset,key):
            calls.append((dataset.name,key))
            return original(dataset,key)
        with patch.object(h5py.Dataset,'__getitem__',bounded):
            data,start,step,meta=read_crop(self.group,[1,1,1],[4,3,3])
        self.assertEqual(calls,[('/minc-2.0/image/0/image-min',slice(1,3)),
            ('/minc-2.0/image/0/image-max',slice(1,3)),
            ('/minc-2.0/image/0/image',(slice(1,3),slice(1,3),slice(1,4)))])
        expected=self.raw[1:3,1:3,1:4].astype(float)
        expected[0]=expected[0]/65535*9900+100;expected[1]=500
        np.testing.assert_allclose(data,expected.transpose(2,0,1))
        self.assertEqual(data.dtype,np.float64)
        np.testing.assert_equal(start,[-10,-9,-8]);np.testing.assert_equal(step,[.1]*3)
        self.assertFalse(meta['inverted']);self.assertFalse(meta['mutation'])

    def test_invalid_geometry_and_ranges_before_image_read(self):
        for kind in ['anisotropy','axis','length','valid','order','scaleorder']:
            with self.subTest(kind=kind):
                target=self.file['minc-2.0/dimensions/xspace'].attrs
                if kind in ['anisotropy','axis','length']:
                    key={'anisotropy':'step','axis':'direction_cosines','length':'length'}[kind]
                    new={'anisotropy':.2,'axis':[0,1,0],'length':6}[kind]
                else:
                    target=self.group['image-min' if kind=='scaleorder' else 'image'].attrs
                    key='valid_range' if kind=='valid' else 'dimorder'
                    new=[1,65535] if kind=='valid' else 'xspace'
                old=target[key];target[key]=new
                with patch.object(h5py.Dataset,'__getitem__',side_effect=AssertionError('No payload read')),self.assertRaises(ValueError):
                    read_crop(self.group,[1,1,1],[4,3,3])
                target[key]=old

    def test_bad_scaling(self):
        for value in [-1,float('nan'),float('inf')]:
            self.group['image-max'][1]=value
            with self.subTest(value=value),self.assertRaises(ValueError):
                read_crop(self.group,[1,1,1],[4,3,3])

    def test_bounds_and_limit_before_any_payload_read(self):
        with patch.object(h5py.Dataset,'__getitem__',side_effect=AssertionError('No payload read')):
            for low,high,limit in [([-1,0,0],[1,1,1],100),([0,0,0],[6,1,1],100),
                    ([0,0,0],[0,1,1],100),([0.,0,0],[1,1,1],100),([0,0,0],[5,4,3],10)]:
                with self.subTest(low=low,high=high),self.assertRaises(ValueError):
                    read_crop(self.group,low,high,limit)


if __name__=='__main__':unittest.main()
