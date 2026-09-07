import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from render_fornix_native100_connection import sample_native_labels


class Shift:
    def __init__(self,delta):self.delta=np.array(delta)
    def forward(self,points):return points+self.delta


class NativeProjectionTests(unittest.TestCase):
    def test_noncommuting_transforms_preserve_order(self):
        class Scale:
            def forward(self,points):return points*2
        labels=np.zeros((12,12,12),np.uint8);labels[4,5,6]=25
        result=sample_native_labels(labels,[[1,2,3]],np.zeros(3),1,
            np.c_[np.eye(3),[1,0,0]],Scale(),[Shift([0,1,0])],np.eye(4))
        np.testing.assert_array_equal(result,[25])

    def test_affines_and_forward_chain_sample_expected_voxel(self):
        labels=np.zeros((9,10,11),np.uint8);labels[4,5,6]=25
        affine=np.diag([.5,.5,.5,1.]);affine[:3,3]=[-2,-3,-4]
        linear=np.c_[np.eye(3),[.1,.2,.3]]
        # Native [1,2,3] at start[-.2,-1.3,-2.4], step .1 gives
        # [-.1,-1.1,-2.1], then linear + grid shifts yields [0,-.5,-1].
        result=sample_native_labels(labels,[[1,2,3]],np.array([-.2,-1.3,-2.4]),.1,linear,Shift([0,.1,.2]),[Shift([0,.3,.6])],affine)
        np.testing.assert_array_equal(result,[25])

    def test_outside_source_is_zero_and_source_unchanged(self):
        labels=np.ones((3,3,3),np.uint8);before=labels.copy()
        result=sample_native_labels(labels,[[0,0,0],[20,0,0]],np.zeros(3),1,np.c_[np.eye(3),np.zeros(3)],Shift([0,0,0]),[],np.eye(4))
        np.testing.assert_array_equal(result,[1,0]);np.testing.assert_array_equal(labels,before)


if __name__=='__main__':unittest.main()
