# Watch and Create — unpublished studies

These local studies extend the real `/temple-of-sound` page through a development
proxy. They are not included in the website build or published CMX content.
The artist's latest wording lives in unpublished `_watch.ts` and `_create.ts`
alongside the Temple content module. Preserve it verbatim.

## Current composition

- Watch follows the first complete verse/refrain pair. Its supplied main headline
  uses Cinzel, followed by two paragraphs. The overlapping photos connect to the
  softer text material on desktop and stack above it on mobile. The centred CTA
  retains its supplied context; “get notified” is disabled until the dedicated
  Temple audience/signup is implemented.
- Create follows the second pair. It has a separate rounded contour, the supplied
  “Collaborate on music” headline, and portrait/mixer imagery with staggered lower
  edges. Its supplied contact action opens `sound@hannesdiem.de`.
- The shared material fitter places the full text inside each contour. Paint stays
  clear of the neighbouring verses; the upper contour can use the section's own
  preceding margin. Source images and text remain independently positioned.
- Review controls and separate Visit/Watch/Create labels have been removed.
  Normal navigation links remain available. No publication approval is implied.

The image files are placeholders for future content, not symbols to interpret.
Clean, full-resolution originals replaced the watermarked placeholders:
`A7403062-1.jpg` → `content/media/tos4.jpg`, `A7404065-1.jpg` →
`content/media/tos2.jpg`, and `A7403058-1.jpg` → `content/media/tos.jpg`.
The mixer uses `content/media/mixing-scene-one-week-retreat-1803-2fadbcefea805a0a.webp`.

## Local preview

Start the normal preview on8791:

```sh
npm run dev -- --port 8791
```

In another terminal, run `npm run prototype:temple-watch`, then open
`http://localhost:8793/temple-of-sound#watch` (`sand tunnel 8793`).
Use `#create` to jump to Create. `WATCH_PORT` changes the proxy's port;
`TEMPLE_PREVIEW` changes its upstream, which must be running first.

The original A/B comparison is recoverable at `7212ac6` on this branch. The current
page has one composition. Artistic decisions and their scope live in
[`docs/collaboration.md`](../docs/collaboration.md).

The retired Create tooltip is saved independently for reuse in
[`piece-tooltip/`](../piece-tooltip/README.md), with its own lifecycle, styles and
synthetic browser check. Create now uses the artist's plain replacement wording.
