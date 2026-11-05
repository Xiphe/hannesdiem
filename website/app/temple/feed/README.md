# Content viewer

Approved after the feed interview, 2026-11-05. Implements only the content below
Watch; the entry and share-image conversations own their corresponding views.

- `/temple-of-sound/watch/{slug}` opens a specific post in a vertical feed. No
  feed index. Newest above oldest, replace URL while swiping rather than pushing
  browser history.
- Watch is a horizontal band of share-image-like covers. `TempleRecordings`
  remains supported; `TemplePosts` adds video, audio and rich text.
- The floating back control goes to `/temple-of-sound` unless the visitor had
  entered previously, otherwise `/temple-of-sound/watch#{current-id}`. The feed
  uses `hasEnteredTemple()` from the entry implementation but never writes it
  (`hannesdiem.temple.entered`).
- Video covers when its orientation matches the viewport; otherwise contains on
  black. Tap surface toggles playback. During playback hide all controls and
  metadata. Paused title/date/description are in a translucent bottom layer,
  at most40% of the viewport, internally scrollable. Back top-left, share at side.
- Try audible autoplay, retain sound preference across posts; if blocked keep
  paused with a play control. Video loops; audio ends. Offscreen/hidden pauses.
- Audio keeps its cover, play/pause control, real waveform and playback progress.
  Text stays readable and can exceed the viewport before the next snap.
- Preload only one following media post, and do not decode offscreen audio just
  to draw its waveform.

CMX's `reduceCmxDocumentNodes` selects declared content components, including
components in prop slots, from the request's coherent Publication snapshot.
CMX's rendering environment hydrates descriptions and text. No authored files or
generated production content are imported by the website. Feed selection,
playback coordination and generic post types currently have no CMX primitive;
they are application responsibilities.

Keep an actual media element across videos to improve audible continuation in
Safari. Stream's documented HLS manifests work with native playback or lazy-loaded
hls.js. Avoid depending on the SDK's undocumented source setter. Browser settings
can still require another tap; saved entry state is never autoplay permission.
See [WebKit's per-element autoplay guidance](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)
and [Cloudflare's supported HLS playback](https://developers.cloudflare.com/stream/viewing-videos/using-own-player/).

Visual tokens: black `#000` media ground, accepted Temple cream `#e1d9ce` control
ink, translucent black layers, existing CinzelDecorative titles and Bricolage body.
Full-viewport content is the primary surface; one quiet control layer, no social
counters or invented copy. Review against the approved interaction before adding
decoration. Covers can be supplied by the sharing pipeline via the `cover` prop.
