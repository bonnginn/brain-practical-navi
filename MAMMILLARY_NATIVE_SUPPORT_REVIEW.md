# Mammillary native-image support review — 2026-09-06

Status: investigation, no new adoption, no public-volume mutation. This does
not replace the existing project adoption of IDs39/40 or certify all borders.

**Subsequent development integration:** the two-voxel inferior-tip stage
below is now installed locally. Current compressed SHA is 86e3b22d… and
counts are ID39=559 / ID40=729. The opening no-mutation statement describes
the initial investigation, not this subsequent integration. The live site
and main are unchanged. The adoption record and pre-change fixture are
tracked, and an independent Node replay verifies every voxel against the
fixed two-point change. Validation metadata, cache revision and current
objective-audit expectations were updated. Historic review evidence remains
unchanged; the former brainstem test now checks its retained e7e6 fixture.

Recomputed objective values: each mammillary label remains one 6-connected
component; left bbox lower Z changes 107→108; all four contact-interface
face counts and representative slices are unchanged. These are consistency
checks, not new anatomical approval.

Integration verification: complete Node suite 516/516 and Python suite
138/138 passed (`work/mammillary-tip-full-node.log`,
`work/mammillary-tip-full-python.log`), TypeScript passed and normal build
passed. Browser v4 at localhost4345 loaded revision86e3b22dc7ce69cf and the
HTTP-decoded BBS1 voxel payload matched the recorded raw SHA. Horizontal
position70 with only mammillaryBody selected rendered at 1366×900 and
390×844; both screenshots were individually viewed, both health probes
had loading0, UI errors0, no horizontal overflow and no WebGL fallback.
The 390 viewport has clientWidth375 because of its scrollbar. This is
resized desktop-browser QA, not physical-phone/touch or expert review.
The selected UI badge reads `教材ラベル`, not the older longer badge text.
Artifacts: `work/mammillary-tip-browser-v4-*`; browser runner:
`work/check-mammillary-tip-browser.mjs`.

Earlier browser attempts are not successes: the full Node suite rebuilt
dist with a Pages base during the first concurrent browser run, leaving no
app root at the root URL. After the suite ended, normal dist was restored.
A subsequent diagnostic incorrectly compared HTTP-decoded bytes against
the compressed file hash; the corrected check validates BBS1/raw voxels.
v3 then exposed an outdated badge expectation; v4 checks the actual
existing `教材ラベル` UI. No product UI was changed to satisfy these checks.

The explicit Pages build also passed, followed by restoration of the normal
build (`work/mammillary-tip-pages-build.log`,
`work/mammillary-tip-final-normal-build.log`). Nothing was deployed.

## Local visual comparisons

`scripts/render_native_mammillary_review.py` generated native100 raw versus
projected app500 labels in six sheets, all individually visually inspected:
native Y14–16, Y34–36, Y54–56, X214–216, X259–261, Z124–126 (18 planes).
Output: `work/anatomy-review/native-mammillary-local-v1/report.json`.
The report pins source, transform and label hashes and every figure hash.
Green is ID39, blue ID40, yellow the excluded mixed ID33. These colors differ
from older overview figures. Nearest-neighbor contours are not 100 µm labels.

The Y34–36 and sagittal central comparisons place IDs39/40 over the paired
rounded inferior structures. At Y14–16, the projected extent and the visible
tissue profile diverge near the ends; Y54–56 has no projected mammillary
label in these windows. Z124–126 also shows outer-edge mismatch. These local
observations identify a reason to examine source support, not permission to
trim a label using a single image. Registration discrepancy and partial
volume must be separated from an incorrectly assigned voxel.

## Every adopted voxel centre sampled

`scripts/audit_mammillary_native_support.py` inverse-mapped all 1290 current
app voxel centres through the three improved grids, the native nonlinear
grid and the official linear inverse. All were within the native ROI.
Full forward roundtrip maximum coordinate error: 0.000003140 mm. This tests
numerical inversion, **not anatomical registration accuracy**.

Output: `work/anatomy-review/mammillary-native-support-v1.json`, with exact
per-point app/native coordinates and both image values for screened points.

|Label|Total app voxels|Native raw below 500 at mapped centre|
|---|---:|---:|
|39|561|40|
|40|729|42|

The 82 points are review targets, not a deletion patch. Low native raw values
correspond to light/empty-looking areas after display inversion. Their app
image values range 216–250 (ID39) and 217–250 (ID40); none is app background
255. The blurred app image therefore does not independently establish that
these whole 0.5 mm voxels contain no tissue. Centre-only native sampling
also does not measure the tissue fraction across a voxel.

Next: examine these exact points on app-original and native orthogonal
context, including finite voxel extent, before deciding any local repair.
Do not delete all 82 by threshold. The hypothalamic superior attachment is
not resolved by this external-surface support check.

Two new orientation tests match the established crop renderer on all axes
and reject an out-of-range plane. The real inverse calculation completed
with the pinned current volume; neither test counts nor the roundtrip prove
anatomical correctness. Source identity and transform limitations are in
HYPOTHALAMUS_EXTERNAL_REFERENCE_REVIEW.md.

## Finite-voxel and point-specific follow-up

`audit_mammillary_voxel_extent.py` sampled 125 points per screened voxel,
including faces and corners, through the same inverse transform. Of 82
targets, 74 have at least one native sample above 3000; centre-only deletion
would remove partly supported voxels. Only two have all 125 samples below
500. Sample proportions are not measured tissue-volume fractions.

Those two are app XYZ [193,252,107] and [193,253,107], both ID39. Their native
sample maxima are 247.422 and 481.494, respectively. Full roundtrip maximum
error is 0.000003165 mm; this still does not certify registration accuracy.

`render_mammillary_tip_candidates.py` produced six sheets in
`work/anatomy-review/mammillary-tip-context-v2`. All six were individually
viewed: for each point, three adjacent app planes on each axis and three
adjacent native planes on each axis. The native planes are rounded native
coordinates, not the same physical planes as app cuts. Both targets appear
as an inferior two-voxel label extension beneath the visible tissue edge.
Native adjacent horizontal cuts around those centres show external space;
coronal and sagittal context locate the rounded body above them. v1 was
aborted by the ROI-bound guard (requested native crop extended before Y0),
and is incomplete; v2 uses a smaller valid native context window.

Decision: stage removal of only these two inferior tips (39→0), preserving
the other 80 screened points and all superior attachments. This is a local
AI-assisted image review decision, not human expert review.

`prepare_mammillary_tip_repair.py` created
`work/anatomy-review/mammillary-tip-stage-v1/{base.bin.gz,labels.bin.gz,adoption.json}`.
The record embeds hash-bound sampling and visual evidence, exact reversible
points and input/output hashes. Proposed ID39 count 561→559; ID40 remains729.
The complete 1 mm block-pipeline sampled label input is unchanged (the two
points have odd X and Z), so no block-part mask changes are required.

Staged compressed SHA256:
`86e3b22dc7ce69cf31c5ba821e980ce283a366fd952bf46ce880efd8f3127e14`.
Staged raw SHA256:
`1f826fc89569429efd9e8cc322bdce49a28f1d1012e93ea419487afcc9d405aa`.
The app/public source volume is still e7e61a70; integration, dependent audit
re-baselining and browser confirmation have not happened yet. New focused
tests: extent sampler 1/1; exact repair and source-mutation rejection 2/2.
