# September 5 improvement candidate — completion review

This is a development candidate for GitHub Pages, not a published beta or an anatomical approval. Base: main `773420c`. Branch: `codex/september-learning-review`. No deployment or merge is authorized by this record.

## Scope-to-evidence check

| Requirement | Implemented result and evidence |
| --- | --- |
| Canonical public entry | GitHub Pages loaded in the browser; existing canonical README/QR destinations retained. Separate Sites reachability is not a gate. |
| English | Source-to-catalog review of 7 surface views, 8 block guides, section notes/relations/functions, all 55 concept-question prompts/options/explanations, and pathway stages; English tests and actual browser checks in progress stages 6, 11, 13, 15–17. Unknown text is not automatically guessed. |
| Question-level review | v2 per-question history with conservative v1 migration, malformed-storage protection, and real wrong→different question correct→same question correct verification (stage 10); quiz-history tests. |
| Home/notices | Entry moved forward; surface note folded without deleting its qualifications. Actual home and expand/collapse checks (stages 2, 10). |
| Observation state | Per-plane positions, selection, layout, split ratio and 1/2 views stored locally; explicit revision-pinned links override local preferences. Reload, invalid revision, narrow layout and quiz destination checks (stages 3, 8–10); session/link tests. |
| Quiz design | Type filter, balanced structure/topic ordering, task-specific prompts, wrong-answer comparison. Existing 100 Japanese questions and keys unchanged. Comparator does not confuse visual target with answer key. Unit and browser evidence (stages 4, 10, 15). |
| Device/layout | Resolved phone mode owns CSS; surface controls moved below model. Explicit phone/desktop and measured narrow CSS widths checked; physical touch not claimed (stages 2, 10, 12, 15). |
| Old development UI | 8 blocks grouped by guided/free exploration; old model comparison archived, current MNI retained. Existing functionality/provenance preserved; source and browser tests (stages 5, 6, 10). |
| Review navigation | Only declared registry keys with existing observation targets get direct links; no fabricated position/legacy optic target. Mutation tests and actual mammillary/precentral navigation (stage 7). |
| Segmentation investigation | Pinned raw image vs label outlines: 52 mammillary, 15 optic and 64 ventricular slices. Additional 4 ventricular candidates not adopted; ambiguous coordinates and original-image checks recorded in SEPTEMBER_ANATOMY_IMAGE_REVIEW and SEPTEMBER_VENTRICLE_REVIEW. No label or mesh change. |
| Existing MNI investigation | Central-sulcus alpha comparison gave no clear improvement; candidate removed. New model not adopted; limitations retained (stage 11). |
| Maintainability/evidence | History, ordering, comparison, session, link and dynamic translation helpers isolated; negative tests; non-measured visibility bar removed. README bilingual candidate summary and handoff/roadmap links synchronized. |

## Verification status

- At stage 16: full suite 465/465, no failures/skips, 278 seconds; typecheck and normal build passed.
- Stage 17: English tests 29/29; prior pathway/English focused set 27/27; typecheck and normal build passed.
- Final candidate full-suite/Pages build/PR results: pending final recording. Do not treat this document as the completion gate until these are filled in.
- Browser evidence is local desktop Chrome/in-app rendering, including narrow CSS viewport overrides. It is not physical-phone, Safari, installed-PWA, or fresh public-deployment evidence.
- Main bundle remains about 596 kB minified and triggers the existing Vite 500 kB advisory; no build failure. No additional anatomy payload introduced.

## What still requires human review

The anatomical review candidates are not engineering blockers and are not silently accepted changes. Mammillary attachment/endpoints, optic-chiasm/tract separation, and third/fourth ventricular openings versus external spaces remain for specialist confirmation. No claim of whole-volume expert validation is made. Publication and beta-readiness decisions remain with the user.

## User walkthrough order

After the development/PR gate succeeds, show one item at a time: first the section observation link and restoration, then quiz history/type/comparison, then clearer home/3D controls, English corrections, and finally coordinate-specific anatomy review candidates. Start with one concrete operation and wait for the user's response; do not send a long checklist of operations.
