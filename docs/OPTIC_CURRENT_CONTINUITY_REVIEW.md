# Current optic-region continuity review — 2026-09-06

This is an AI image review, not expert approval or a segmentation adoption.
Input label SHA-256: e7e61a7060c7f1ddfa8106ba659c0488e077495acdd6564862db44663d233ea3.
Input raw-image SHA-256: c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746.

## Coverage actually viewed

All 17 sheets (`current-00.png` through `current-16.png`) in
`work/anatomy-review/optic-current-continuity-v1/` were opened and visually inspected:
39 consecutive horizontal planes Z85–123, sagittal X175/185/195/205/215/225,
and coronal Y250/260/270/280/290/300, totaling 51 raw/outline comparisons.
The report in that directory records individual image hashes; its SHA-256 is
514bd91575d18c5e47edc005cae40968be6ea61e525a698a690bcb7b152af148. Crop XYZ is
[155,240,80]–[235,310,130]. Orthogonal planes are sampled, not consecutive throughout.
An earlier oversized tool output was truncated; it did not count as inspection.
The images were subsequently opened in batches of two or three.

## Findings and decision

- Z86–94 and Y300 show small peripheral ID33 outlines that do not consistently
  follow the visible tissue profiles. Their anatomical identity is not established
  by their connection to the main atlas region.
- Z95–104 shows transverse tissue with paired ID33 outlines and a central gap.
  Neither that existing gap nor a left/right split defines a chiasm/tract boundary.
- Z109–114 shows ID33 extending around the separately outlined mammillary bodies
  and toward the third-ventricle region. This remains a mixed source region,
  not a ready-made optic-pathway mask.
- Z114–115 and Z118–119 show abrupt changes in the ID33 outline footprint.
  Sagittal X185/205 and coronal Y270 also show straight-edged outline discontinuities
  that cannot be accepted as tissue boundaries from this review.
- This review does not establish the precise chiasm-to-tract transition or complete
  posterior tract extent. It also does not justify expanding mammillary attachments.

No voxel, mesh, quiz target or published asset was changed. IDs36–38 remain
unsegmented. Keep mixed ID33 excluded from accepted section-learning labels and
ordinary quiz correct answers. Do not fix the above by interpolating ID33 across
planes, assigning its central gap to the chiasm, or splitting it by coordinates.

Next evidence work: obtain tighter consecutive orthogonal views around the
transverse tissue and its lateral continuation, with broader anatomical context
and source orientation checked before proposing any reversible voxel patch.
This review completes the stated 51-plane inspection, not optic segmentation.

## Consecutive orthogonal and native 300 µm follow-up

The next evidence work above has now been executed, not merely queued.
All 14 sheets in `work/anatomy-review/optic-orthogonal-continuity-v1/`
were visually inspected: consecutive X183–207 (25 planes) and Y268–284
(17 planes), 42 comparisons. Report SHA-256:
50e20a5e669054fc06a0816d012a2defcde800b0f5b978db5d194a60617c8c86.
X183–192 and X200–207 show the horizontal breaks of the projected region
across continuous raw tissue; X195–197 contains visible tissue despite the
near-absence of ID33. Y271–284 follows the central transverse tissue without
supporting the existing label's central division as a tissue-free gap.

The official transformed 300 µm image was already available locally, so no
large download or image upsampling was necessary. Source:
`MRI/MINC/BigBrain-to-ICBM2009sym-nonlin-300um.mnc` in
https://packages.bic.mni.mcgill.ca/mni-models/PD25/mni_PD25_20190708_minc2.zip,
SHA-256 ebf0e88def96476d0a32ddaff6f28e37d7afd125dec724e6d8855b12357c7e86.
The loader checks scalar MINC intensity scaling, dimension order, identity
direction cosines and source digest. Current 500 µm labels are projected
nearest-neighbor for context, **not** promoted to 300 µm segmentation.

`scripts/render_optic_native300_review.py` renders three 6 mm-radius regions
centered at app-grid XYZ [196,280,100], [180,260,115], [213,260,115]. All nine
sheets (27 comparisons: three consecutive native slices on each axis per
region) were visually inspected. Evidence:
`work/anatomy-review/optic-native300-v1/report.json`, SHA-256
a5d5412bd11d2309641f32dc17e210324a2fe5aa3e107b2627a445042296c0ab.

The native central views reinforce that the old label gap crosses continuous
tissue. The lateral views reveal internal intensity variation but do not
uniquely delimit the tract from attached neighboring tissue. These local
windows do not cover the entire pathway and cannot certify its complete
anatomical extent. No patch was adopted; IDs36–38 remain empty.

Decision: stop repeating the same ID33 repair strategy. A defensible new
optic segmentation still needs an independently justified chiasm/tract
transition and posterior endpoint; interpolating this atlas mask will not
supply either. Preserve the current exclusion rather than presenting a
visually smoother mixed region as a completed structure. Other independent
repairs and verification can proceed while this anatomical limit remains.

## Native 100 µm continuity (new source evidence, 2026-09-06)

The official native hypothalamic ROI is now available and its two-stage
native-to-old-ICBM transformation followed by the three improved grids was
compared against the old and current original images. See
HYPOTHALAMUS_EXTERNAL_REFERENCE_REVIEW.md for exact source hashes and limits.
This is not a rescaled copy of the earlier 300 µm image.

`render_native_roi_continuity.py` generated 42 consecutive native coronal
sections Y85–126, X70–405 / Z20–170 inclusive. All 11 sheets were individually
viewed. The `--orthogonal` mode added three adjacent native planes around
X170/200/230/260/290 and Z90/110/130: all 24 planes in eight sheets were
individually viewed. Native indices must not be entered as app indices.
The images show raw data only, with a recorded inverted intensity window;
they do not show or mechanically divide ID33.

- Y85–94 shows separated medial tissue edges with irregular small fragments.
  Do not connect these fragments merely to make an unbroken label.
- A broader central transverse bridge is visible through Y97–118. Its outer
  inferior contour and lateral expansions are clearer than in the old
  500 µm image. Y119–126 shows changing, asymmetric superior attachments;
  the attachment is not defined by the top of the cropped image.
- Z89–91 independently shows the transverse body, separate from a small
  posterior irregular fragment. Z109–111 shows the body and posterior
  attached tissue; at Z129–131 the medial connection is no longer the same
  continuous transverse body. A constant XY footprint over Z is unsuitable.
- The sagittal samples distinguish the bridge region from posterior
  mammillary-region tissue and show variable superior attachments. They do
  not delineate every lateral tract or certify a chiasm/optic-nerve endpoint.

The native observations now support constructing an image-guided candidate
for the central bridge rather than interpolating the mixed atlas label.
They do not yet support adopting a complete ID36–38 segmentation: a candidate
must include explicit uncertain attachments/endpoints and be checked through
its full extent. No mask or app label was changed in this step.

Evidence directories:
`work/anatomy-review/native-optic-bridge-continuity-v1` and
`work/anatomy-review/native-optic-bridge-orthogonal-v1`; reports pin the source,
every figure hash, native planes, crops, polarity and display window. All
source-derived image pixels of the 42 coronal panels were additionally
compared with the decoded source and matched. This verifies rendering, not
anatomical validity.

## Native connected-support experiment: not adopted (2026-09-06)

`build_native_optic_bridge_candidate.py` tests four-connected raw-intensity
components on native coronal Y97–126, independently of ID33. This is an
experimental tissue-support mask, not a completed optic chiasm label.

- v1 used a narrower crop. Inspected sheets 00, 05 and 09 revealed crop
  truncation; its artificial lateral cut is not an anatomical boundary.
- v2 generated intermediate files but failed JSON serialization. It is an
  incomplete run, not valid report evidence; its files are preserved.
- v3 uses native X70–405 / Y97–126 / Z20–170 inclusive. Thresholds 500,
  1500 and 3000 produce 310507, 305811 and 301420 native voxels respectively;
  9087 are threshold-sensitive and 24070 baseline voxels touch crop faces.
  These are 100 µm native counts, not 500 µm application label counts.
- v3 sheets 05, 10 and 11 were individually inspected. The superior
  attachments let the component extend into neighboring tissue; irregular
  posterior tissue is also included. The sagittal views cover only the
  30-plane (3 mm) coronal slab and visibly terminate at its faces. They do
  not establish complete anterior/posterior boundaries. Other v3 sheets
  have not been visually reviewed; no whole-candidate review is claimed.

Decision: reject direct adoption of this component experiment. Raising a
threshold or shrinking the crop would not independently identify the
anatomical attachment boundary. Preserve the raw continuity evidence, but
require image-traced boundaries and full endpoint coverage before an
anatomical candidate is promoted. IDs36–38 remain empty; no public volume
or mesh was changed. Focused support-function tests cover connectivity,
unsupported seeds and preservation of low-intensity holes, not anatomy.

Artifacts: `work/anatomy-review/native-optic-bridge-candidate-v1`, `-v2`,
and `-v3` (full directory prefix applies to all versions). The v3 report
pins the source, candidate NPZ and figures; `adopted` is false.

## Anterior continuity extended to the native ROI edge

`render_native_roi_continuity.py --anterior` generated native Y127–175 inclusive,
49 consecutive 0.1mm coronal planes, in 13 sheets. All13 were individually viewed.
The review window is full native X0–473 and Z0–220, wider than the preceding local
bridge crop. It is still not the complete native Z extent or the whole pathway.
Source SHA is the same native100 ROI; no ID33 or other label is shown or read.
Evidence: `work/anatomy-review/native-optic-anterior-continuity-v1/report.json`.

- Y127/128 retains a narrow superior connection; Y129 onward shows the inferior
  transverse body separated from the overlying tissue in these coronal planes.
- A medial gap opens at about Y139; Y139–146 shows two distinct profiles where the
  preceding body was continuous. This is a useful image-defined transition for
  subsequent cross-plane tracing, not by itself a coronal slab rule defining the
  chiasm/optic-nerve boundary.
- Y147–172 follows asymmetric profiles with thin appendages and internal clefts.
  Do not fill those clefts or include adjacent separate rounded profiles solely
  because they are nearby. Their specific tissue identity is not established here.
- One profile fades around Y173/174; the other persists through Y175, the final
  available native Y plane. That source edge must not be called its anatomical
  endpoint, nor the asymmetry corrected by copying the other side.

Next: orthogonal continuity through the newly located Y127–146 attachment/split
transition, using the full available anterior/posterior context. No new connected-
component mask is adopted; the prior failed component experiment remains rejected.
IDs36–38 remain empty. This new coverage changes the next tracing target, not the
status to expert-reviewed or complete. Public labels/models remain unchanged.

Follow-up executed: the49 coronal image panels were independently checked against
direct YZX reads from the native MINC, including vertical orientation, intensity
window and2× nearest display scaling. All source pixels match (`pixel-verification.json`);
this verifies rendering, not anatomical classification.

The earlier Z89–91 sheet was re-opened for context (not counted as new coverage).
New `--anterior-orthogonal` output covers Z49–51,64–66,79–81 across full native
X0–473/Y0–175. All three sheets/nine planes were individually viewed. Lower planes
show separate profiles; Z79–81 shows a narrow transverse connection and an internal
cleft changing across planes. This is not captured by choosing one coronal split
index as a universal boundary. Do not fill that cleft or extend the profiles to
the ROI edge. `native-optic-anterior-orthogonal-v1/report.json` records the new
source/crop/plane/figure evidence. No segment is promoted yet. The posterior/lateral
continuations and superior attachment still need image-traced limits; the previous
component experiment cannot substitute for them.

## Posterior native continuity: full available Y coverage

`render_native_roi_continuity.py --posterior` generated Y0–84 inclusive,
85 consecutive native coronal planes, full X0–473/Z0–220, in22 sheets.
All22 sheets were individually viewed, starting atY84 and tracing backward
toY0. The initially truncated bridge-19 tool output was not counted until
the image was reopened successfully. Artifacts:
`work/anatomy-review/native-optic-posterior-continuity-v1/report.json`.

- Y64–84: paired inferior oval profiles lie lateral to the central descending
  tissue. Narrow clefts separate portions of their medial/superior contours,
  but the clefts are not complete closed boundaries in every plane.
- Y40–63: the profiles become oblique and flatter; slender bright gaps and
  small internal clefts vary across adjacent planes. The neighboring central
  tissue develops conspicuous internal contrast. That contrast is not a rule
  for assigning a nucleus or separating hypothalamus from thalamus.
- Y16–39: the lateral light profiles become thinner relative to adjacent
  tissue. Medial rounded dark profiles appear separately; proximity alone
  does not make these part of the optic candidate.
- Y0–15: a thin lateral light rim remains alongside much darker tissue.
  A distinct optic tract termination or geniculate attachment is not established
  within this crop. Y0 is the source ROI edge, not an anatomical endpoint.

Together with the preceding Y85–126 andY127–175 series, every available native
Y index has now been visually sampled at this ventral review window; the middle
series used the narrower X70–405/Z20–170 crop. This is NOT complete whole-volume
or whole-pathway coverage, nor an image-traced segmentation. Native coordinates
must not be copied directly into application labels.

`work/verify-native-anterior.py --posterior` independently compared all85 panels
against direct MINC YZX reads, verifying orientation, window, scale and PNG hashes.
All source pixels matched; `pixel-verification.json` explicitly records
`anatomicalValidation:false`. No anatomy is established by this rendering test.

Decision: retain these profiles as tracing evidence only. No new mask or public
label change; IDs36–38 remain empty. Next use orthogonal views through the oblique
lateral attachment, rather than regenerating another identical coronal sweep or
reviving the rejected threshold component. The unresolved identity/attachment
must remain distinct from the now-completed coronal survey.

### Posterior orthogonal follow-up

`--posterior-orthogonal` adds native Z144–146/159–161/174–176 and
X149–151/319–321, fifteen planes in five sheets; all five were individually
viewed. Full available X/Y and Z0–220 context is used. At Z144–146 the
lateral profiles project from central tissue with incomplete inner clefts;
at Z159–161 their attachments broaden and vary by side; at Z174–176 the
distinct protruding contour is largely replaced by continuous neighboring
tissue. The sagittal sheets show inferior projections with superior attachment,
not a fully isolated tract. These observations do not define a geniculate endpoint
or a complete optic/hypothalamic interface. Evidence is in
`native-optic-posterior-orthogonal-v1/report.json`; no label was changed.

This local source survey has reached an unresolved anatomical interface, not
a software failure. Keep the candidate unadopted and move to other unresolved
structures; repeat this survey only with a new boundary constraint or wider
source coverage, not another uninformative threshold adjustment.
