"""Synthetic geometry tests; these do not prove anatomical registration."""
from pathlib import Path
import sys
import unittest
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from review_bigbrain_grid_transform import DisplacementGrid, forward_chain, inverse_chain


class PublishedGridEvaluatorTests(unittest.TestCase):
    def grid(self, function, start=(-10,-10,-10), step=(1,1,1), shape=(21,21,21)):
        voxel=np.indices(shape).reshape(3,-1).T
        world=np.asarray(start)+voxel*np.asarray(step)
        return DisplacementGrid(function(world).T.reshape((3,)+shape),start,step)

    def test_ras_component_order_and_anisotropic_negative_step(self):
        grid=self.grid(lambda p:np.column_stack((.1*p[:,0],.2*p[:,1],-.15*p[:,2])),start=(-10,10,-5),step=(1,-1,.5))
        points=np.array([[1.2,2.3,-1.5],[-3.1,-4.4,2.8]])
        expected=points*np.array([1.1,1.2,.85])
        np.testing.assert_allclose(grid.forward(points),expected,atol=1e-6)
        np.testing.assert_allclose(grid.inverse(expected),points,atol=.002)

    def test_ordered_noncommutative_composition_and_reverse_inverse(self):
        a=self.grid(lambda p:np.column_stack((.2*p[:,1],np.zeros(len(p)),np.zeros(len(p)))))
        b=self.grid(lambda p:np.tile([0,2,0],(len(p),1)))
        points=np.array([[1.,2.,3.],[-2.,1.,0.]])
        mapped=forward_chain([a,b],points)
        self.assertFalse(np.allclose(mapped,forward_chain([b,a],points)))
        np.testing.assert_allclose(inverse_chain([a,b],mapped),points,atol=.002)

    def test_noncontractive_but_invertible_grid_uses_residual_checked_solver(self):
        grid=self.grid(lambda p:np.column_stack((1.5*p[:,0],np.zeros(len(p)),np.zeros(len(p)))))
        points=np.array([[1.2,0,0],[-1.1,2,3]])
        mapped=grid.forward(points)
        np.testing.assert_allclose(grid.inverse(mapped,max_iterations=2),points,atol=.002)

    def test_unreachable_points_rejected_not_silently_zeroed(self):
        # x+d(x)=0 throughout the interior; target x=.2 cannot be inverted.
        grid=self.grid(lambda p:np.column_stack((-p[:,0],np.zeros(len(p)),np.zeros(len(p)))))
        with self.assertRaises(ValueError):
            grid.inverse(np.array([[.2,0.,0.]]),max_iterations=2)
        _,valid=grid.inverse(np.array([[.2,0.,0.]]),max_iterations=2,return_valid=True)
        self.assertFalse(valid[0])

    def test_invalid_geometry_and_nonfinite_points_rejected(self):
        with self.assertRaises(ValueError):
            DisplacementGrid(np.zeros((3,3,3,3)),[0,0,0],[0,1,1])
        grid=self.grid(lambda p:np.zeros_like(p))
        with self.assertRaises(ValueError):
            grid.displacement(np.array([[float('nan'),0,0]]))

    def test_catmull_rom_reproduces_quadratic_and_separable_cross_terms(self):
        function=lambda p:np.column_stack((.01*p[:,0]**2,.02*p[:,1]**2,.01*p[:,0]*p[:,2]))
        grid=self.grid(function)
        grid.interpolation='catmull-rom'
        points=np.array([[1.2,2.3,-1.5],[-3.1,-4.4,2.8],[9.,0,0]])
        np.testing.assert_allclose(grid.displacement(points),function(points),atol=1e-6)
        np.testing.assert_allclose(grid.inverse(grid.forward(points)),points,atol=.002)


if __name__=='__main__':unittest.main()
