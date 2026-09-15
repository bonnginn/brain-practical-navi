"""Stage the explicitly reviewed 197-cell cerebellar folia repair; never install."""
import argparse, gzip, hashlib, io, json, sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_orthogonal_review_bundle import DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume

BASE_SHA = "055feec985e9b3a007e7856904cef0f36bbc7b00040061fdcba5d5d74820c491"
DECISION_SHA = "9cfba4dbfc4efb6b28bc295787b7531a66d8aceac7e4ed66f1080a253c7ebb3e"
DEFAULT_DECISION = ROOT / "work/cerebellum-core-candidates-v1/primary-decision197.json"
PREFIX = "cerebellar-folia197"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def gzip_fixed(data):
    out = io.BytesIO()
    with gzip.GzipFile(fileobj=out, mode="wb", filename="", mtime=0) as stream:
        stream.write(data)
    return out.getvalue()


def replay(labels, points, reverse=False):
    out = labels.copy()
    xyzs = []
    for point in points:
        xyz = point.get("xyz")
        if (not isinstance(xyz, list) or len(xyz) != 3 or
                any(type(value) is not int for value in xyz) or
                any(value < 0 or value >= labels.shape[axis] for axis, value in enumerate(xyz))):
            raise ValueError("Invalid point coordinate")
        xyzs.append(tuple(xyz))
    if len(set(xyzs)) != len(xyzs):
        raise ValueError("Duplicate point coordinate")
    allowed = {(0, 28), (0, 29), (27, 28)}
    for point in points:
        xyz = tuple(point["xyz"])
        before, after = point.get("before"), point.get("after")
        if (before, after) not in allowed:
            raise ValueError("Only explicit 0->28/29 and 27->28 transitions are allowed")
        source, target = (after, before) if reverse else (before, after)
        if int(out[xyz]) != source:
            raise ValueError(f"label conflict at {xyz}: {int(out[xyz])} != {source}")
        out[xyz] = target
    return out


def verify_evidence(decision):
    verified = []
    for item in decision.get("evidence", []):
        path = ROOT / item["path"]
        if digest(path.read_bytes()) != item["sha256"]:
            raise ValueError("Evidence SHA mismatch: " + str(path))
        child_verified = []
        for figure in item.get("visuallyInspectedFigures", []):
            figure_path = path.parent / figure["path"]
            if digest(figure_path.read_bytes()) != figure["sha256"]:
                raise ValueError("Evidence figure SHA mismatch: " + str(figure_path))
            child_verified.append(figure)
        verified.append({**item, "visuallyInspectedFigures": child_verified})
    if not verified:
        raise ValueError("Evidence is required")
    return verified


def main(decision_path):
    decision_bytes = decision_path.read_bytes()
    if digest(decision_bytes) != DECISION_SHA:
        raise ValueError("Decision SHA mismatch")
    decision = json.loads(decision_bytes)
    if decision.get("approved") is not True or decision.get("expertReviewed") is not False:
        raise ValueError("Explicit non-expert project approval is required")
    if decision.get("sourceLabelsSha256") != BASE_SHA:
        raise ValueError("Decision baseline SHA mismatch")

    candidate_records = {}
    candidate_sources = []
    for source in decision.get("candidateSources", []):
        path = ROOT / source["path"]
        source_bytes = path.read_bytes()
        if digest(source_bytes) != source["sha256"]:
            raise ValueError("Candidate source SHA mismatch: " + str(path))
        payload = json.loads(source_bytes)
        for record in payload["records"]:
            xyz = tuple(record["xyz"])
            if xyz in candidate_records:
                raise ValueError("Candidate sources overlap")
            candidate_records[xyz] = record
        candidate_sources.append({**source, "count": len(payload["records"])})
    if len(candidate_sources) != 2 or len(candidate_records) != 202:
        raise ValueError("Exactly the fixed two candidate sources and 202 records are required")

    points = decision.get("points")
    if not isinstance(points, list) or len(points) != 197:
        raise ValueError("Decision must contain exactly 197 explicit points")
    selected = [tuple(point["xyz"]) for point in points]
    if len(set(selected)) != 197 or any(xyz not in candidate_records for xyz in selected):
        raise ValueError("Decision points must be a unique explicit subset of the fixed 202 candidate records")
    for point in points:
        record = candidate_records[tuple(point["xyz"])]
        if point["before"] != record["currentLabel"] or point["after"] != record["provisionalTargetId"]:
            raise ValueError("Decision transition differs from candidate record")

    _, _, before = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, BASE_SHA)
    after = replay(before, points)
    if np.count_nonzero(before != after) != 197 or not np.array_equal(replay(after, points, True), before):
        raise ValueError("Exact reversible difference failed")
    source_raw = gzip.decompress(DEFAULT_LABELS.read_bytes())
    stored = gzip_fixed(source_raw[:10] + after.tobytes(order="F"))

    out = ROOT / f"work/anatomy-review/{PREFIX}-stage-v1"
    if out.exists():
        raise ValueError("Preserve existing stage evidence")
    evidence = verify_evidence(decision)
    transition_counts = {}
    for point in points:
        key = f"{point['before']}->{point['after']}"
        transition_counts[key] = transition_counts.get(key, 0) + 1
    if transition_counts != {"0->28": 153, "0->29": 38, "27->28": 6}:
        raise ValueError("Decision transition counts differ from the fixed 197-cell review")
    ids = (0, 27, 28, 29)
    record = {
        "beforeSha256": BASE_SHA,
        "afterSha256": digest(stored),
        "afterRawVoxelSha256": digest(after.tobytes(order="F")),
        "points": points,
        "count": 197,
        "transition": "mixed-cerebellar-folia-repair",
        "transitionCounts": transition_counts,
        "candidateSources": candidate_sources,
        "decision": {"path": decision_path.relative_to(ROOT).as_posix(), "sha256": DECISION_SHA},
        "evidence": evidence,
        "countsBefore": {str(label): int((before == label).sum()) for label in ids},
        "countsAfter": {str(label): int((after == label).sum()) for label in ids},
        "partial": True,
        "status": "explicit-review-decision-work-stage-only",
        "adopted": False,
        "expertReviewed": False,
        "installed": False,
        "reviewNote": decision.get("reviewNote"),
        "limitation": "Work stage only. The 197 explicit project-reviewed cells are reversible. Five disconnected candidate cells remain deferred; this does not complete cerebellar boundaries or install assets.",
    }
    out.mkdir(parents=True)
    (out / "before.bin.gz").write_bytes(DEFAULT_LABELS.read_bytes())
    (out / "labels.bin.gz").write_bytes(stored)
    repair_path = out / "repair.json"
    repair_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"prefix": PREFIX, "recordSha256": digest(repair_path.read_bytes()),
                      "afterSha256": record["afterSha256"], "count": 197,
                      "transitionCounts": transition_counts}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--decision", type=Path, default=DEFAULT_DECISION)
    args = parser.parse_args()
    main(args.decision.resolve())
