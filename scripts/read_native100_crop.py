"""Bounded MINC YZX crop decoding, following nibabel MINC per-slice scaling.

No intensity inversion, registration, full-image read, or source hash verification.
Caller supplies the open /minc-2.0/image/0 group and verifies source provenance.
Returned start is the FULL source XYZ lattice origin; crop origin is in metadata.
"""
import math
import numpy as np


def _text(value):
    return value.decode('utf-8') if isinstance(value,bytes) else value


def read_crop(group,lowXYZ,highExclusiveXYZ,max_voxels=20_000_000):
    low=np.asarray(lowXYZ);high=np.asarray(highExclusiveXYZ)
    if low.shape != (3,) or high.shape != (3,) or low.dtype.kind not in 'iu' or high.dtype.kind not in 'iu':
        raise ValueError('Crop bounds must be three integer XYZ coordinates')
    if type(max_voxels) is not int or max_voxels <= 0:
        raise ValueError('Invalid voxel limit')
    image=group['image']
    if _text(image.attrs.get('dimorder')) != 'yspace,zspace,xspace' or image.dtype.kind != 'u' or image.dtype.itemsize != 2 or len(image.shape) != 3:
        raise ValueError('Expected YZX uint16 image')
    valid=np.asarray(image.attrs.get('valid_range'),dtype=float)
    if valid.shape != (2,) or not np.array_equal(valid,[0,65535]):
        raise ValueError('Expected uint16 valid range 0..65535')
    shape=np.array(image.shape)[[2,0,1]]
    if np.any(low < 0) or np.any(high <= low) or np.any(high > shape):
        raise ValueError('Crop outside image or empty')
    count=math.prod(int(b)-int(a) for a,b in zip(low,high))
    if count > max_voxels:
        raise ValueError('Crop exceeds voxel limit before image read')
    start=[];step=[]
    for axis,name in enumerate(('xspace','yspace','zspace')):
        attrs=group.file['minc-2.0/dimensions/'+name].attrs
        origin=np.asarray(attrs.get('start'),dtype=float);spacing=np.asarray(attrs.get('step'),dtype=float)
        if origin.shape != () or spacing.shape != () or not np.isfinite(origin) or not np.isfinite(spacing):
            raise ValueError('Invalid dimension origin or spacing')
        if float(spacing) != .1 or _text(attrs.get('units')) != 'mm' or not np.array_equal(attrs.get('direction_cosines'),np.eye(3)[axis]):
            raise ValueError('Expected positive isotropic 0.1mm identity directions')
        length=attrs.get('length')
        if np.ndim(length) != 0 or length != int(shape[axis]):
            raise ValueError('Dimension length differs from image')
        start.append(float(origin));step.append(float(spacing))
    minimum=group['image-min'];maximum=group['image-max']
    for scale in (minimum,maximum):
        if scale.shape != (image.shape[0],) or _text(scale.attrs.get('dimorder')) != 'yspace':
            raise ValueError('Expected one scaling value per Y slice')
    x0,y0,z0=map(int,low);x1,y1,z1=map(int,high)
    minima=np.asarray(minimum[y0:y1],dtype=np.float64)
    maxima=np.asarray(maximum[y0:y1],dtype=np.float64)
    if not np.isfinite(minima).all() or not np.isfinite(maxima).all() or np.any(maxima < minima):
        raise ValueError('Invalid per-Y real ranges')
    stored=image[y0:y1,z0:z1,x0:x1].astype(np.float64)
    stored /= 65535.
    stored *= (maxima-minima)[:,None,None]
    stored += minima[:,None,None]
    decoded=stored.transpose(2,0,1)
    start=np.array(start);step=np.array(step)
    metadata=dict(lowXYZ=low.tolist(),highExclusiveXYZ=high.tolist(),shapeXYZ=list(decoded.shape),
        sourceShapeXYZ=shape.tolist(),sourceDimorder='yspace,zspace,xspace',validRange=valid.tolist(),
        perYImageMin=minima.tolist(),perYImageMax=maxima.tolist(),cropStartXYZmm=(start+low*step).tolist(),
        formula='real = stored / 65535 * (image-max[Y] - image-min[Y]) + image-min[Y]',
        scalingReference='nibabel/minc1.py _normalize; nibabel/minc2.py get_scaled_data',
        sourceHashVerified=False,inverted=False,mutation=False)
    return decoded,start,step,metadata
