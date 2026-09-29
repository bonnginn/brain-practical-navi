"""Install the image-reviewed tiny exterior cerebellar islands after a dry run."""

import argparse
import json

from install_cerebellar_interstitial16 import plan
from prepare_cerebellar_exterior10 import ROOT, STAGE


RECORD = ROOT / "segmentation-patches/review/cerebellar-exterior10-adoption-2026-09-29.json"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    writes, old_info, new_info, after_sha = plan(STAGE, RECORD, "cerebellar-exterior10")
    if args.apply:
        for path, data in writes:
            path.write_bytes(data)
    print(json.dumps({"applied": args.apply, "files": len(writes), "afterSha256": after_sha,
                      "sectionComponents6": [old_info["components6"], new_info["components6"]]}))
