"""Read-only raw300 context of the independent left ventricular component."""
import argparse
from review_lateral_detached547 import main as render

SHA='a2ceb2649ec0950eb7ba0620f38db9f8fc83293ad46bb2b7fcce82091360a6c5'

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--axis',choices=list('xyz'))
    args=parser.parse_args()
    render(args.axis,component_count=677,seed=(121,231,112),labels_sha=SHA,
           prefix='left-lateral677',representative_y=246,label_id=23)
