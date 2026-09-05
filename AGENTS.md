# Brain Practical Navigator: working instructions

## Scope and evidence

- Preserve the user's changes. Develop on a task branch; do not infer permission to merge or publish from permission to implement.
- Canonical public entry: https://bonnginn.github.io/brain-practical-navi/ . A failure at the separate Sites URL is not evidence that GitHub Pages is down.
- Read the relevant handoff and audit documents for the current task, not every historical audit on every small edit. Historical results are not new verification.
- Check README for user-facing changes; distinguish development changes from published features.

## Model and effort policy (user preference, 2026-09-05)

- Do not keep the old fixed split of Sol for planning and Luna at high/max for implementation.
- Where model/effort selection is actually available, try Astra with low effort for bounded routine implementation, test maintenance, document synchronization, and straightforward investigation. Use medium for cross-module design and integration; high for difficult diagnosis or anatomical evidence review. Escalate further only for a concrete unresolved problem.
- This is a project working preference, not a change to the calling task's runtime settings. Never claim that the parent's model or effort was changed without an actual supported setting change.
- The current tool inventory exposes `gpt-6-astra` with low effort; it does not expose a separate `Astra Light` model. Do not assume those names are equivalent or invent model identifiers. Check current availability when dispatching work.
- Delegate only when authorized and when a bounded independent task can overlap useful local work. Avoid redundant reviewers, nested delegation, or copying the entire project history into every subtask. Report findings with evidence, not repeated progress boilerplate.
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
