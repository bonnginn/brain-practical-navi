# Brain Practical Navigator: working instructions

## Current checkpoint

- 2026-09-12 evening extension reached a verified checkpoint around 17:30 JST, before its 19:36 JST upper limit. Pause autonomous development again to conserve credits until renewed user permission. The 75-voxel lateral repair, related meshes, layout fixes and references are verified locally. Read docs/RESUME_SUMMARY.md and docs/SEGMENTATION_NEXT_ROADMAP.md; no merge or publication. Earlier timing entries below are historical.

- 2026-09-12 additional window reached a verified checkpoint around 16:35 JST, before its 17:30 JST upper limit, and is paused again to conserve credits. The 196-voxel lateral repair and 11-voxel island removal are saved; the additional 672-candidate review remains unadopted. Read docs/RESUME_SUMMARY.md. Do not resume autonomous development without renewed user permission. No main merge or publication occurred. Earlier timing entries below are historical.

- 2026-09-12 bounded run finished verification around 15:25 JST, before the 15:27 deadline. This anatomy/segmentation goal is paused again at the saved checkpoint. Do not resume autonomous development without renewed user permission. See docs/RESUME_SUMMARY.md; no main merge or publication was performed or authorized in this run.

- 2026-09-12 user-authorized bounded resumption: work from 12:27 JST until no later than 15:27 JST, including verification and handoff. The user rebooted the PC and explicitly asked to continue at 12:34 JST; this does not extend the deadline. Single agent; no main merge or publication. The older pause below describes the previous checkpoint and becomes effective again after this window unless the user gives new instructions.

- Read docs/RESUME_SUMMARY.md first for the latest published baseline and next-update requests. This anatomy/segmentation goal is paused at the user's request on 2026-09-08 around 10:28 JST, before the earlier 11:00 JST deadline. The completed repair and verification checkpoint is saved; do not resume autonomous work on this goal without renewed user permission, including in response to an automatic goal continuation. No main merge or deployment is authorized. Separate user-owned tasks retain their own explicit scope and stop instructions.
- Keep README concise and bilingual. Put development history and new review notes in docs/; use docs/README.md as the index. Existing machine-read audit documents and public licence-link targets remain at the root for compatibility. Historical evidence may name a document by basename; look in docs/ if it is no longer at the root. Do not rewrite hash-pinned evidence just to rename documentation.

## Scope and evidence

- Preserve the user's changes. Develop on a task branch; do not infer permission to merge or publish from permission to implement.
- Canonical public entry: https://bonnginn.github.io/brain-practical-navi/ . A failure at the separate Sites URL is not evidence that GitHub Pages is down.
- Read the relevant handoff and audit documents for the current task, not every historical audit on every small edit. Historical results are not new verification.
- Check README for user-facing changes; distinguish development changes from published features.

## Agent policy (user preference, 2026-09-08)

- Use the current primary agent only. Do not spawn subagents, delegate implementation/review, or switch models/effort by subtask unless the user explicitly changes this preference. This supersedes the earlier Sol/Luna and Astra low/medium/high task-splitting policies.
- The user prioritizes conserving credits. Avoid duplicated investigation and redundant checks; keep necessary verification proportional to the change. Do not claim an actual cost saving or runtime-setting change without evidence.
- This preference update does not resume the paused development goal or cancel separately authorized user-owned tasks.
- Use required skills for their applicable task only. Do not edit globally installed skills or repeat all skill content in this file.

## Anatomical changes

- Model capability is not a substitute for raw-image evidence or a human expert review record. Keep model assessment, project adoption, and expert review distinct.
- Investigate segmentation and 3D defects proactively. Change a boundary only when the original image, adjacent slices and orthogonal continuity support the change; retain input/output hashes, a reversible patch and the rationale.
- Do not split mixed ID33 by coordinates, flood-fill ventricles into external background, or replace observed anatomy with decorative schematic shapes. Ambiguous boundaries remain explicit candidates, not silently accepted labels.
- Respect donor dignity, privacy, data licences and the non-official status of this educational project.

## Verification

- Run focused behavioral tests during implementation. Test failures are evidence to investigate, not assertions to remove merely to get a pass.
- At a coherent release checkpoint, run type checking, the full suite, the production build and relevant real-browser checks. Do not repeatedly restart expensive full-volume audits because their output is quiet.
- Record missing coverage honestly. Do not report anatomical validity from mesh connectivity, hashes, schema checks or test counts alone.
