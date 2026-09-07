# Anatomical development integration checkpoint — 2026-09-06

Development branch only; no commit, merge or publication performed at this checkpoint.
This verifies software/data integration, not anatomical correctness or expert approval.

## Executed verification

- TypeScript `tsc -b`: success.
- Complete Node suite: 513 passed, 0 failed/skipped; 206.59 s.
  Log: `work/anatomy-checkpoint-node-20260906.log`.
- Python unittest discovery (`tests/test_*.py`): 122 passed; 168.206 s.
  Log: `work/anatomy-checkpoint-python-20260906.log`.
- Pages build: success, `work/anatomy-checkpoint-pages-20260906.log`.
- Normal build restored to `dist` after the Node suite: success,
  `work/anatomy-checkpoint-normal-20260906.log`.
- Existing bundle-size warning remains; it is not an anatomical or test failure.

## Real-browser loading checks

Chrome 152.0.7977.76, Windows, localhost:4345, cold profile, service-worker bypass.
These are automated loading/health probes, not a new full visual or touch audit.

|Route|Viewport|Evidence file under work/|
|---|---|---|
|sections/horizontal|1366×844|anatomy-checkpoint-horizontal-20260906.json|
|sections/coronal|390×844|anatomy-checkpoint-coronal390-20260906.json|
|surface/cranialNerves|390×844|anatomy-checkpoint-nerves390-20260906.json|

All three were stable, with canvases present, loading count zero, no console,
request or UI errors, no horizontal overflow and no WebGL fallback.
The horizontal request trace includes segmentation revision `e7e61a7060c7f1dd`.
No physical phone, installed PWA, offline cache or public deployment was tested here.

## Documentation consistency

README and DATA_AND_LICENSES still stated that cranial nerve origins were aligned
to the brainstem surface. Replaced that present-tense precision implication with
the actual status: schematic proximal paths; current surface distance and exact
exit zones unvalidated. The README also states this in English. No geometry changed.

## Not complete

The midbrain upper boundary remains awaiting the previously supplied review figure.
Optic IDs36–38, precise mammillary attachments, capsule subdivisions and other
unresolved structures remain explicitly listed in ANATOMY_REMAINING_WORK.md.
Passing this checkpoint does not resolve those anatomical requirements.
