"""Full-axis raw300 coverage of a fixed residual component; never edit labels."""
import argparse
from review_lateral_detached547 import main as render
from review_lateral_residual_components import SHA, TARGETS


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--count', type=int, choices=[116, 80], required=True)
    parser.add_argument('--axis', choices=list('xyz'), required=True)
    parser.add_argument('--after-residual80', action='store_true',
                        help='Review retained 116 points against the a512 development revision')
    args = parser.parse_args()
    if args.after_residual80 and args.count != 116:
        parser.error('The 80-point component was removed; only retained 116 may be reviewed')
    count, seed = next(t for t in TARGETS if t[0] == args.count)
    labels_sha = 'a512880c4dcd1b1291664f8ee4aaa3bd8d609b62dd2e037634953cd7ebd12efd' if args.after_residual80 else SHA
    prefix = f'lateral-residual{count}' + ('-after80' if args.after_residual80 else '')
    render(args.axis, component_count=count, seed=seed, labels_sha=labels_sha,
           prefix=prefix, representative_y=248 if count == 116 else 235)
