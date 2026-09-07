# Schematic nerve origin image review — 2026-09-06

## 2026-09-07: III disclosure aligned with existing image findings

The selected III note previously described a proximal schematic without explicitly
disclosing its observed midbrain-tissue course. Japanese and English now distinguish
that authored tube from traced intramesencephalic fascicles and state that the
extra-axial proximal course remains unresolved. This implements the prior whole-path
image finding; no new root trajectory, rootlet count, mesh or quiz eligibility is
adopted. Relevant tests8/8, type checking and normal build passed. In a separate
local in-app browser tab, III selection rendered the exact updated note in both
languages; the English model canvas was visually inspected. The note was confirmed
in the accessibility tree, not as visible in the first viewport. The user's existing
section tab was left untouched. No public deployment.

AI-assisted inspection, not expert review. No volume or mesh changes.

## Scope actually inspected

`render_nerve_origin_sections.py` renders all twenty III–XII origins using
the corrected display-to-volume coordinates from nerve-origin-context-v2.
All ten sheets were individually viewed: pair-00 through pair-09, each
containing left/right sagittal, coronal and horizontal raw500 comparisons
(60 central planes). `--midbrain-wide` additionally generated two sheets
for III/IV (12 wider comparisons), both individually viewed. These are
central planes, not continuous/adjacent-slice coverage or a review of every
point along each nerve. Do not describe them as reconstructed rootlets.

Artifacts and hash-bound reports:

- `work/anatomy-review/nerve-origin-sections-v1/report.json`
- `work/anatomy-review/nerve-origin-midbrain-wide-v1/report.json`

Yellow outlines are ID27, magenta boxes are rounded authored model origins.
The boxes do not indicate nerves identified in the original histology.
Source SHA, current label SHA86e3b22d…, mesh hashes and full display affine
are included in the reports. Scientific-image and display origins differ;
the invalid nerve-origin-context-v1 calculation is not used.

## Findings that change the next action

|Model group|Observation and disposition|
|---|---|
|III, both sides|The marked origin abuts the current ID27 edge, but that edge crosses continuous source tissue in the wide coronal/horizontal views. The label's known ventral midbrain omission makes this an unreliable attachment surface. Prior near-boundary distances do not establish the interpeduncular exit. Resolve the true ventral surface before moving or multiplying the model roots.|
|IV, both sides|The marks are on the posterior/lateral side of the brainstem label near cerebellar tissue in the wider views. These cuts do not independently identify the inferior-colliculus exit or trace the wrapping course; no exact exit approval.|
|V, both sides|Origins lie at the lateral source-tissue edge in the reviewed planes. No separate sensory/motor roots are resolved by these images; the single model path remains a simplification.|
|VI, both sides|Marks are near the anterior surface; the narrow central cuts do not establish the complete pontomedullary junction or its nerve exit. No movement from distance alone.|
|VII/VIII, both sides|Surface-adjacent origins; the two paths are distinct model structures, not a reconstruction of the facial/intermediate and vestibular/cochlear components. No rootlet inference.|
|IX/X, both sides|Origins are near the lateral/posterior tissue boundary, with surrounding cerebellar tissue visible. This does not identify individual roots or certify the retro-olivary attachment.|
|XI, both sides|The corrected display coordinates place the origins inside the source grid. Their inferior lateral placement does not supply the omitted spinal root or ascending course. No reconstruction claimed.|
|XII, both sides|Marks lie near an anterior-lateral tissue boundary. The central cuts do not resolve rootlet fans or independently certify the pre-olivary groove.|

Reference for the expected **gross** relationships, not this model's exact
coordinates: [UTHealth, Points of Attachments on the Gross Specimen](https://nba.uth.tmc.edu/neuroanatomy/L9/Lab09p01_index.html),
read 2026-09-06. It places III at the interpeduncular fossa, IV posteriorly
below the inferior colliculus, and distinguishes pontine from medullary
attachments. [UTHealth, Cranial Nerves of the Midbrain](https://nba.uth.tmc.edu/neuroanatomy/L4/Lab04p19_index.html)
also identifies III medial to the crus cerebri. These references do not
justify copying their coordinates or inventing a fixed number of roots.

## Next dependency

Prioritize the **III / ventral midbrain surface** dependency, not a cosmetic
global displacement of all nerves. The current centre-to-ID27 distance
screen is useful for gross disconnection, but is insufficient where ID27
cuts through observed tissue. Keep the roots explicitly schematic until
their distinct attachment anatomy can be supported. None of the twenty
origins is certified anatomically correct by these central cuts alone.
No user confirmation is requested from this preliminary local evidence.

## Whole-path ring-centre screen (not continuous fibre tracing)

`audit_nerve_path_tissue.py` produced
`work/anatomy-review/nerve-path-tissue-v1.json` for all twenty existing
III–XII paths, with fixed source/label/origin-record/mesh hashes. It samples
each authored mesh ring centre, using trilinear raw intensity and nearest
label in the display-to-image frame. It does not examine every tube vertex
or identify real nerve fibres. Label zero is **not** proof of extracerebral
space. The sampler rejects nonfinite/out-of-grid inputs and preserves
fractional intensities without making twenty full float-volume copies.

For each III path, four of sixteen centres intersect the corresponding RN
label and four intersect SN; eight are label zero. The first knot and even
the final knot retain source-tissue/partial-volume intensities. Two axial
figures, Z118 and Z120, were individually viewed:
`work/anatomy-review/oculomotor-path-sections-v1/`. The renderer draws only
centres within half a voxel of that plane, with ring indices and no joining
lines. Both show the authored course passing through source tissue. This
is not a reconstruction of an intramesencephalic fascicle and does not yet
locate the real ventral exit. Do not trim the model by an intensity threshold
or treat the nearest incomplete ID27 edge as that exit.

Important countercheck: Vitošević et al., *Intramesencephalic course of the
oculomotor nerve fibers* (2013), [original-study abstract](https://pubmed.ncbi.nlm.nih.gov/23242853/),
read 2026-09-06, describes different fascicular courses relative to RN and
reports that some intermediate fascicles traverse it. Therefore RN overlap
alone is **not anatomically impossible**. Conversely, this does not validate
the present hand-authored path as a traced fascicle. Distinguish internal
fascicles from the external proximal-root representation before repair.

The same numerical screen flags IV/V intersections with IDs17/18 and one
right V path with ID24, and substantial IX/X/XI intersections with
ipsilateral cerebellar labels (respectively left/right: 8/10, 7/8, 9/9 sampled
centres). These are specific sites for raw orthogonal/path inspection, not
newly approved anatomical errors or automatic re-routing instructions.
Those distal sites have not yet received the same plotted image review as
III. Existing rootlet limitations remain in force.

The true ventral III exit may be identifiable from source images independently
of completing ID27; completing the entire brainstem mask is not a mandatory
prerequisite to investigating it. Displaying adequate brainstem context is
a separate dependency. No volume or nerve mesh was changed at this checkpoint.

## IX/X/XI: source-tissue penetration confirmed at six reviewed sites

`render_medullary_path_review.py` generated six separate sheets at the
deepest sampled ipsilateral cerebellar-label intersection for each IX/X/XI
path. All six sheets were individually viewed: model IDs38–43, three axes
times offsets -1/0/+1 (54 local planes in total). The report pins the profile,
image and label hashes and each PNG; output is
`work/anatomy-review/medullary-path-sections-v1/report.json`.

|Model ID / nerve|Ring|Approximate app XYZ|Depth in current cerebellar mask (mm)|
|---|---:|---|---:|
|38 / left IX|7|156.096, 191.760, 60.016|2.96|
|39 / right IX|7|235.904, 191.760, 60.016|2.86|
|40 / left X|9|152.848, 194.240, 52.176|2.52|
|41 / right X|9|239.152, 194.240, 52.176|2.76|
|42 / left XI|13|146.688, 195.280, 47.872|1.81|
|43 / right XI|14|248.064, 196.880, 50.304|1.57|

The magenta centres lie in visible cerebellar tissue in the orthogonal raw
images, not merely in label overhang into empty space. IX crosses a paler
interior region; X/XI cross conspicuously folded tissue. This supports a
**model-placement defect at these sites**, rather than treating cerebellar
segmentation deletion as the remedy. Depth is a voxel-mask distance used
only to select sites; it is not a histological accuracy measurement.

Keep the original generator control points as pre-repair evidence. Do not
erase small cerebellar lobules or carve artificial channels to accommodate
the schematic nerves. The next step is to establish surface exit and an
extratissue proximal course for the schematic representation; no replacement
trajectory or rootlet count is approved by these six local checks. They do
not constitute continuous inspection of all path points. The volume and
meshes remain unchanged in this diagnostic step.

### Wider source context and the next repair constraint

The renderer's `--overview` output, `medullary-path-overview-v1`, adds raw
and outlined axial Z28/40/56/60/72/88; all six were individually viewed.
The existing IX starting sites sit far posteriorly relative to the anterior
brainstem outline, and the course enters the lateral tissue bridge. This
raises a starting-level/exit-location concern as well as the confirmed distal
penetration; it does not authorize retaining the first knot and merely
deflecting the rest anteriorly. The source's brainstem tilt and transitions
must be considered, not only constant display-Z levels.

Primary dissection reference: [Anatomic landmarks of the glossopharyngeal
nerve: A microsurgical anatomic study (2003), institutional abstract](https://openaccess.marmara.edu.tr/entities/publication/d3ff1690-6fb0-4c7b-afc5-aaf84454d279),
read 2026-09-06. It describes postolivary emergence and a course ventral to
the flocculus and lateral-recess choroid plexus. That relational constraint
supports correcting the tissue-crossing representation, but supplies no
BigBrain coordinates. No replacement trajectory has been adopted. The
separate PMC7051340 page returned a browser challenge and was not read.

During this review the English heading “hypoglossal nerve and cone olives”
was corrected to “Hypoglossal nerve, medullary pyramids and olives,” with an
exact regression assertion. This is a text correction only; it does not
validate the nerve geometry. README was checked: existing development-only
status remains accurate; no new feature or publication is claimed.
Focused English tests 4/4, TypeScript and normal build passed. Chrome152 at
local4345, English cranial-nerve route, loaded with canvas1 and no loader,
UI error, overflow or fallback. The attempted exact-heading browser check
failed twice (v1/v2): neither old nor new phrase is rendered in the current
individual-nerve UI. This is a legacy surface-structure catalog entry, not
a newly visible heading change. Keep those failed assertions as evidence,
not a claimed visual translation pass; the exact catalog correction is
covered by the unit assertion. No public deployment.

## Higher-resolution landmark review and temporary quiz hold

`render_medullary_native300.py` uses the original transformed 300 µm image
SHA ebf0e88d… (not an upsampled app volume). Five sheets / fifteen adjacent
planes were individually viewed: axial centres corresponding approximately
to app Z40/48/56 and left/right parasagittal centres X180/212. Source grid
indices, crop, image SHA and current label SHA are recorded in
`work/anatomy-review/medullary-native300-v1/report.json`.
The parasagittal views resolve the anterior brainstem transition more clearly,
but these planes do not identify a real IX/X/XI root exit. No new trajectory
or mask was adopted. Do not turn this observation into a falsely precise root
coordinate.

The six authored questions targeting cn9, cn10 or cn11 (three identification
plus three function questions, all using the highlighted model) are temporarily
withheld by `isQuizAnatomyAvailable` after visual and concept construction.
The stored bank remains 100; the runtime pool is 94. These names can remain
text distractors for other targets. This is an interim teaching safeguard,
**not completion of the geometry repair**. No rootlet or restored anatomy is
claimed. Authoring-bank audits that count100 are not runtime eligibility audits.

A Japanese/English notice explains the hold. Focused tests 5/5, TypeScript
and normal build passed. Chrome152, local4345, Japanese 1366×900 and English
390×844: runtime count94, notice present, canvas1, no loader/UI error/overflow/
fallback. Both screenshots were viewed; the phone notice is below the first
viewport, with its content confirmed by DOM (not first-screen visibility).
`work/quiz-anatomy-hold-browser-v1.json` and matching PNGs. Full Node rerun is
recorded separately, not assumed from these five tests.

Follow-up verification: the full Node run ended successfully, 518/518
(`work/quiz-anatomy-hold-full-node.log`). Subsequent audit-only changes report
authored and eligible inventories separately: visual neurovascular22/19,
including nerves13/10; complete bank100/94. They reject removal of the runtime
hold, require exactly cn9/cn10/cn11, and check that wrong-answer history cannot
restore held visual questions. Malformed concept collections still produce
validation failures instead of throwing in the new eligibility calculation.
The updated focused suite passed13/13. The earlier full run is not relabelled
as including those later audit changes. Normal dist was restored after the
full suite (`work/quiz-anatomy-hold-final-normal-build.log`). No running test
session remains from that run. Mesh repair remains outstanding.

## IV/V temporal-side intersections: further source review

`render_medullary_path_review.py --temporal` generated four sheets at the
deepest sampled hippocampal/ventricular-label intersections of model IDs28–31.
All four were individually viewed, nine adjacent orthogonal frames each
(36 planes), in `work/anatomy-review/temporal-nerve-path-sections-v1`.
The report records source/profile/label/PNG hashes and selected coordinates.

IV intersects near the medial temporal tissue surface in these images.
Its proximity to a coarse hippocampal label alone is not enough to equate
it with the deep IX–XI penetration defect, nor to certify it anatomically
correct. No IV quiz hold or mesh mutation is based on these cuts.

V is different: the plotted ring12 centres (approximately left XYZ130,240,97;
right262,240,97) lie in temporal tissue on all three central planes with
adjacent support. Numerical tracing also shows raw tissue from ring4 onwards
on both sides, well before the hippocampal label begins at ring10. Right
rings14/15 reach ID24 and raw background255, i.e. the ventricular-label
interior, not simply external free space. Those terminal sites have numerical
evidence, not their own new plotted orthogonal sheets. Do not trim only the
label17/18 intersections and assume the preceding raw-tissue path is valid.
Do not carve the temporal lobe or ventricle to fit the nerve.

Accordingly cn5's two model-dependent questions were added to the temporary
hold. Current authored100 / eligible92, held8 (four identification/four
function); visual neurovascular authored22 / eligible18, nerve13 /9. Previous
94/6 records above are history. Focused13/13, TypeScript and normal build
passed. Chrome152 local4345 Japanese1366 and English390 confirm92 and the
eight-question notice, with canvas1 and no loader/UI error/overflow/fallback
(`work/quiz-anatomy-hold-browser-v2.json`). New v2 screenshots were saved but
not individually viewed; prior v1 visual inspection is not relabelled as v2.
README and both question-bank/eligibility audits were synchronized. No label
or mesh changes. Remaining path review includes VI, VII, VIII and XII; label0
counts alone cannot establish that these paths are outside source tissue.

## VI/VII/VIII/XII local checks and proximal-crop candidate

`--remaining` rendered eight sheets: VI and XII at ring4, VII/VIII at ring12,
each in three orthogonal axes with -1/0/+1 adjacent slices. All eight sheets
(72 planes) were individually viewed in `remaining-nerve-path-sections-v1`.
VI's reviewed sites are in external background; XII's ring4 is surface-adjacent.
Neither result certifies the complete path or exact emergence anatomy.
VII/VIII ring12 centres lie within temporal tissue on both sides despite
having label0. Thus the segmentation-label-only check would miss these defects.

A **not-adopted** crop candidate is staged in
`work/anatomy-review/proximal-pontine-crop-v1/` by
`stage_proximal_pontine_nerve_crop.py`. It removes rings8–15 of VII/VIII only,
keeping existing rings0–7 vertex-for-vertex, with their radii and normals.
V and VI are unchanged. Faces referencing removed vertices are removed and
the retained indices remapped. No new end cap or invented terminal structure
is added; these were open-ended schematic tubes already. This is a proposed
limit of the displayed proximal segment, not the anatomical end of a nerve
or a reconstruction to the internal acoustic meatus.

The source mesh SHA is checked against the prior origin report, and before/
candidate meshes and SHA are retained. Every new terminal ring vertex samples
raw255 in the source image. Among retained rings1–7, only right VIII rings1/2
have vertices below250 (4 and2 respectively), requiring local image review
to distinguish intended root contact from another intrusion. The screen is
not proof of whole-face clearance between sampled vertices. The next step is
that attachment check and actual candidate display inspection, then a decision
on adoption or revised scope. Do not repeatedly generate equivalent candidates
or call raw255 an anatomical endpoint. Public meshes and quiz eligibility
remain unchanged at this staging checkpoint (92 eligible); VII/VIII's newly
confirmed defects still require resolution before this stage is complete.
New crop tests2/2 verify unchanged other nerves, exact retained geometry, and
rejection of malformed cutoffs/data. This is not the whole-goal completion.

### Candidate surface and browser checks

`audit_proximal_pontine_surface.py` samples each retained triangle on a
barycentric grid with subdivisions ceil(longest edge / 0.2 mm). This remains
a finite screen, not proof of continuous clearance. The fixed candidate SHA
is `1244f483c765ef084648a74bbad13cff78ea498d4edb9918e15812709e4fd823`.
The resulting `proximal-pontine-crop-v1/surface-sampling.json` finds raw<250
only in the first strip for left/right VII and left VIII, and strips0–2 for
right VIII. No sampled later-strip points have such signal. The right VIII
strip1/2 minimum is near app XYZ232.11,222.97,68.33 (raw223.5), a specific
attachment-review target rather than proof that all retained geometry is valid.

The candidate was displayed in isolated Chrome152 through interception of
only the exact local4345 pontine-mesh request, with SHA check and one successful
fulfilment. No product mesh was overwritten. `work/check-proximal-crop-browser.mjs`
and `work/proximal-crop-browser-v1/v2.json`: VII and VIII selected independently,
1366×900, canvas1, no loading/error/overflow/fallback. All four v1/v2 screenshots
were individually viewed. V1 lacked selected brainstem context and is not
attachment-display evidence. V2 selects midbrain/pons/medulla before each nerve;
the shortened white distal parts are visible, but proximal attachment is partly
obscured in this initial inferior view. This does not yet establish a useful
continuous root display or an anatomically correct origin. Next: source-image
inspection at the right VIII surface-contact coordinates and oblique context
views, without changing geometry merely to make it visible. Candidate remains
unadopted, metadata untouched, live site unchanged.

### VII/VIII proximal display crop adopted in development

The right VIII contact figure `proximal-pontine-crop-v1/right-viii-surface-contact.png`
was individually viewed: nine adjacent orthogonal planes show the selected surface
point at a small tissue edge near the brainstem surface, rather than the previously
identified distal temporal intrusion. Magenta is the same point projected into each
plane, not an observed nerve or centreline. This does not identify its tissue type
or certify the true VIII root exit. The retained proximal contact is not removed
merely to obtain a clean intensity score.

All four v3 candidate browser images (VII/VIII, two rotations each) were individually
viewed with selected midbrain/pons/medulla context. The short white proximal segments
remain visible from useful directions; attachments are partly occluded from others.
No geometry was moved for visibility. All four health probes passed; finite image/
surface sampling and screenshots do not establish complete anatomical validity.

`adopt_proximal_pontine_crop.py` reproduced the exact reviewed candidate using the
normal generator, then installed only the pontine mesh and synchronized metadata.
Original full-curve tangents are retained at the cutoff, ensuring identical retained
coordinates, radii, normals and faces to the staged crop. Other four overlay meshes
are byte-identical. A pre-crop fixture makes the change reversible. The adoption
record is `segmentation-patches/review/pontine-proximal-display-adoption-2026-09-06.json`.
This is removal of demonstrably unsupported distal display, not restoration of the
complete VII/VIII course. The exact exits, component separation and internal acoustic
meatus course remain unresolved. V and IX–XI remain held from the quiz (92 eligible).
Japanese/English UI notes and metadata disclose the cutoff, and the mesh URL has a
new cache revision. No segmentation-label changes or public deployment.

### V early-entry follow-up (no geometry adoption)

`render_trigeminal_proximal_review.py` produced four sheets (both sides, rings0/4,
three adjacent slices in each orthogonal axis); all four/36 planes were individually
viewed. Ring0 is near the brainstem surface. Ring4 already lies on/in temporal-side
tissue on both sides, not only at the previously reviewed hippocampal ring12.
No observed trigeminal fibres or precise exit were identified from these images.

`audit_proximal_pontine_surface.py --trigeminal` sampled all15 strips of the
unchanged V paths in the pinned candidate mesh. Near the origin, left strip1 has
only 11/1100 samples below250 (minimum248.43), right strip1 none; strip2 already
has 268/1320 and304/1320 respectively, minima156.17/160.77. These finite samples
locate the early tissue entry; they do not identify anatomy or warrant thinning
the tube. Retaining just rings0–2 would leave a very short, relatively thick stub,
not establish a correct separate sensory/motor root. No V crop adopted and its
quiz hold remains. Further work should prioritize defensible proximal display
and explicit surface-page disclosure of known placement defects, not silently
relabel this failed schematic route as anatomically reviewed.

### Verification and visible disclosure checkpoint

The VII/VIII adoption passed Python crop/generator tests4/4 plus origin/path tests5/5,
TypeScript, and the full Node suite521/521 (`work/pontine-proximal-full-node-v2.log`).
The first full run had two stale contracts (old URL and >=1000/2000 mesh sizes);
these were changed to the actual revision and exact 960 vertices/1760 faces, with
retained-ID checks. The focused contract rerun81/81 and subsequent full run passed.
The normal production build was restored after the suite's Pages build.

`work/pontine-adopted-browser-v1.json` verifies actual served model SHA1244f483…
without interception, four Japanese/English VII/VIII selections, normal health,
and translated cutoff notes. All four screenshots were individually viewed. This
post-adoption check focused on notes/default display; selected brainstem/oblique
geometry evidence is the earlier identical-hash candidate v3, not re-labelled here.

A subsequent bounded text-only change now discloses the known V temporal and
IX/X/XI cerebellar placement defects directly in their selected surface-page notes,
in both languages. No new geometry/label change or quiz eligibility change. The
notes warn against use as correct-course identification figures and state that
related questions are withheld. Focused tests18/18, TypeScript and normal build
passed after this text change; it is not included in the preceding full521 result.
`work/nerve-placement-notes-browser-v1.json`: all four nerves in both languages,
normal health, actual served SHA unchanged. All four captured V/XI screenshots
(Japanese/English) were individually viewed; IX/X have DOM checks but no screenshots.

Historical `audit_quiz_target_visibility_browser.mjs` still pins older labels and
meshes (including pre-PComm/pre-VII-VIII); its old live results are not current mesh
validation. A later complete visibility rebaseline must preserve historical evidence
and account for the current quiz holds. Do not silently replace its manifest and
claim a fresh live pass. No main merge, commit/push or deployment in this checkpoint.

## Medullary proximal review: simple truncation rejected

`render_trigeminal_proximal_review.py --medullary` rendered the six IX/X/XI
origins with adjacent orthogonal planes (six sheets,54 planes), all individually
viewed in `medullary-proximal-v1`. The raw image and current label hashes are
checked; magenta projects the existing model origin, not observed nerve fibres.
IX origins sit at the brainstem/cerebellar-side tissue interface. Its next samples
already run through tissue (right ring1 label29/raw176.5; left ring2 raw212.0).
X/XI origins are near the lateral source surface, with narrow gaps and adjacent
cerebellar profiles. No independent olive/root-exit landmark was identified.

Decision: do not apply the VII/VIII cutoff mechanically to these six paths.
For IX especially, shortening cannot preserve an established extra-axial proximal
course because even that course has not been demonstrated. No root displacement,
new rootlets, cerebellar deletion or mesh adoption. Existing placement warnings
and quiz holds remain. This adds adjacent-origin evidence to the earlier central
origin panels and distal intrusion review, rather than claiming an entire nerve
has now been anatomically reconstructed. Continue other segmentation work while
these paths require independently located emergence landmarks.

## New independent source: same-specimen auditory nuclei

Sitek et al. (2019) explicitly omit the cut CNVIII root from their BigBrain
histological labels; their postmortem MRI atlas is a different specimen. The
BigBrain nuclei atlas is available, but uses an author-corrected MNI registration,
not a demonstrated match to our current Xiao space. A fixed-commit file was
downloaded to work and inventoried without mutation. Numeric ID names and
registration correspondence remain unverified. See AUDITORY_ATLAS_REFERENCE_REVIEW.md.
This is a new potential landmark source, not endorsement of our VII/VIII paths
or a completed repair of V/IX–XI. No model, label or quiz changes in this step.
