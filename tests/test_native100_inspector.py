"""Synthetic metadata and path guards; real download is never accessed."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import h5py
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from inspect_native100_volume import inspect,checked_paths,SOURCE_URL


class Native100InspectorTests(unittest.TestCase):
    def test_metadata_without_loading_any_dataset(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'work') as temporary:
            work=Path(temporary);source=work/'synthetic.mnc';output=work/'report.json'
            with h5py.File(source,'w') as file:
                minc=file.create_group('minc-2.0');minc.attrs['history']=np.bytes_('synthetic history')
                group=minc.create_group('image/0')
                image=group.create_dataset('image',shape=(100000,100000,100000),dtype='uint16',chunks=(8,8,8),compression='gzip')
                image.attrs['dimorder']=np.bytes_('zspace,yspace,xspace')
                image.attrs['valid_range']=[0,65535]
                group.create_dataset('image-min',shape=(100000,),dtype='float64')
                group.create_dataset('image-max',shape=(100000,),dtype='float64').attrs['dimorder']=np.bytes_('zspace')
                dimensions=minc.create_group('dimensions')
                for k,axis in enumerate(['xspace','yspace','zspace']):
                    dimension=dimensions.create_dataset(axis,shape=(),dtype='float64')
                    dimension.attrs.update(start=-k,step=.1,length=100000,direction_cosines=np.eye(3)[k])
            before=source.read_bytes()
            with patch.object(h5py.Dataset,'__getitem__',side_effect=AssertionError('Dataset payload must not be read')):
                report=inspect(source,output,work)
            self.assertEqual(report['observedByteSha256'],hashlib.sha256(before).hexdigest())
            self.assertEqual(report['image']['shape'],[100000]*3)
            self.assertEqual(report['image']['chunks'],[8]*3)
            self.assertEqual(report['image']['compression'],'gzip')
            self.assertEqual(report['dimensionalOrder'],'zspace,yspace,xspace')
            self.assertEqual(report['imageMin']['shape'],[100000])
            self.assertEqual(report['dimensions']['yspace']['attrs']['direction_cosines'],[0,1,0])
            self.assertEqual(report['history'],'synthetic history')
            self.assertEqual(report['sourceUrl'],SOURCE_URL)
            self.assertFalse(report['voxelDataRead']);self.assertFalse(report['mutation'])
            self.assertEqual(json.loads(output.read_text()),report)
            self.assertEqual(source.read_bytes(),before)
            with self.assertRaises(ValueError): inspect(source,output,work)

    def test_path_guards(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'work') as temporary:
            parent=Path(temporary);work=parent/'work';work.mkdir()
            source=work/'input.mnc';source.touch()
            outside=parent/'outside.mnc';outside.touch()
            pending=work/'input.mnc.download';pending.touch()
            existing=work/'existing.json';existing.touch()
            for inp,out in [(outside,work/'report.json'),(source,parent/'report.json'),
                            (source,existing),(source,source),(pending,work/'report.json'),
                            (source,work/'missing/report.json')]:
                with self.subTest(input=inp,output=out),self.assertRaises(ValueError):
                    checked_paths(inp,out,work)


if __name__ == '__main__': unittest.main()
