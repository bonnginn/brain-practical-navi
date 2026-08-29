# English edition audit

Updated: 2026-08-30

## Current state

The unsafe first English draft was withdrawn on 2026-08-29 after repeated words, missing terminology, malformed punctuation, and meaning loss were found in learner-facing text. It was not retained as the release translation.

The replacement catalogue was rebuilt with deterministic repairs and explicit translations for learner-facing UI, anatomy descriptions, quiz text, limitations, provenance, privacy, licensing, and donor-respect statements. The English learner routes are enabled again in the current pull-request candidate. This is a project-reviewed preview, not an expert-verified medical translation or independent native-language proofread.

An external AI-assisted browser review on 2026-08-29 identified residual corruption in short anatomy labels, controls, and several quiz prompts that the first rebuilt audit did not catch. The 2026-08-30 candidate corrects the reproducible findings rather than accepting the report wholesale. In particular, QR alternative text was already correct and was not changed. The anatomy names are now deterministically derived from each learner item's English or Latin source term where available, while explicit reviewed translations pin the affected atlas parcel names, controls, and anatomy prose.

## Public scope

The English edition uses the same learner application and routes as the Japanese edition. It is selected with `?lang=en`; Japanese remains the default. The language switch retains the current learner route and UI query parameters.

English includes Home, Brain Surface, Sections, Block Specimens, Review Quiz, help, private feedback, beta status, and terms/credits. The collaborator-recruitment page and contributor segmentation editor are intentionally absent. Direct English requests for either contributor-only route resolve to learner Home.

Desktop and phone access links retain `lang=en` in English mode. Existing QR bitmap payloads still point to the Japanese-default public entry; clicking their surrounding cards preserves the current locale.

## Translation and review boundary

- The committed catalogue covers more than 1,800 extracted Japanese source strings.
- `scripts/repair_english_catalog.mjs` records deterministic global repairs and exact reviewed overrides instead of relying on an unrecorded manual edit.
- Learner structures that provide a `name` and `latin` pair are regenerated through the shared English anatomy display map; this prevents substring replacement from turning anatomical names into unrelated everyday words.
- Critical terms are pinned, including subthalamic nucleus, substantia nigra, optic chiasm, putamen, corpus callosum, hippocampus, amygdala, nucleus accumbens, medulla oblongata, and cerebellum.
- Single-character substring substitutions are prohibited; exact single-character text nodes remain supported. This prevents particles such as `の` from corrupting longer text.
- The Japanese edition remains the canonical project source. Expert anatomy review, independent language review, and deployed-device review remain pending and must not be implied by “project-reviewed”.

## Automated checks

`scripts/audit_english_catalog.mjs` and its mutation tests reject:

- incomplete catalogue coverage, blank or non-string values;
- Japanese script remaining in English output;
- generic `Home` substitutions on unrelated strings;
- known corruption tokens from the withdrawn draft;
- malformed Japanese punctuation in English values;
- a word repeated three or more times;
- drift in critical neuroanatomical terms.
- regression to the externally reported corruptions, including malformed cranial-nerve, cortical, vascular, internal-capsule, and quiz wording.

The corrected anatomy content includes the medial and lateral **occipitotemporal** sulci around the fusiform gyrus, ascending and descending fibres in the internal capsule, and the internal capsule's relationship to the caudate nucleus/thalamus medially and lentiform nucleus laterally. Neurovascular quiz captions are moved from the lower canvas edge to the upper right so they do not cover lower cranial-nerve roots. Target-specific camera orientation, including a dorsal initial view for cranial nerve IV, remains subject to live visual review and is not inferred from text alone.

The normal TypeScript check, full automated test suite, production build, and route-level browser observation remain required before the pull request is considered ready.

## Local browser observation

On 2026-08-29, the rebuilt production output was inspected on loopback in the Codex in-app Chromium browser. Home, lateral Brain Surface, horizontal Sections, lateral-ventricle Block Specimen, and Review Quiz were checked in the normal desktop viewport and again at 390 × 768 with `ui=phone`. All ten observations had zero document-width overflow, zero visible non-error loaders, zero visible UI errors, and no unintended Japanese learner text. The intentional `日本語` language switch is excluded from localization.

On 2026-08-30, the follow-up correction was checked in the production preview on loopback. Home QR alternative text, the lateral Brain Surface nomenclature note, quiz filter/count labels, and the reported prompts for substantia nigra, mammillary body, cuneus, brainstem, thalamus, putamen, fusiform gyrus, and internal capsule were inspected directly. The cranial-nerve XII and IV quiz targets were also checked visually. The target caption no longer covers the lower nerve roots, and cranial nerve IV now opens at a target-specific rotation (`x=-42`, `y=-118`) where the highlighted schematic nerve is visible. The final observed quiz state had one canvas, no active loader, no visible UI error, no document-width overflow, no console warning/error, and no Japanese learner text other than the intentional `日本語` switch.

The English feedback, terms/credits, and beta-status dialogs were also inspected. The feedback dialog linked only to the dedicated English responder URL. A direct English request for the contributor-only collaboration route resolved to learner Home. This local check does not cover every state reached after every interaction and is not evidence for the public deployment or a physical device.

## Feedback form

The English edition uses a separate English feedback-only Google Form through `VITE_FEEDBACK_FORM_URL_EN`; it never falls back to the Japanese form. The form is anonymous by default, has optional reply contact, and contains neither file upload nor collaborator recruitment. Google Forms controls such as Submit and Required follow the respondent's browser/Google locale and can appear in Japanese on a Japanese-language device even though the form content is English.

Editing and response-sheet URLs are operational secrets and are not committed to the public repository.

## Known limits

- The replacement has project review only; expert and independent native-language review remain pending.
- QR bitmap payloads still open the Japanese-default entry, although clicking each QR card preserves English locale.
- Public URL, physical phones/tablets, installed-PWA language persistence, Safari, and assistive-technology reading order require post-deployment observation.
- A complete English-form submit/delete lifecycle in both Forms and its response sheet remains untested.
