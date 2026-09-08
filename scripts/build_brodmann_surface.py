"""Build a separate fsaverage/PALS-B12 observation atlas; never relabel MNI meshes.

Requires only numpy. Read the original GIFTI indices rather than .annot RGB IDs:
different BA labels can share a source colour (notably BA3/BA33).
"""
import argparse
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import struct
import xml.etree.ElementTree as ET
import zlib

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'work/brodmann-source'
OUTPUT = ROOT / 'public/atlas'
BASE = 'https://www.freesurfer.net/pub/dist/freesurfer/tutorial_versions_centos6/freesurfer/subjects/fsaverage'
PIN = ROOT / 'scripts/brodmann-source-lock.json'
sha = lambda value: hashlib.sha256(value).hexdigest()


def extract_brodmann(raw):
    root = ET.fromstring(raw)
    arrays = []
    for array in root.findall('DataArray'):
        metadata = {m.findtext('Name'): m.findtext('Value') for m in array.findall('./MetaData/MD')}
        if metadata.get('Name', '').startswith('Brodmann - BOTH '):
            arrays.append((array, metadata))
    if len(arrays) != 1:
        raise ValueError('Expected exactly one Brodmann map')
    array, metadata = arrays[0]
    expected = {'Intent': 'NIFTI_INTENT_LABEL', 'DataType': 'NIFTI_TYPE_INT32', 'Dimensionality': '1',
                'Encoding': 'GZipBase64Binary', 'Endian': 'LittleEndian'}
    if any(array.get(key) != value for key, value in expected.items()):
        raise ValueError('Unsupported label encoding')
    values = np.frombuffer(zlib.decompress(base64.b64decode(array.findtext('Data'))), dtype='<i4')
    if len(values) != int(array.get('Dim0')):
        raise ValueError('Label count mismatch')
    table = {int(label.get('Key')): label.text for label in root.findall('./LabelTable/Label')}
    labels = np.zeros(len(values), dtype=np.uint8)
    counts = {}
    for source_id in np.unique(values):
        name = table.get(int(source_id))
        match = re.fullmatch(r'Brodmann\.(\d+)', name or '')
        if match:
            ba = int(match[1])
            if not 1 <= ba <= 52:
                raise ValueError('Unexpected Brodmann number')
            labels[values == source_id] = ba
            counts[str(ba)] = int(np.count_nonzero(values == source_id))
        elif name not in ('???', 'MEDIAL.WALL'):
            raise ValueError(f'Unknown label in Brodmann map: {source_id} {name}')
    return labels, metadata, counts


def read_surface(raw):
    if raw[:3] != b'\xff\xff\xfe':
        raise ValueError('Expected FreeSurfer triangular surface')
    offset = raw.index(b'\n', raw.index(b'\n', 3) + 1) + 1
    nv, nf = struct.unpack_from('>2i', raw, offset)
    if nv != 163842 or nf != 327680:
        raise ValueError('Unexpected fsaverage topology')
    xyz = np.frombuffer(raw, dtype='>f4', count=nv * 3, offset=offset + 8).reshape(-1, 3).astype(np.float64)
    faces = np.frombuffer(raw, dtype='>i4', count=nf * 3, offset=offset + 8 + nv * 12).reshape(-1, 3).astype(np.int64)
    if not np.isfinite(xyz).all() or faces.min() < 0 or faces.max() >= nv:
        raise ValueError('Invalid surface coordinates or faces')
    return xyz, faces


def read_sulc(raw, count):
    if raw[:3] != b'\xff\xff\xff':
        raise ValueError('Expected FreeSurfer new curvature format')
    nv, _, components = struct.unpack_from('>3i', raw, 3)
    if nv != count or components != 1 or len(raw) != 15 + count * 4:
        raise ValueError('Sulcal depth count mismatch')
    values = np.frombuffer(raw, dtype='>f4', offset=15).astype(np.float64)
    if not np.isfinite(values).all():
        raise ValueError('Nonfinite sulcal depth')
    scale = max(float(np.percentile(values[values > 0], 96)), 0.001)
    return (1 - 0.56 * np.clip(values / scale, 0, 1)).astype('<f4')


def make_mesh(xyz, faces, labels, shade, display_scale=1.0, display_translation=(0, 18, -18)):
    if len(labels) != len(xyz) or len(shade) != len(xyz):
        raise ValueError('Vertex annotation mismatch')
    normals = np.zeros_like(xyz)
    face_normals = np.cross(xyz[faces[:, 1]] - xyz[faces[:, 0]], xyz[faces[:, 2]] - xyz[faces[:, 0]])
    for corner in range(3):
        np.add.at(normals, faces[:, corner], face_normals)
    norm = np.linalg.norm(normals, axis=1)
    if np.any(norm == 0):
        raise ValueError('Degenerate vertex normals')
    normals /= norm[:, None]
    # Match the viewer's storage convention. This is display centering only;
    # it does not register fsaverage to MNI152, BigBrain or a specimen.
    stored = (xyz * display_scale + display_translation)[:, [2, 1, 0]].astype('<f4')
    quantized = np.rint(stored.astype(np.float64) * 100)
    if np.any(np.abs(quantized) > 32767):
        raise ValueError('Coordinates exceed compact display range')
    if np.any(labels != labels.astype(np.uint8)) or not np.isfinite(shade).all() or np.any((shade < 0) | (shade > 1)):
        raise ValueError('Invalid compact labels or shading')
    packed = (b'BNM4' + struct.pack('<2If', len(xyz), len(faces), 0.01)
              + quantized.astype('<i2').tobytes()
              + np.rint(normals[:, [2, 1, 0]] * 127).astype('i1').tobytes()
              + np.rint(shade * 255).astype('u1').tobytes() + labels.astype('u1').tobytes())
    return packed + bytes((-len(packed)) % 4) + faces.astype('<u4').tobytes()


def source_record():
    files = {}
    for hemi in ('lh', 'rh'):
        for name, sub in ((f'{hemi}.PALS_B12.labels.gii', 'label'), (f'{hemi}.pial', 'surf'), (f'{hemi}.inflated', 'surf'), (f'{hemi}.sulc', 'surf')):
            raw = (SOURCE / name).read_bytes()
            files[name] = {'url': f'{BASE}/{sub}/{name}', 'sha256': sha(raw), 'bytes': len(raw)}
    raw = (SOURCE / 'FreeSurferSoftwareLicense.raw.txt').read_bytes()
    files['FreeSurferSoftwareLicense.raw.txt'] = {'url': 'https://surfer.nmr.mgh.harvard.edu/fswiki/FreeSurferSoftwareLicense?action=raw', 'sha256': sha(raw), 'bytes': len(raw)}
    return {'version': 1, 'retrieved': '2026-09-08', 'files': files}


def build():
    pinned = json.loads(PIN.read_text(encoding='utf-8'))
    actual = source_record()
    if actual != pinned:
        raise ValueError('Source identity differs from reviewed download lock')
    report = {'version': 1, 'atlas': 'PALS-B12 Brodmann on fsaverage', 'sourceSpace': 'fsaverage',
              'sourceUrl': 'https://surfer.nmr.mgh.harvard.edu/fswiki/PALS_B12',
              'sourceLockSha256': sha(PIN.read_bytes()), 'expertReview': 'pending',
              'method': 'Original GIFTI vertex indices on paired fsaverage pial and inflated meshes; BA numbers parsed from label names; no label resampling, dilation, filling or boundary editing. Display-only transforms recorded per surface, stored ZYX; sulc used for shading. Inflated hemispheres are separated and uniformly scaled to fit the viewer; not registration or anatomical spacing.',
              'encoding': {'format': 'BNM4', 'coordinateStepMm': 0.01, 'maximumCoordinateErrorMm': 0.00502, 'normals': 'signed int8, normalized after decoding', 'shade': 'uint8 / 255', 'labels': 'exact uint8 BA numbers', 'faces': 'original uint32 indices; no decimation'},
              'limitation': 'Historical map aligned by sulcal/gyral landmarks, originating from Colin right and mapped to both hemispheres. Not individually measured cytoarchitectonic boundaries or a BigBrain segmentation.',
              'hemispheres': {}, 'references': ['https://doi.org/10.1016/j.neuroimage.2005.06.058', 'https://surfer.nmr.mgh.harvard.edu/fswiki/PALS_B12'],
              'licence': 'FreeSurfer Software License Agreement 1.0; retain PALS-B12 / Van Essen attribution',
              'notice': 'BRODMANN-FREESURFER-NOTICE.txt'}
    results = {}
    for hemi, side in (('lh', 'left'), ('rh', 'right')):
        labels, metadata, counts = extract_brodmann((SOURCE / f'{hemi}.PALS_B12.labels.gii').read_bytes())
        xyz, faces = read_surface((SOURCE / f'{hemi}.pial').read_bytes())
        if (side == 'left' and np.median(xyz[:, 0]) >= 0) or (side == 'right' and np.median(xyz[:, 0]) <= 0):
            raise ValueError('Hemisphere mismatch')
        raw = make_mesh(xyz, faces, labels, read_sulc((SOURCE / f'{hemi}.sulc').read_bytes(), len(xyz)))
        filename = f'brodmann-{side}.mesh.gz'
        results[filename] = gzip.compress(raw, compresslevel=9, mtime=0)
        report['hemispheres'][side] = {'vertices': len(xyz), 'faces': len(faces), 'counts': counts,
                                     'unlabelledVertices': int(np.count_nonzero(labels == 0)),
                                     'sourceMapName': metadata['Name'], 'sourceMapDescription': metadata['Description'],
                                     'displayTransform': {'scale': 1, 'translationXYZ': [0, 18, -18]},
                                     'mesh': filename, 'sha256': sha(results[filename]), 'rawSha256': sha(raw)}
        inflated_xyz, inflated_faces = read_surface((SOURCE / f'{hemi}.inflated').read_bytes())
        if not np.array_equal(faces, inflated_faces):
            raise ValueError('Inflated surface has different vertex topology')
        # FreeSurfer's inflated hemispheres are each centred at zero. Separate
        # them for paired views instead of superimposing them as if registered.
        inflated_translation = [-36 if side == 'left' else 36, 0, -16]
        inflated = make_mesh(inflated_xyz, inflated_faces, labels, read_sulc((SOURCE / f'{hemi}.sulc').read_bytes(), len(xyz)), 0.8, inflated_translation)
        inflated_name = f'brodmann-{side}-inflated.mesh.gz'
        results[inflated_name] = gzip.compress(inflated, compresslevel=9, mtime=0)
        report['hemispheres'][side]['inflated'] = {'displayTransform': {'scale': 0.8, 'translationXYZ': inflated_translation}, 'mesh': inflated_name, 'sha256': sha(results[inflated_name]), 'rawSha256': sha(inflated)}
    report['areaNumbers'] = sorted(set(map(int, report['hemispheres']['left']['counts'])) | set(map(int, report['hemispheres']['right']['counts'])))
    results['brodmann-surface.json'] = (json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    license_text = (SOURCE / 'FreeSurferSoftwareLicense.raw.txt').read_text(encoding='utf-8')
    # Keep the complete applicable download agreement, with the required preface.
    part_b = license_text[license_text.index('== PART B.'):].replace('!FreeSurfer', 'FreeSurfer')
    notice = ('MODIFIED DATA: PALS-B12 Brodmann maps on fsaverage, converted to BNM4 and gzip for Brain Practical Navigator.\n'
              'All vertices, face indices and BA labels retained; display coordinates rounded to 0.01 mm, normals to int8, sulcal shading to uint8.\n'
              'Inflated hemispheres are uniformly scaled and separated for display; spacing is not anatomical registration.\n'
              'Original maps: David C. Van Essen and the Van Essen Laboratory; fsaverage distribution: FreeSurfer / MGH.\n'
              'Reference: Van Essen DC (2005), NeuroImage 28:635-662, doi:10.1016/j.neuroimage.2005.06.058.\n'
              'Source: https://surfer.nmr.mgh.harvard.edu/fswiki/PALS_B12\n'
              'Boundaries are atlas-transferred teaching references; not subject-specific cytoarchitectonic measurements.\n\n'
              'All or portions of this licensed product (such portions are the "Software") have been obtained under license from The General Hospital Corporation and are subject to the following terms and conditions:\n\n' + part_b)
    results['BRODMANN-FREESURFER-NOTICE.txt'] = notice.encode('utf-8')
    return results, report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--record-inputs', action='store_true')
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    if args.record_inputs:
        if PIN.exists():
            raise ValueError('Refuse to replace the existing source lock')
        PIN.write_text(json.dumps(source_record(), indent=2) + '\n', encoding='utf-8')
    assets, report = build()
    if args.write:
        for name, data in assets.items():
            (OUTPUT / name).write_bytes(data)
    print(json.dumps({'written': args.write, 'areas': report['areaNumbers'], 'assets': {name: len(data) for name, data in assets.items()}}, indent=2))
