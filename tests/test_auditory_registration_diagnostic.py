import sys,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from fit_auditory_local_translation import correlation


class CorrelationTests(unittest.TestCase):
    def test_affine_intensity_and_sign(self):
        a=np.array([1.,2.,4.,8.]);before=a.copy()
        self.assertAlmostEqual(correlation(a,3*a+15),1)
        self.assertAlmostEqual(correlation(a,-a),-1)
        np.testing.assert_array_equal(a,before)

    def test_constant_has_no_registration_evidence(self):
        self.assertEqual(correlation([2,2,2],[1,2,3]),0)

    def test_invalid_vectors_fail_closed(self):
        for a,b in [([],[]),([1],[2]),([1,2],[1,2,3]),([[1,2]],[[1,2]]),([1,float('nan')],[1,2]),([1,2],[1,float('inf')])]:
            with self.assertRaises(ValueError):correlation(a,b)


if __name__=='__main__':unittest.main()
