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

## Second pair release, 2026-10-30

The artist explicitly requested cleanup and deployment of both verse/refrain pairs. Preserve the current main native sticky-layer renderer and50px opener handoff. The CMX source owns both pairs and explicit chorus line breaks; scene configuration retains only the selected Bézier points. Curve controls and their mutable runtime state have been removed. Phrase entry uses native scroll timelines, with static first phrases and accessible/reduced-motion fallbacks.

Validation: full build, both TypeScript checks, formatting and13 content-tooling tests pass. The app build and website checks also pass with `content/` absent:34 Node and59 Chromium browser tests. All16 Temple tests pass after adding explicit three-line chorus coverage. Synthetic multiple-pair glyph diagnostics in Chromium and WebKit cover51 rows/glyphs with maximum baseline drift below0.02px. The diagnostic now matches repeated glyphs by baseline origin as well as text and canvas size; its earlier apparent10.92px drift compared different occurrences of the same letter.

## Repetition scrolling follow-up, 2026-11-01

Artist reports lag in the bumped outgoing block of the three repeated statements on iOS. A synthetic handoff check freezes scene RAF callbacks, including queued ones, while native scrolling continues. The frame-driven transform follows only30px of a30px scroll where the intended outgoing trajectory requires60px. This reproduces scroll/render desynchronization without claiming a physical-device frame-rate measurement.

Prepare the existing collision-resolved trajectories once per fit and play stage transforms, reflection opacity and reflection entry on native view timelines. Keep the quadratic incoming deceleration, compact50/50 contact and8px separation. Native timelines reference each track rather than total document height, so later bridge pagination cannot invalidate the handoff. Resize and motion changes replace/cancel owned animations; navigation releases them. Preserve the frame-driven fallback for unavailable timelines, reduced motion and native print/forced-colour text. Safari26.4 introduced compositor-thread scroll animations; see [WebKit’s release notes](https://webkit.org/blog/17862/webkit-features-for-safari-26-4/#threaded-scroll-driven-animations).

The390×900 synthetic Chromium sweep with `REPETITION=true` compares the same renderer with and without native timelines. Repetition layout reads fall from225 to0 across75 frames. Scene draw p95 falls from13.8ms to9.5ms; total-frame p95 is16.8ms in both runs, with4 versus0 intervals above25ms. These are software-browser samples, not a phone60fps guarantee. Both handoffs also move forward and backward with scene RAF callbacks paused in Chromium and WebKit. Physical iPhone review remains the final feel check. Preview: `sand tunnel 8798`, then `/temple-of-sound`.

Validation: full build, root and website TypeScript, formatting and47 Node checks pass. The final full Chromium run passes90 checks; the10 targeted repetition, reflection and lifecycle checks also pass in WebKit. An earlier first-verse selection assertion failed once, then passed three isolated reruns and the clean full run.

## Repetition release nudge, 2026-11-01

Artist notices a small downward movement before the next block bumps in. A one-pixel scroll sweep reproduces up to0.8px of downward travel at native sticky release in the timeline renderer, while the frame-driven fallback stays steady. The release keyframe used `stage height - track height`, omitting the sticky top offset. Linear interpolation therefore crossed the actual release boundary and briefly overcompensated for native scrolling.

Include the exact release boundary, `sticky top + stage height - track height`, in the native samples. Preserve the native timelines, trajectories, reflection timing and spacing. The regression measures the visible statement around both releases at390×844,430×932,844×390 and1440×844; downward movement must stay below0.05px. The new check fails before the correction and passes afterward in Chromium and WebKit.

Validation: app build, root TypeScript, formatting,47 Node checks,94 Chromium checks and14 targeted WebKit checks pass. The original complete Chromium replay reports zero downward reversals across245 frames.

## Chorus entry after Safari toolbar collapse, 2026-11-01

Artist reports chorus lettering clipped as it enters the taller iOS viewport after the toolbar collapses. The native chorus canvas and glyph mask contain the full phrase, but the shared material and visibility checks stop at the opener’s100svh stage. Consequently, visible glyphs below that boundary have no material to reveal.

Keep the accepted opener crop, sticky centre and scroll timing tied to the stable small viewport. Extend the chorus material and escaped-light canvas to100lvh, and use those shared bounds when deciding which chorus masks to draw and paint. This prepares the exposed strip without reallocating the material as browser controls move. See [WebKit’s viewport-unit definitions](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/).

The synthetic browser regression separates a700px small viewport from an844px visible viewport and uses an opaque image to compare painted glyphs with their mask. It checks chorus entry wholly below the small edge and straddling it. The original renderer fails; the corrected renderer passes in Chromium and WebKit. This emulates the geometry in desktop WebKit; physical iOS toolbar behaviour remains a device review.

Validation: build, both TypeScript checks, formatting and60 Node checks pass. All104 Chromium checks pass across the full and targeted runs; the desktop handoff sweep exceeded its30-second budget in the full run, then passed alone in34.2 seconds with a90-second limit. All13 targeted WebKit checks pass, including chorus rendering, multiple choruses, responsive rows and navigation cleanup.

## Floating-toolbar clipping follow-up, 2026-11-02

The artist reports that the viewport-height change did not resolve the issue. Their iPhone recording shows a straight horizontal cut above Safari’s collapsed address pill while the chorus scrolls into view; ordinary background content continues below it. The earlier desktop test checked only pixels inside a measured viewport and could not establish that the iOS defect was fixed. An [Apple Developer Forums report](https://developer.apple.com/forums/thread/800798) describes matching clipping of sticky/fixed content behind Safari26’s floating controls. This is a working diagnosis from the recording and report, not a reproduction of Safari’s browser UI in desktop WebKit.

Enter each chorus in ordinary document flow. Arm its existing native sticky positioning once the full stage fits inside the stable small viewport, before the centred hold starts. Returning to the toolbar area restores ordinary flow. Switching modes before lock preserves the native geometry and lets the browser own the hold without scene frames. Keep the original hold length, release, font swaps and opener treatment.

Prepare chorus masks one stage beyond the measured viewport and paint their complete canvas. Clamp material sampling to a full-height slice at viewport edges; when the canvas is wholly inside, its original viewport alignment is unchanged. This avoids a separate transparent strip in the lettering when Safari exposes content beyond the measured paint area. The original photograph raster size remains stable.

The strengthened synthetic pixel check now compares the entire glyph mask, including off-viewport rows; it fails before the sampling correction. Geometry checks at390px and440px verify ordinary-flow entry and return, and a native centred hold with animation frames paused. They fail against the always-sticky renderer and pass with the workaround. These checks validate the mechanism, not the iOS browser chrome: the artist’s iPhone recheck remains the final pass/fail signal for the reported cut.

Validation: app build, formatting, root and website TypeScript,60 Node checks, the complete106-test Chromium suite and15 targeted WebKit checks pass. The browser geometry checks cover entry, return and native lock at390px and the recording’s440px width. Physical iOS confirmation is still pending.

## Scope the workaround to detected iOS Safari, 2026-11-02

The artist asks to apply the toolbar fix only on detected iOS Safari. Gate ordinary-flow entry, overscan, complete-canvas material sampling and large-viewport escaped light on the same detector. Other browsers retain their original sticky entry, viewport culling and material crop.

Identify iPhone/iPad/iPod Safari by its WebKit and Version/Safari tokens, excluding identifiable alternative iOS browsers and web views. iPadOS can present a desktop Mac user agent, so include `MacIntel` with more than one touch point; Mac Safari without touch remains on the original path. See [WebKit’s iPad desktop-user-agent announcement](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/). This detection scopes a browser-UI workaround, not general touch support. Owned DOM markers are removed on teardown.

Detection coverage includes iPhone/iPad Safari, desktop-mode iPad, Mac Safari, iOS Chrome/Firefox/Edge/Opera/DuckDuckGo/Google, iPad desktop-mode Chrome, web views and Android. Browser checks run the positive iPhone path and compare desktop Safari, desktop-mode iPad Safari and iOS Chrome. UA emulation verifies branching; it does not emulate Safari’s toolbar compositor.

Validation: app build, formatting, both TypeScript checks,73 Node checks (including13 detection cases), all109 Chromium checks and18 targeted WebKit checks pass.

## Final verse release, 2026-11-02

The artist requests deployment of the final verse, accelerating Cinzel rise, three-line drop and closing chorus. Publish the selected CMX wording and display casing; remove all tuning controls. Preserve main’s accepted fragment ground, withdrawn invitation action, native repetition movement and iOS Safari toolbar fixes during integration. Final chorus has78svh runway and ends at its centred last phrase. Its spacer uses the stable artwork viewport because mobile innerHeight can expand transiently during initial overflowing font fit.

Combined validation:60 website Node checks,13 content tooling checks, all118 Chromium cases (the long forward/reverse handoff replay passes alone after timing out under parallel load), and9 targeted WebKit rise/ending checks. Mark that324-frame replay slow without weakening its geometry assertions. Full build, website/content/root TypeScript, formatting and published CMS compatibility checks pass. Omit absent fixture children instead of emitting undefined so signed-publication checks remain strict JSON. Physical Safari browser chrome remains outside headless emulation coverage.
