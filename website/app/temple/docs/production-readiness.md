# Temple of Sound production preparation

Requested 2026-10-30. Current scope: the visible opener and first verse/refrain, with the author's existing wording and layout. Later poem sections and practicalities remain unpublished. This is an integration checklist, not a deployment record.

- [x] Restore the established system light/dark palette. Cloud-text ink follows the theme on load and live appearance changes. Preserve the pure-black loading gate and dark background.
- [x] Restore the original theme-aware Temple SVG favicon in the working page. Production already has its own hashed asset and page-specific icon selection; reuse that path during integration.
- [ ] Replace the standalone preview adapter with ordinary application modules. `text.prototype/serve.tsx` currently reads pinned Git blobs and patches their source with string replacements. The regular build must bundle direct imports and immutable font/media assets, without Git or these substitutions.
- [ ] Put the visible poem back into CMX as the single content source. Its latest wording is currently rendered directly in `studies.tsx`, independently of the unpublished draft. Preserve semantic text/order and the agreed display casing; do not add later sections or new prose.
- [ ] Mount the complete scene as a Remix island with instance-owned rendering state and cancellation. The current `context.ts` starts on module import and aborts on `pagehide`; shared material/escape callbacks also live in module globals. Check ordinary navigation, back/forward restoration, repeated visits and teardown.
- [ ] Give loading a deliberate failure path. `context.ts` awaits fonts and the photograph without recovering the page's visibility gate if enhancement fails. Failed or unavailable assets must leave a usable, styled document rather than an indefinitely blank screen; no invented error copy is needed.
- [ ] Remove workbench markup, H shortcut, seek buttons, controls and their mandatory DOM selectors from the shipped scene. Being hidden by default does not remove their runtime dependency.
- [ ] Use the regular document shell for canonical URL, title, social metadata and indexing. The review page currently has a study title and `noindex,nofollow`; the application already owns production metadata and favicon selection. Reuse existing author-supplied metadata.
- [ ] Run the regular application build and behavioural checks against the integrated route, then check desktop/phone orientation, theme changes, reduced motion, loading/failure and navigation. Keep tests about application behaviour, not fixed prose details.
- [ ] Review animation on actual mobile hardware. The retained software-browser diagnostic still measures about33.4ms total-frame p95, above its25ms target, even though app draw time is within16.7ms. It does not establish consistent60fps on visitor devices.

The current preview is still on port8790 (`sand tunnel 8790`). Light mode and favicon restoration are implemented there; the remaining items must be completed before treating that preview as the production application. No merge or deployment has been performed.
