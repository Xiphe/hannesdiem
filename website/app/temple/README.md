# Temple of Sound

The opener, location invitation, first three verse/refrain pairs and bridge render through the regular CMX document and Remix island at `/temple-of-sound`. Unpublished source material remains in `content/pages/temple-of-sound/_draft.tsx` and are not published.

CMX contract: `contracts/components/temple.d.ts`; tests and synthetic input: `tests/`; fonts/favicon: `assets/`.

## Content and rendering

- `location/` renders the accepted location invitation immediately after the opener. Its copy and room photo live in the CMX content module; the shared Opening task owns its map enhancement. See [location implementation](location/README.md). The retired standalone study is archived at `b8e61ec`; no prototype server or duplicated artwork ships.

- `repetition.ts` coordinates the third verse’s centred statements, delayed reflections and compact50/50 handoffs. Fit-time keyframes share the collision model and use native view timelines for movement, reflection opacity and entry, so delayed scene frames cannot leave the bumped block behind. Resolve positions together to maintain8px separation; no compression. Resize rebuilds the timelines; reduced motion and unavailable timelines retain the frame-driven sticky fallback. Navigation cancels all owned animations.
- `content/pages/temple-of-sound/index.tsx` owns the typed verse/refrain pairs, including display casing and font roles. The unpublished draft reuses it. The browser never imports content modules or CMX runtime.
- `poem.tsx` resolves the immutable1920px media variant and passes serializable data to `Opening`. `first-pair.tsx` renders native paragraphs and selectable source text; no duplicated authored copy or workbench controls.
- `opening.tsx` owns the Remix task and cancellation. `artwork.ts` coordinates fitted text, copy colour and each bounded refrain. `scene.ts` owns the shared RAF, title mask and pointer/idle disturbances. Native sticky canvases own the opener exit and chorus travel; a delayed animation frame cannot leave their geometry behind. The same viewport-aligned material paints directly into each visible canvas; escaped glimmers use one inert foreground layer.
- `atmosphere.ts` and `escapes.ts` create instance-owned textures, coverage maps and particles. Only immutable noise samples/functions live at module scope. There are no import-time DOM reads, cross-instance rendering callbacks or Git source patches.
- `block-type.ts` fits native ink rows after fonts load. Resize work watches only width/viewport inputs and runs in the shared frame; derived section height never feeds back into fitting. Wait for native baseline layout before caching glyphs (a two-frame startup barrier, and deferred masks on resize), including WebKit. `copy-colour.ts` caches native glyph masks and paints a shared128px colour field at most10Hz. Offscreen text pauses; no PNG encoding or per-frame DOM colour styles.
- Phrase groups share one cached cloud mask each, so native scroll-timeline entry moves the whole phrase and its material together. Entry decelerates to the existing layout across the lower40% of the viewport. The first phrase of each verse and after each refrain stays static; the spread-out address is its own phrase. Reduced motion, print, forced colours and browsers without scroll timelines retain normal flow.
- `curve.ts` holds the artist-selected Bézier points. `block-type.ts` fits selectable native letters to that baseline and its tangents only during layout; `copy-colour.ts` applies the same transforms to its cached ink masks. No editor code ships.
- Black startup gates the document until the first completed frame. A centred broken-arc indicator and the artist-requested “loading” label appear after300ms. They share the warm/cool ink palette, with a system font so loading never depends on font assets. Motion is stepped rotation plus slowly drifting colour. The accessible status stays hidden before the delay and on readiness/fallback. Reduced motion freezes both effects; no-JavaScript content shows no indicator. Font/photo failures abort partial enhancement and restore the styled native document. An8-second island timeout and independent CSS watchdog cover hanging assets and missing JavaScript. Without JavaScript, native content is immediately readable. Reduced motion freezes ambient work; print/forced colours use native ink.
- Visibility/pagehide pauses rendering. Pageshow resumes with a reset clock for BFCache; Remix disconnection aborts listeners, observers and RAF and releases all retained surfaces. A new visit creates fresh resources.
- The normal document shell owns canonical/social metadata and indexing, with the original theme-aware Temple favicon. Fonts and icon use hashed immutable build assets; content media uses the existing immutable media pipeline.

## Review and verification

Run `npm run dev` (default8787), then `sand tunnel 8787`. The repetition performance follow-up uses8798: `sand tunnel 8798`;8790 remains available for the separate content work.

`npm run check:website` checks application behaviour against synthetic CMX input, independent of authored prose. Browser coverage includes startup, failure fallback, themes, selectable text, responsive fitting, navigation/disposal and the no-JavaScript document.

`node website/app/temple/debug/scroll.mjs` measures synthetic-route draw time and total-frame intervals separately. Set `WIDTH`/`HEIGHT` for viewport comparisons, `DPR` and `MOBILE=true` for phone emulation, or `ENGINE=webkit`. `CPU=4` enables Chromium CPU throttling. Software-browser results are not a physical-device60fps guarantee. [Release preparation and remaining hardware check](docs/production-readiness.md).

The removed workbench is recoverable at `7eeabb0:website/app/temple/text.prototype/`. [Artist decisions and rejected studies](docs/collaboration.md) remain the source of artistic rationale.

`node website/app/temple/debug/ink.mjs` compares all cached copy baselines with the settled native DOM in WebKit; `ENGINE=chromium` runs the same check in Chromium. It uses synthetic route content only. This guards against pre-paint baseline caching and clipped/doubled text.

For diagnostics, start the synthetic Worker separately: `WEBSITE_TEST=true npx wrangler dev website/tests/worker.ts --config website/wrangler.jsonc --port 8791`. The diagnostic defaults target that fixture server, keeping automated assertions independent of authored content and media. Use the actual content route only for visual review.

The first pair now supports an optional typed `action`; the selected [fragment button](fragment-button/README.md) renders in its final pause. Its native contact link and decorative SVG share the existing Opening island, with per-instance seeds and lifetime/visibility guards.

For the third-pair diagnostic, use `REPETITION=true TEMPLE_URL=http://localhost:8791/temple-four-phrases WIDTH=390 HEIGHT=900 node website/app/temple/debug/scroll.mjs`. It sweeps the complete repetition and counts its per-frame layout reads. Add `NATIVE_TIMELINES=false` to compare the frame-driven fallback, or `ENGINE=webkit` for WebKit. Frame budgets remain software-browser measurements.

The optional `PoemOpening.navigation` renders a native sticky header immediately after the opener. The artist supplies its ordered labels and available destinations in CMX content. Unbuilt facts have no link destination yet. The left wordmark uses `top-navigation-artwork.ts`, sharing `createTypeSurface` and the existing scene clock/material; it does not mount another forest simulation. Native text remains the accessible source and failure/print fallback. Narrow screens keep the complete item row horizontally scrollable. The normal logo invokes the existing navigation dialog through Chrome, including lazy newsletter state, keyboard dismissal and focus restoration. No duplicate main menu is created.
