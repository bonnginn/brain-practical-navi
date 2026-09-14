"""Freeze a read-only comparison of current BBS1 ID33 against its old audit input.

This inventory deliberately compares the old audit fixture as a separate
historical volume.  It does not re-apply the old audit's SHA to the current
public volume and it does not propose any segmentation change.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CURRENT = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
HISTORICAL_FIXTURE = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-third-inferior-current16.bin.gz"
OLD_AUDIT = ROOT / "segmentation-patches/review/optic-objective-audit-2026-09-12-superomedial75.json"
PROVENANCE = ROOT / "public/atlas/structure-provenance.json"
OUTPUT = ROOT / "segmentation-patches/review/current-optic-scope-inventory-2026-09-14.json"

EXPECTED_CURRENT_SHA = "785ce199e2c7226e5527a771e953d1b78cfed1067179aa04c63b9eba74577e0f"
EXPECTED_HISTORICAL_SHA = "48e1602b871b10bd7b31f99278aef8d0e44bcfb8930051fa9aa20ffd48802db2"
EXPECTED_OLD_AUDIT_SHA = "9793f38893485671026dff7ba4a9e3cec6aa58df6525e5486514781e4a0b6e84"
EXPECTED_PROVENANCE_SHA = "b9ab66c65a0dfefde58fd84ed55fe123636a6330fd66961addddfda63d2cd581"
EXPECTED_DIMS = (394, 466, 378)
PROVENANCE_KEY = "visual-pathway-legacy-optic-label"
DOC_INPUTS = {
    "docs/VISUAL_PATHWAY_SCOPE_DECISION_2026-09-14.md": "34400376e189b181af7c7f125200c22a4cbe54267aa8ae7d7c0318fc06912fcf",
    "OPTIC_PATHWAY_AUDIT.md": "86ccf7ca94551c013fa3a9c4c35db5e03efff2cc10dc4a518a82b21608469c98",
    "docs/OPTIC_CURRENT_CONTINUITY_REVIEW.md": "039250a164d7356af7e17e8bef34a58b4ff9da2abf0b0196587fd81642698248",
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_bbs1(path: Path, expected_sha: str) -> tuple[str, tuple[int, int, int], bytes]:
    compressed = path.read_bytes()
    actual = digest(compressed)
    if actual != expected_sha:
        raise ValueError(f"{path} SHA changed: {actual} != {expected_sha}")
    payload = gzip.decompress(compressed)
    if payload[:4] != b"BBS1":
        raise ValueError(f"{path} is not BBS1")
    dims = struct.unpack_from("<HHH", payload, 4)
    if dims != EXPECTED_DIMS:
        raise ValueError(f"{path} dims changed: {dims}")
    expected_size = 10 + dims[0] * dims[1] * dims[2]
    if len(payload) != expected_size:
        raise ValueError(f"{path} payload size changed")
    return actual, dims, payload[10:]


def xyz(index: int, dims: tuple[int, int, int]) -> tuple[int, int, int]:
    dx, dy, _ = dims
    z, remainder = divmod(index, dx * dy)
    y, x = divmod(remainder, dx)
    return x, y, z


def index3d(x: int, y: int, z: int, dims: tuple[int, int, int]) -> int:
    return x + dims[0] * (y + dims[1] * z)


def bbox(indices: set[int], dims: tuple[int, int, int]) -> dict[str, object]:
    points = [xyz(index, dims) for index in indices]
    minimum = [min(point[axis] for point in points) for axis in range(3)]
    maximum = [max(point[axis] for point in points) for axis in range(3)]
    return {"min": minimum, "max": maximum, "size": [maximum[i] - minimum[i] + 1 for i in range(3)]}


def components6(indices: set[int], dims: tuple[int, int, int]) -> list[dict[str, object]]:
    remaining = set(indices)
    components: list[dict[str, object]] = []
    while remaining:
        seed = min(remaining)
        remaining.remove(seed)
        queue = [seed]
        component = {seed}
        while queue:
            current = queue.pop()
            x, y, z = xyz(current, dims)
            for nx, ny, nz in ((x - 1, y, z), (x + 1, y, z), (x, y - 1, z), (x, y + 1, z), (x, y, z - 1), (x, y, z + 1)):
                if 0 <= nx < dims[0] and 0 <= ny < dims[1] and 0 <= nz < dims[2]:
                    neighbour = index3d(nx, ny, nz, dims)
                    if neighbour in remaining:
                        remaining.remove(neighbour)
                        component.add(neighbour)
                        queue.append(neighbour)
        components.append({"voxelCount": len(component), "seedVoxel": list(xyz(seed, dims)), "bbox": bbox(component, dims)})
    return sorted(components, key=lambda item: (-int(item["voxelCount"]), item["seedVoxel"]))


def coordinate_set_sha(indices: set[int]) -> str:
    return digest(b"".join(struct.pack("<I", index) for index in sorted(indices)))


def summarize(labels: bytes, dims: tuple[int, int, int], label_id: int) -> dict[str, object]:
    indices = {index for index, value in enumerate(labels) if value == label_id}
    return {
        "labelId": label_id,
        "voxelCount": len(indices),
        "coordinateSetSha256": coordinate_set_sha(indices),
        "bboxXYZ": bbox(indices, dims),
        "connectedComponentCount6": len(components6(indices, dims)),
        "connectedComponents6": components6(indices, dims),
        "indices": indices,
    }


def build_report() -> dict[str, object]:
    current_sha, current_dims, current_labels = read_bbs1(CURRENT, EXPECTED_CURRENT_SHA)
    historical_sha, historical_dims, historical_labels = read_bbs1(HISTORICAL_FIXTURE, EXPECTED_HISTORICAL_SHA)
    old_audit_bytes = OLD_AUDIT.read_bytes()
    if digest(old_audit_bytes) != EXPECTED_OLD_AUDIT_SHA:
        raise ValueError("old objective audit changed")
    old_audit = json.loads(old_audit_bytes.decode("utf-8"))
    if old_audit["inputSha256"] != EXPECTED_HISTORICAL_SHA:
        raise ValueError("old objective audit input SHA changed")
    fixed_inputs: dict[str, dict[str, object]] = {}
    for relative, expected in DOC_INPUTS.items():
        data = (ROOT / relative).read_bytes()
        actual = digest(data)
        if actual != expected:
            raise ValueError(f"{relative} changed: {actual} != {expected}")
        fixed_inputs[relative] = {"sha256": actual, "bytes": len(data)}
    provenance_bytes = PROVENANCE.read_bytes()
    provenance_sha = digest(provenance_bytes)
    if provenance_sha != EXPECTED_PROVENANCE_SHA:
        raise ValueError(f"{PROVENANCE} changed: {provenance_sha} != {EXPECTED_PROVENANCE_SHA}")
    provenance = json.loads(provenance_bytes.decode("utf-8"))
    entry = next((candidate for candidate in provenance["entries"] if candidate.get("key") == PROVENANCE_KEY), None)
    if entry is None:
        raise ValueError(f"missing provenance entry: {PROVENANCE_KEY}")
    if entry.get("legacyIds") != [33]:
        raise ValueError("provenance legacyIds changed")
    if entry.get("excludedFromSectionAndQuizTargets") is not True:
        raise ValueError("provenance exclusion flag changed")
    if entry.get("quizEligibility") != "none":
        raise ValueError("provenance quiz eligibility changed")
    limitations = entry.get("knownLimitations", [])
    if not any("ID36–38" in limitation and "分節待ち" in limitation for limitation in limitations):
        raise ValueError("provenance does not record ID36–38 as awaiting segmentation")
    fixed_inputs["public/atlas/structure-provenance.json"] = {"sha256": provenance_sha, "bytes": len(provenance_bytes)}

    current = summarize(current_labels, current_dims, 33)
    historical = summarize(historical_labels, historical_dims, 33)
    if current["voxelCount"] != 8482 or historical["voxelCount"] != 8482:
        raise ValueError("ID33 count changed")
    if old_audit["label"]["bbox"] != historical["bboxXYZ"]:
        raise ValueError("historical audit bbox disagrees with fixture")
    if old_audit["label"]["connectedComponents6"] != historical["connectedComponents6"]:
        raise ValueError("historical audit components disagree with fixture")
    current_indices = current.pop("indices")
    historical_indices = historical.pop("indices")
    current_only = current_indices - historical_indices
    historical_only = historical_indices - current_indices
    zero_counts = {str(label_id): current_labels.count(label_id) for label_id in (36, 37, 38)}
    return {
        "format": "brain-practical-current-optic-scope-inventory",
        "version": 1,
        "fixedInputs": fixed_inputs,
        "currentVolume": {
            "path": "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz",
            "sha256": current_sha,
            "magic": "BBS1",
            "dims": list(current_dims),
            "label33": current,
            "labelCounts": {str(label_id): zero_counts[str(label_id)] for label_id in (36, 37, 38)},
        },
        "historicalReference": {
            "kind": "old-audit-fixture",
            "path": "tests/fixtures/bigbrain-practical-segmentation-pre-third-inferior-current16.bin.gz",
            "sha256": historical_sha,
            "auditReportPath": "segmentation-patches/review/optic-objective-audit-2026-09-12-superomedial75.json",
            "auditReportSha256": EXPECTED_OLD_AUDIT_SHA,
            "auditInputSha256": EXPECTED_HISTORICAL_SHA,
            "label33": historical,
        },
        "provenance": {
            "path": "public/atlas/structure-provenance.json",
            "sha256": provenance_sha,
            "key": PROVENANCE_KEY,
            "legacyIds": entry["legacyIds"],
            "representations": entry["representations"],
            "quizEligibility": entry["quizEligibility"],
            "excludedFromSectionAndQuizTargets": entry["excludedFromSectionAndQuizTargets"],
            "id36To38AwaitingSegmentation": True,
        },
        "comparison": {
            "coordinateEncoding": "sorted flat BBS1 indices; X is fastest, then Y, then Z",
            "currentCoordinateSetSha256": current["coordinateSetSha256"],
            "historicalCoordinateSetSha256": historical["coordinateSetSha256"],
            "coordinateSetEqual": not current_only and not historical_only,
            "currentOnlyCount": len(current_only),
            "historicalOnlyCount": len(historical_only),
        },
        "status": {
            "mutation": False,
            "adopted": False,
            "expertReviewed": False,
            "id33ExcludedFromSectionAndQuiz": True,
            "ids36To38Unsegmented": True,
        },
        "limitation": "Read-only SHA and coordinate-set comparison. The historical fixture is compared as a separate input; the old audit is not re-applied to the current volume. Counts and connectivity do not assign optic anatomy or justify an ID33 split.",
    }


def main() -> None:
    if OUTPUT.exists():
        raise ValueError(f"Refusing to overwrite existing evidence: {OUTPUT}")
    report = build_report()
    OUTPUT.write_bytes((json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(json.dumps({"output": str(OUTPUT), "sha256": digest(OUTPUT.read_bytes()), "coordinateSetEqual": report["comparison"]["coordinateSetEqual"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
