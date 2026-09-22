# Public section 3D repair — 2026-09-16

This release is isolated from the ongoing segmentation branch. Source label SHA remains `785ce199e2c7226e5527a771e953d1b78cfed1067179aa04c63b9eba74577e0f`, identical to main at 64e39f0. No label volume, quiz inventory, block specimen, or segmentation revision is changed.

BigBrain section selection now uses uncropped meshes of the matching published labels. This fixes the right-only amygdala block fallback and missing mammillary-body counterpart, and removes source/crop mismatch for the other selectable structures. Sixteen compressed meshes are generated with existing 0.5 mm marching cubes; no smoothing, filling, component deletion or segmentation edits. Counts and hashes are in `public/atlas/section-current-nuclei.json`.

Regenerate/check using `scripts/build_section_current_nuclei.py --apply` / no arguments. `tests/section-all-structures.test.mjs` verifies selectable coverage, source and asset hashes, and full XYZ label/mesh bounds. This checks representation, not anatomical boundary validity. Small disconnected source fragments remain.

Distribution adds a separate 6 MiB ceiling for these lazily loaded meshes; previous base and Brodmann budgets remain unchanged. Rights inventory and its contract include all 17 new files. Ongoing fornix, visual pathway, ventricular and other segmentation changes are not included in this release.
