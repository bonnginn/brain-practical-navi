# English edition audit

Updated: 2026-08-29

## Public scope

The English edition uses the same learner application and routes as the Japanese edition. It is selected with `?lang=en`; Japanese remains the default. The header provides a language switch that retains the current learner route and UI query parameters.

The English edition includes Home, Brain Surface, Sections, Block Specimens, Review Quiz, help, private feedback, beta status, and terms/credits. The collaborator-recruitment page and contributor segmentation editor are intentionally absent. Direct English requests for either contributor-only route are replaced with the learner Home route.

Desktop and phone access links retain `lang=en` in English mode. The existing printed QR images remain the Japanese-default public entry; their enclosing links open the current language edition when clicked.

## Translation method and review boundary

The committed catalogue is a deterministic, local machine-assisted first translation of the current Japanese source strings. High-risk anatomy terms including subthalamic nucleus, GPe, GPi, and mammillary body have explicit project-reviewed overrides. The catalogue contains no Japanese-script output.

This is an educational alpha translation, not an expert-reviewed medical translation. Japanese content remains the canonical project source. Anatomy, functional descriptions, donor/privacy cautions, and natural English should receive a separate expert/language review before the English edition is described as verified.

## Automated checks

- English selection is explicit and Japanese stays the default.
- Language switching preserves the route and UI mode.
- Contributor-only routes are excluded in English.
- English access links preserve desktop/phone mode.
- The committed catalogue has full extracted-string coverage, no Japanese-script output, and fixed terminology checks.
- TypeScript, production build, and the existing learner/audit regression suites remain required before publishing.

## Known limits

- Translation quality is project-reviewed only for selected high-risk terms; expert and native-language review remain pending.
- QR bitmap payloads still point to the Japanese-default entry, although clicking each QR card preserves the English locale.
- Public URL, physical phones/tablets, installed PWA language persistence, Safari, and assistive-technology reading order require post-deployment observation.
