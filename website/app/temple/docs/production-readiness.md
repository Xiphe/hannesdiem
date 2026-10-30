# Temple of Sound production preparation

Requested2026-10-30; implementation on `codex/temple-first-text-studies`. Scope: the current opener and first verse/refrain, preserving the artist’s wording, casing and layout. Later poem sections and practicalities remain unpublished. No deployment has been performed.

- [x] Restore system light/dark appearance, cloud ink and the pure-black loading gate. Live changes read explicit CSS palette tokens: media-query events can precede the browser’s updated `light-dark()` used colour.
- [x] Use the original theme-aware Temple favicon through the regular hashed asset build and document shell.
- [x] Replace the standalone server and pinned-Git source patches with direct application modules. The regular build bundles immutable fonts, icon and the existing responsive media reference. Git is not a runtime/build input for this scene.
- [x] Make CMX the single source of the visible poem. `content/pages/temple-of-sound/index.tsx` owns the typed first pair; the unpublished draft reuses it. Browser code renders passed data without importing authored content or the CMX runtime.
- [x] Mount as a Remix island with instance-owned rendering state. Navigation aborts tasks/listeners/observers/RAF and releases cloud surfaces. Repeated visits create new instances. Pagehide/pageshow pause and resume a still-connected page for BFCache; lifecycle-event tests cover this separately from normal back/forward navigation.
- [x] Recover from font/photo failure or hanging assets to styled native content, with no invented error copy. Black startup ends after the first complete frame. An8-second timeout aborts partial enhancement; a separate CSS watchdog covers missing JavaScript. No-JavaScript content is immediately readable.
- [x] Remove workbench HTML, H shortcut, controls, seek handlers and their required selectors. The former workbench is recoverable from `7eeabb0`.
- [x] Use the existing route’s title, canonical URL, social metadata and indexing through the normal document shell. No study title or study-only robots directives remain.
- [x] Build the application and run behavioural checks against synthetic CMX input. Coverage includes delayed loading, asset failure, missing/no JS, live themes, native selection, forced colours/print, viewport changes, navigation and teardown. Chromium/WebKit viewport review and actual-route performance measurements are recorded below.
- [x] Artist reviewed current iOS Safari on mobile and confirms “scroll performance ist super jetzt!” after deployment. This is visitor feedback, not a measured frame-rate guarantee.

## Validation evidence

Automated checks: `npm run check:website` boundaries (Prettier, generated Worker types, website TypeScript,21 unit/integration checks and13 browser checks). Tests exercise application behaviour, not snapshots of authored prose. The integration tests caught and fixed fixed-canvas link interception, loading-gate CSS specificity and stale theme-colour reads.

Local actual-content review: regular Worker at `http://localhost:8790/temple-of-sound`, via `sand tunnel 8790`. [Runtime architecture and diagnostic command](../README.md). Physical-device review remains open; this checklist is not publication approval or a60fps claim.

Measured on the integrated Worker: Chromium and WebKit390×844,844×390 and1440×960, no page errors or horizontal overflow. The requested0.6rem headline gap measures9.6px (WebKit rounds to9.59375px). The fixed-canvas link layer and native tracked-text advance boxes have explicit containment. A reduced-motion regression exposed section-height/refit feedback; resizing now reacts only to reading width and viewport dimensions, not its own derived section height.

Software-rendered960×540 diagnostic: app draw p95=9ms, maximum12.2ms; total-frame p95=33.3ms,7 of74 intervals over25ms. Main-thread budget passes; total-frame budget still fails. Measure a physical phone before claiming smooth60fps. The diagnostic follows actual scene paints and works with minified callbacks.

WebKit glyph-mask regression: pre-paint baseline probes differed from settled DOM by up to about7px. Wait for native layout before caching masks; defer resize masks in the existing frame loop. `debug/ink.mjs` now checks every copy row against its settled baseline:15 rows, maximum drift0px in both Chromium and WebKit. This supplements screenshot review and the regular synthetic browser suite.

Main integration,2026-10-30: preserve the newer CMX image import, evaluated metadata and `content/pages/temple-of-sound/index.tsx` route. The typed pair extends `contracts/components/temple.d.ts`; synthetic fixtures/browser coverage stay under `website/app/temple/tests/`. Diagnostic assertions now default to the synthetic Worker on8791, following main’s test policy. Earlier actual-route measurements above are historical review evidence, not authored test fixtures. The artist explicitly requested integration into `origin/main`; deployment will be driven by its existing ordered workflow.

Merge validation: the app build and `check:website` pass with `content/` absent (34 Node checks and54 browser checks). All13 content tooling tests, full/content TypeScript and repository formatting pass. Synthetic glyph-mask diagnostics report13 rows with0px baseline drift in Chromium and WebKit. The navigation teardown test now waits for the old island to unmount: history changes before the replacement frame commits. Its cleanup assertion passed eight repeated runs after this correction; runtime cleanup needed no change.

## Mobile scrolling follow-up,2026-10-30

Artist reports first-line exposure and delayed opener/chorus movement during fast scrolling on current iOS Safari. The first line previously began at exactly100svh with no breathing room. Its handoff now accounts for100lvh and adds32–64px (about51px at390×844). Small-viewport units still keep the artwork stable while the browser chrome moves.

The original renderer painted both moving masks into a viewport-fixed canvas. Native document scrolling could move ahead of its next JavaScript repaint. The title now exits in a native sticky track; the chorus paints in its existing native sticky canvas. The photograph, mist and glimmers retain viewport alignment and share their animation clock, with a separate foreground canvas for escaping light. Direct masking removes the opaque full-screen veil. The unchanged photograph is cropped once per raster size; offscreen material and out-of-canvas glimmers are skipped. A GPU particle-batch trial was slower in the test browsers and was removed.

Regression checks pause animation frames and verify that the title still leaves with the document, and that the painted chorus canvas moves natively. Chromium's website suite passes56 browser and34 Node checks; all13 Temple browser checks also pass in WebKit. Synthetic glyph-mask diagnostics retain0px baseline drift in both engines. The390×844 software Chromium diagnostic measured10.5ms draw p95 and16.7ms frame p95 with no intervals above25ms. DPR3/4×CPU stress remains above budget (over50ms draw p95); it does not establish physical iPhone performance. Native scrolling addresses the geometry lag independently of these rendering limits. Physical-device review remains required before any60fps claim.
