"""Inspect MINC HDF5 metadata only; no voxel reads, decoding or registration claims."""
import argparse
import hashlib
import json
from pathlib import Path
import h5py
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT/'work'
SOURCE_URL = 'https://ftp.bigbrainproject.org/bigbrain-ftp/BigBrainRelease.2015/3D_Volumes/Histological_Space/mnc/full16_100um_optbal.mnc'


def json_value(value):
    """Preserve unusual byte attributes as hex rather than guess their encoding."""
    if isinstance(value, bytes):
        try:
            return value.decode('utf-8')
        except UnicodeDecodeError:
            return {'bytesHex': value.hex()}
    if isinstance(value, np.ndarray):
        return json_value(value.tolist())
    if isinstance(value, np.generic):
        return json_value(value.item())
    if isinstance(value, (list, tuple)):
        return [json_value(v) for v in value]
    if isinstance(value, float) and not np.isfinite(value):
        return {'nonFiniteFloat': str(value)}
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return {'uninterpretedType': type(value).__name__, 'representation': repr(value)}


def attributes(node):
    return {str(k): json_value(v) for k,v in node.attrs.items()}


def dataset_metadata(dataset):
    if not isinstance(dataset, h5py.Dataset):
        raise ValueError(f'Expected dataset: {dataset.name}')
    return dict(path=dataset.name,shape=list(dataset.shape),dtype=str(dataset.dtype),
                chunks=json_value(dataset.chunks),compression=dataset.compression,
                compressionOptions=json_value(dataset.compression_opts),attrs=attributes(dataset))


def checked_paths(input_path,output_path,work=WORK):
    work=Path(work).resolve(strict=True)
    source=Path(input_path).resolve(strict=True)
    output=Path(output_path).resolve()
    for path in (source,output):
        if path == work or not path.is_relative_to(work):
            raise ValueError('Input and output must be files strictly under work')
    if not source.is_file() or source.suffix.lower() in ('.download','.part','.partial'):
        raise ValueError('Input must be a completed file, not an ongoing download')
    if output.exists() or output == source:
        raise ValueError('Preserve existing output and source')
    if not output.parent.is_dir():
        raise ValueError('Output parent directory must already exist')
    return source,output


def inspect(input_path,output_path,work=WORK):
    source,output=checked_paths(input_path,output_path,work)
    initial=source.stat()
    sha=hashlib.sha256()
    with source.open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):
            sha.update(block)
    with h5py.File(source,'r') as file:
        minc=file['minc-2.0'];group=minc['image/0'];image=group['image']
        image_info=dataset_metadata(image)
        dimensions={name:dict(nodeType=type(node).__name__,attrs=attributes(node))
                    for name,node in minc['dimensions'].items()}
        report=dict(sourceUrl=SOURCE_URL,
            sourceUrlStatus='Expected source reference supplied by task; origin not verified by this inspector.',
            inputPath=str(source),observedBytes=initial.st_size,observedByteSha256=sha.hexdigest(),
            checksumStatus='Locally observed byte hash, not a vendor checksum or authenticity verification.',
            image=image_info,dimensionalOrder=image_info['attrs'].get('dimorder'),
            validRange=image_info['attrs'].get('valid_range'),dimensions=dimensions,
            imageMin=dataset_metadata(group['image-min']),imageMax=dataset_metadata(group['image-max']),
            mincAttrs=attributes(minc),history=json_value(minc.attrs.get('history')),
            imageGroupAttrs=attributes(group),voxelDataRead=False,mutation=False,
            limitations=['Metadata inspection only; no image decoding, whole-volume extrema or registration inferred.',
                         'Dimension and scaling attributes are reported as observed, not interpreted.'])
    final=source.stat()
    if (initial.st_size,initial.st_mtime_ns) != (final.st_size,final.st_mtime_ns):
        raise ValueError('Input changed while inspecting; no report written')
    with output.open('x',encoding='utf-8') as stream:
        json.dump(report,stream,indent=2,allow_nan=False)
        stream.write('\n')
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    report=inspect(args.input,args.output)
    print(json.dumps({k:report[k] for k in ['observedBytes','observedByteSha256','dimensionalOrder','voxelDataRead']}))


if __name__ == '__main__': main()
