# Temple of Sound

The opener and first verse/refrain render through the regular CMX document and Remix island at `/temple-of-sound`. Later poem sections remain in `content/drafts/temple-of-sound.tsx` and are not published.

## Content and rendering

- `content/pages/temple-of-sound.tsx` owns the typed first pair, including display casing and font roles. The unpublished draft reuses it. The browser never imports content modules or CMX runtime.
- `poem.tsx` resolves the immutable1920px media variant and passes serializable data to `Opening`. `first-pair.tsx` renders native paragraphs and selectable source text; no duplicated authored copy or workbench controls.
- `opening.tsx` owns the Remix task and cancellation. `artwork.ts` coordinates fitted text, copy colour and the bounded refrain. `scene.ts` owns the shared RAF, viewport material, title mask and pointer/idle disturbances.
- `atmosphere.ts` and `escapes.ts` create instance-owned textures, coverage maps and particles. Only immutable noise samples/functions live at module scope. There are no import-time DOM reads, cross-instance rendering callbacks or Git source patches.
- `block-type.ts` fits native ink rows after fonts load. Resize work watches only width/viewport inputs and runs in the shared frame; derived section height never feeds back into fitting. Wait for native baseline layout before caching glyphs (a two-frame startup barrier, and deferred masks on resize), including WebKit. `copy-colour.ts` caches native glyph masks and paints a shared128px colour field at most10Hz. Offscreen text pauses; no PNG encoding or per-frame DOM colour styles.
- Black startup gates the document until the first completed frame. Font/photo failures abort partial enhancement and restore the styled native document. An8-second island timeout and independent CSS watchdog cover hanging assets and missing JavaScript. Without JavaScript, native content is immediately readable. Reduced motion freezes ambient work; print/forced colours use native ink.
- Visibility/pagehide pauses rendering. Pageshow resumes with a reset clock for BFCache; Remix disconnection aborts listeners, observers and RAF and releases all retained surfaces. A new visit creates fresh resources.
- The normal document shell owns canonical/social metadata and indexing, with the original theme-aware Temple favicon. Fonts and icon use hashed immutable build assets; content media uses the existing immutable media pipeline.

## Review and verification

Run `npm run dev` (default8787), then `sand tunnel 8787`. The current review session uses8790: `sand tunnel 8790`.

`npm run check:website` checks application behaviour against synthetic CMX input, independent of authored prose. Browser coverage includes startup, failure fallback, themes, selectable text, responsive fitting, navigation/disposal and the no-JavaScript document.

`TEMPLE_URL=http://localhost:8790/temple-of-sound node website/app/temple/debug/scroll.mjs` measures actual-route draw time and total-frame intervals separately. Set `WIDTH`/`HEIGHT` for viewport comparisons. Software-browser results are not a physical-device60fps guarantee. [Release preparation and remaining hardware check](docs/production-readiness.md).

The removed workbench is recoverable at `7eeabb0:website/app/temple/text.prototype/`. [Artist decisions and rejected studies](docs/collaboration.md) remain the source of artistic rationale.

`node website/app/temple/debug/ink.mjs` compares all cached copy baselines with the settled native DOM in WebKit; `ENGINE=chromium` runs the same check in Chromium. It uses actual route content without fixed wording assertions. This guards against pre-paint baseline caching and clipped/doubled text.
