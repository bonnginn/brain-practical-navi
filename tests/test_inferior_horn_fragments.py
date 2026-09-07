import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from locate_inferior_horn_fragments import fragment_records


class FragmentsTest(unittest.TestCase):
    def test_diagonal_contact_is_not_face_connectivity(self):
        full=np.zeros((4,4,4),bool)
        full[1,1,1]=True;full[2,2,2]=True
        six=fragment_records(full,np.zeros(3,dtype=int),full,1)
        diagonal=fragment_records(full,np.zeros(3,dtype=int),full,3)
        self.assertEqual(len(six),2)
        self.assertEqual(len(diagonal),1)
        self.assertEqual(diagonal[0]['count'],2)
        self.assertEqual(diagonal[0]['completeComponentCount'],2)

    def test_crop_splits_connection_outside_crop(self):
        full=np.zeros((5,5,3),bool)
        full[1,1:4,1]=True;full[3,1:4,1]=True;full[1:4,3,1]=True
        r=fragment_records(full[:,0:3,:],np.array([0,0,0]),full,1)
        self.assertEqual(len(r),2)
        self.assertEqual(len({p['completeComponent'] for p in r}),1)
        self.assertTrue(all(p['otherCropComponentsInSameCompleteComponent'] for p in r))

    def test_genuinely_disconnected_and_global_coordinates(self):
        full=np.zeros((7,7,7),bool);full[2,2,2]=True;full[4,2,2]=True
        r=fragment_records(full[1:6,1:6,1:6],np.array([1,1,1]),full,1)
        self.assertEqual(len({p['completeComponent'] for p in r}),2)
        small=next(p for p in r if not p['isLargest'])
        self.assertEqual(small['nearestMainDistanceMm'],1)
        self.assertEqual(small['nearestPoint'],[4,2,2])
        self.assertEqual(small['nearestMainPoint'],[2,2,2])


if __name__=='__main__':unittest.main()
