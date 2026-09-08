import base64
import importlib.util
from pathlib import Path
import unittest
import zlib
import gzip
import struct
import json
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('brodmann_builder',ROOT/'scripts/build_brodmann_surface.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)

def fixture(values, table):
    encoded=base64.b64encode(zlib.compress(np.array(values,dtype='<i4').tobytes())).decode()
    labels=''.join(f'<Label Key="{key}" Red="1" Green="0" Blue="0">{name}</Label>' for key,name in table.items())
    return f'''<GIFTI><LabelTable>{labels}</LabelTable><DataArray Intent="NIFTI_INTENT_LABEL" DataType="NIFTI_TYPE_INT32" Dimensionality="1" Dim0="{len(values)}" Encoding="GZipBase64Binary" Endian="LittleEndian"><MetaData><MD><Name>Name</Name><Value>Brodmann - BOTH (from colin RIGHT)</Value></MD></MetaData><Data>{encoded}</Data></DataArray></GIFTI>'''.encode()

class BrodmannConversionTests(unittest.TestCase):
    def test_duplicate_source_colours_do_not_merge_distinct_numbers(self):
        labels,_,counts=builder.extract_brodmann(fixture([7,67,7,0,64],{7:'Brodmann.3',67:'Brodmann.33',0:'???',64:'MEDIAL.WALL'}))
        np.testing.assert_array_equal(labels,[3,33,3,0,0])
        self.assertEqual(counts,{'3':2,'33':1})

    def test_unknown_source_labels_are_not_assigned_an_invented_number(self):
        with self.assertRaisesRegex(ValueError,'Unknown label'):
            builder.extract_brodmann(fixture([9],{9:'other-atlas'}))

    def test_wrong_mesh_format_is_rejected(self):
        with self.assertRaisesRegex(ValueError,'triangular'):
            builder.read_surface(b'BNM3')

    @unittest.skipUnless((ROOT/'work/brodmann-source/rh.inflated').exists(),'original FreeSurfer inputs are local-only')
    def test_downloaded_inputs_reproduce_every_distributed_byte(self):
        assets,_=builder.build()
        for name,data in assets.items():
            self.assertEqual(data,(ROOT/'public/atlas'/name).read_bytes(),name)

    @unittest.skipUnless((ROOT/'work/brodmann-source/rh.inflated').exists(),'original FreeSurfer inputs are local-only')
    def test_compact_coordinates_are_within_error_bound_and_faces_labels_unchanged(self):
        for hemi,side in [('lh','left'),('rh','right')]:
            labels,_,_=builder.extract_brodmann((builder.SOURCE/f'{hemi}.PALS_B12.labels.gii').read_bytes())
            for shape,suffix in [('pial',''),('inflated','-inflated')]:
                xyz,faces=builder.read_surface((builder.SOURCE/f'{hemi}.{shape}').read_bytes())
                raw=gzip.decompress((builder.OUTPUT/f'brodmann-{side}{suffix}.mesh.gz').read_bytes())
                nv,nf,scale=struct.unpack_from('<2If',raw,4)
                self.assertEqual((nv,nf),(len(xyz),len(faces)))
                decoded=(np.frombuffer(raw,dtype='<i2',count=nv*3,offset=16).astype(np.float32)*scale).reshape(-1,3)
                report=json.loads((builder.OUTPUT/'brodmann-surface.json').read_text())
                info=report['hemispheres'][side]
                transform=(info if shape=='pial' else info['inflated'])['displayTransform']
                expected=(xyz*transform['scale']+transform['translationXYZ'])[:,[2,1,0]]
                self.assertLessEqual(float(np.max(np.abs(decoded-expected))),0.00502)
                np.testing.assert_array_equal(np.frombuffer(raw,dtype='u1',count=nv,offset=16+nv*10),labels)
                offset=((16+nv*11+3)//4)*4
                np.testing.assert_array_equal(np.frombuffer(raw,dtype='<u4',offset=offset).reshape(-1,3),faces)

if __name__=='__main__':unittest.main()
