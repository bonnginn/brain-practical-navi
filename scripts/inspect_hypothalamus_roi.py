"""Inspect the official native 100um ROI without assuming an ICBM transform."""
import hashlib
import json
import h5py
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import ROOT

SOURCE = ROOT/'work/hypothalamus_full_100um.mnc'
SHA = '3a18798134c26515f0ad3543885fdbe22f25243060965611d6c9253c034c77b0'


def decode_identity_roi(group):
    image = group['image/0/image']
    if image.attrs.get('dimorder') != b'yspace,zspace,xspace':
        raise ValueError('Expected native YZX layout')
    limits = image.attrs['valid_range']
    if not np.array_equal(limits, [0, 65535]) or image.dtype.kind != 'u':
        raise ValueError('Unexpected storage range')
    for name, expected in [('image-min', 0), ('image-max', 65535)]:
        scale = group['image/0/'+name]
        if scale.shape != (image.shape[0],) or scale.attrs.get('dimorder') != b'yspace' or not np.all(scale[...] == expected):
            raise ValueError('Non-identity per-slice scaling requires explicit decoding')
    start, step = [], []
    for axis, name in enumerate(('xspace', 'yspace', 'zspace')):
        attrs = group['dimensions/'+name].attrs
        if attrs.get('units') != b'mm' or not np.array_equal(attrs['direction_cosines'], np.eye(3)[axis]):
            raise ValueError('Unsupported orientation')
        start.append(float(attrs['start'])); step.append(float(attrs['step']))
    if not np.isfinite(start+step).all() or np.any(np.asarray(step) <= 0):
        raise ValueError('Invalid sampling')
    return image[...].transpose(2, 0, 1), np.asarray(start), np.asarray(step)


def main():
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != SHA:
        raise ValueError('Unexpected source SHA')
    out = ROOT/'work/anatomy-review/hypothalamus-native100-inventory-v1'
    if out.exists():
        raise ValueError('Refusing to overwrite evidence')
    with h5py.File(SOURCE) as f:
        raw, start, step = decode_identity_roi(f['minc-2.0'])
        history = f['minc-2.0'].attrs['history'].decode()
    # Display-only window; not a threshold for anatomical tissue classification.
    window = np.percentile(raw[raw < 65000], [1, 99])
    gray = np.rint(np.clip((raw.astype(float)-window[0])/np.diff(window)[0], 0, 1)*250).astype('uint8')
    gray[raw >= 65000] = 255
    out.mkdir(parents=True)
    report = dict(sourceSha256=SHA, shapeXYZ=list(raw.shape), startMm=start.tolist(), stepMm=step.tolist(),
                  history=history, displayWindow=window.tolist(), displayOnly=True,
                  appCoordinatesEstablished=False, labelsProjected=False, mutation=False, figures=[])
    for y in [0, 35, 70, 105, 140, 175]:
        plane = gray[:, y, :].T[::-1]
        sheet = Image.new('RGB', (max(760, plane.shape[1]*2), plane.shape[0]*2+52), '#181818')
        d = ImageDraw.Draw(sheet)
        d.text((5, 4), f'Official native ROI: Y index {y}, native Y={start[1]+y*step[1]:.2f}mm; 100um sampling', fill='white')
        d.text((5, 21), 'RAW ONLY. Native coordinates are NOT current app ICBM coordinates.', fill='white')
        d.text((5, 36), 'Display percentile window only; no inferred anatomy or new segmentation.', fill='white')
        sheet.paste(Image.fromarray(plane).convert('RGB').resize((plane.shape[1]*2, plane.shape[0]*2), Image.Resampling.NEAREST), (0, 52))
        path = out/f'native-y-{y:03}.png'; sheet.save(path)
        report['figures'].append(dict(path=path.name, nativeYIndex=y, sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (out/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ('shapeXYZ', 'startMm', 'stepMm', 'displayWindow')}))


if __name__ == '__main__':
    main()
