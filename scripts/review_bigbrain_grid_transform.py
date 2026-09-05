"""Research-only evaluator for the three published Xiao 2019 MINC grids.

Uses explicit RAS-mm displacement components and ordered composition. Inverse
sampling solves each grid in reverse order, with a checked residual; it is not
the invalid approximation x - d(x). Trilinear grid interpolation is an explicit
approximation to libminc's cubic default, NOT a byte-equivalent mincresample.
An optional Catmull-Rom mode uses the cubic interpolation basis documented by
libminc (volume_io/Geometry/splines.c), with boundary fallback. This independent
implementation is tested numerically but not claimed byte-equivalent to MINC.
No registration is estimated here and no app labels are edited.
"""
import hashlib
from pathlib import Path
import h5py
import numpy as np
from scipy.ndimage import map_coordinates
from scipy.optimize import least_squares

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'work/official-bigbrain-tissue/mni_PD25_20190708_minc2'
XFM_NAME = 'BigBrain-to-ICBM2009sym-nonlin.xfm'
XFM_SHA = '1ca059cb2ccc682daa945cabaec0dcfc61a2e28e8f275141e31f40b995ab0c71'
GRID_SHAS = (
    'fa7d59742c38447b2b454d1c4cb940024611628b9da563a648c8a1ea35bd4ceb',
    '32b9611a78c6005ef8d324f42f2517b9bec6014c08ad059365b86c1586869e5d',
    'a651912a0def70359e0fad2b8a0148d51c131c16a458241925d44858964e29f5',
)


class DisplacementGrid:
    def __init__(self, values, start, step, interpolation='linear'):
        if interpolation not in ('linear','catmull-rom'):
            raise ValueError('Unknown grid interpolation')
        self.interpolation = interpolation
        self.values = np.asarray(values, dtype=np.float32)
        self.start = np.asarray(start, dtype=float)
        self.step = np.asarray(step, dtype=float)
        if self.values.ndim != 4 or self.values.shape[0] != 3 or np.any(np.array(self.values.shape[1:]) < 2):
            raise ValueError('Expected three displacement components on a 3D grid')
        if self.start.shape != (3,) or self.step.shape != (3,) or not np.isfinite(self.start).all() or not np.isfinite(self.step).all() or np.any(self.step == 0) or not np.isfinite(self.values).all():
            raise ValueError('Invalid displacement data or geometry')

    def displacement(self, world):
        world = np.asarray(world, dtype=float)
        if world.ndim != 2 or world.shape[1] != 3 or not np.isfinite(world).all():
            raise ValueError('Expected finite Nx3 RAS coordinates')
        voxel = (world-self.start)/self.step
        # Data is explicitly transposed into component,X,Y,Z at load time.
        inside = np.all((voxel >= -.5) & (voxel <= np.array(self.values.shape[1:])-.5), axis=1)
        result = np.zeros_like(world)
        if inside.any():
            for component in range(3):
                result[inside, component] = map_coordinates(self.values[component], voxel[inside].T, order=1, mode='nearest', prefilter=False)
        if self.interpolation == 'catmull-rom':
            interior = np.all((voxel >= 1)&(voxel <= np.array(self.values.shape[1:])-2),axis=1)
            if interior.any():
                coordinates = voxel[interior]
                base = np.floor(coordinates).astype(np.int64)
                # At the upper cubic boundary use the final valid stencil.
                base = np.minimum(base,np.array(self.values.shape[1:])-3)
                t = coordinates-base
                weights = np.stack((-.5*t+t*t-.5*t**3,1-2.5*t*t+1.5*t**3,.5*t+2*t*t-1.5*t**3,-.5*t*t+.5*t**3),axis=0)
                interpolated = np.zeros((len(base),3))
                for x in range(4):
                    for y in range(4):
                        for z in range(4):
                            weight = weights[x,:,0]*weights[y,:,1]*weights[z,:,2]
                            interpolated += self.values[:,base[:,0]+x-1,base[:,1]+y-1,base[:,2]+z-1].T*weight[:,None]
                result[interior] = interpolated
        return result

    def forward(self, world):
        return world+self.displacement(world)

    def inverse(self, target, tolerance=0.001, max_iterations=80, return_valid=False):
        target = np.asarray(target, dtype=float)
        estimate = target.copy()
        active = np.arange(len(target))
        for _ in range(max_iterations):
            residual = target[active]-self.forward(estimate[active])
            error = np.max(np.abs(residual), axis=1)
            pending = error > tolerance
            if not pending.any():
                break
            active = active[pending]
            estimate[active] += .9*residual[pending]
        errors = np.max(np.abs(self.forward(estimate)-target), axis=1)
        # Strong local gradients need not be a contraction, so fixed-point
        # iteration alone is insufficient. Solve only its failed points with
        # a finite-difference Jacobian; do not relax the residual criterion.
        for index in np.flatnonzero(errors > tolerance):
            desired = target[index]
            def residual(point):
                return self.forward(np.asarray(point)[None,:])[0]-desired
            def jacobian(point):
                delta = np.eye(3)*.01
                return ((self.forward(point+delta)-self.forward(point-delta))/.02).T
            best = estimate[index]
            best_error = errors[index]
            for seed in (desired, desired-self.displacement(desired[None,:])[0]):
                solved = least_squares(residual,seed,jac=jacobian,max_nfev=100,ftol=1e-10,xtol=1e-10,gtol=1e-10)
                error = np.max(np.abs(residual(solved.x)))
                if error < best_error:
                    best, best_error = solved.x, error
                if best_error <= tolerance:
                    break
            estimate[index] = best
            errors[index] = best_error
        valid = np.isfinite(errors)&(errors <= tolerance)
        if return_valid:
            return estimate, valid
        if not valid.all():
            raise ValueError(f'Inverse displacement failed: {int(np.sum(errors>tolerance))} points, max {float(errors.max()):.6f} mm')
        return estimate


def load_published_grids(interpolation='linear'):
    if hashlib.sha256((SOURCE/XFM_NAME).read_bytes()).hexdigest() != XFM_SHA:
        raise ValueError('Published transform identity changed')
    grids = []
    for index, digest in enumerate(GRID_SHAS):
        path = SOURCE/f'BigBrain-to-ICBM2009sym-nonlin_grid_{index}.mnc'
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError('Published grid identity changed')
        with h5py.File(path) as source:
            dims = source['minc-2.0/dimensions']
            image = source['minc-2.0/image/0/image']
            if image.attrs['dimorder'] != b'vector_dimension,zspace,yspace,xspace' or image.dtype.kind != 'f':
                raise ValueError('Unsupported MINC layout/scaling')
            start, step = [], []
            for axis, name in enumerate(('xspace','yspace','zspace')):
                attrs = dims[name].attrs
                if attrs.get('units') != b'mm' or attrs.get('spacing') != b'regular__' or not np.array_equal(attrs.get('direction_cosines', np.eye(3)[axis]), np.eye(3)[axis]):
                    raise ValueError('Unsupported MINC axis')
                start.append(float(attrs['start']))
                step.append(float(attrs['step']))
            values = image[...].astype(np.float32).transpose(0,3,2,1)
            grids.append(DisplacementGrid(values, start, step, interpolation))
    return grids


def forward_chain(grids, world):
    result = np.asarray(world, dtype=float).copy()
    for grid in grids:
        result = grid.forward(result)
    return result


def inverse_chain(grids, world, return_valid=False):
    result = np.asarray(world, dtype=float).copy()
    valid = np.ones(len(result), dtype=bool)
    for grid in reversed(grids):
        indices = np.flatnonzero(valid)
        result[indices], step_valid = grid.inverse(result[indices], return_valid=True)
        valid[indices] &= step_valid
    error = np.max(np.abs(forward_chain(grids, result)-world), axis=1)
    valid &= np.isfinite(error)&(error <= .01)
    if return_valid:
        return result, valid
    if not valid.all():
        raise ValueError('Composed inverse residual exceeds 0.01 mm')
    return result
