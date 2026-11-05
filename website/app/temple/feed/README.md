# Content viewer

Approved after the feed interview, 2026-11-05. Implements only the content below
Watch; the entry and share-image conversations own their corresponding views.

- `/temple-of-sound/watch/{slug}` opens a specific post in a vertical feed. No
  feed index. Oldest above newest, replace URL while swiping rather than pushing
  browser history.
- Watch is a horizontal band of share-image-like covers. `TempleRecordings`
  remains supported; `TemplePosts` adds video, audio and rich text.
- The Back control goes to `/temple-of-sound` unless the visitor had
  entered previously, otherwise `/temple-of-sound/watch#{current-id}`. The feed
  uses `hasEnteredTemple()` from the entry implementation but never writes it
  (`hannesdiem.temple.entered`).
- Video covers when its orientation matches the viewport; otherwise contains on
  black. Tap surface toggles playback. Both orientations center the smaller title at the top between Back and Share.
  The bottom summary has Play/Pause, a scrubber with an icon-only speaker, and a
  shallow chevron tucked into the existing bottom padding, pointing up when
  collapsed and down when open.
  Only the chevron’s center moves between directions; its ends stay fixed. The
  narrower, dimmer icon moves down 10px as the drawer opens. A single open
  percentage drives its position, shape, drawer travel and backdrop extent,
  including during dragging. Space toggles playback without a focus
  outline on the video surface. The chevron and scrubber have no focus outline; other controls retain keyboard focus indicators.
  The bottom gradient fades evenly from transparent to 94% black across its
  full height, anchored to the viewport bottom throughout animation and dragging.
  Collapsed, it covers only the controls and a 48px fade above them; it grows with the description drawer. The centered top title has
  its own dark fade. Back and Share remain icon-only corner controls; all appear
  with the rest of the UI and gain a subtle darker shade on cursor hover.
- During video playback the summary and corner controls fade in over one second
  after interaction or cursor movement. After four inactive seconds they fade
  out over three seconds. Neither entry nor cursorless scrolling
  reveals, hides or restarts that timer. A deliberate pause, the chevron or an
  upward drag on the summary opens the date/description drawer; a downward drag
  or chevron closes it. Opening the drawer does not interrupt playback. The
  complete expanded panel occupies at most 40% of the viewport; its description
  scrolls internally. Use 6px between the date and first description block,
  retaining 12px between subsequent blocks. The summary owns dragging; horizontal seeking and scrolling
  inside the description retain their own gestures. An upward gesture starting
  on the scrubber hands off to the drawer without seeking or pausing; horizontal
  gestures seek. Wait for the initial direction before committing a pointer seek,
  while clicks and keyboard range input keep their usual playback behavior.
- Seeking preserves the previous playback/drawer state and resumes only
  previously playing media. Pointer capture and a consistent resize cursor on
  the track, thumb and surrounding area prevent cursor changes during a drag.
  Keep controls visible while adjusting. Pause, play, chevron, completion and
  share fallback animate drawer changes over 220ms. The panel is anchored to the
  viewport so focus/scroll-into-view during animation cannot snap the post list.
  Dragging takes over from its current visual position and follows the pointer
  directly, with no animation on release. New post activation resets immediately
  to avoid stale metadata flashing; reduced motion skips panel animations.
- Cursor devices reveal a vertical volume slider in one connected pill above
  the speaker when hovering/focusing it, with a short expanding/fading transition
  on entrance and exit;
  clicking the speaker mutes/unmutes. Volume starts at 100% and remembers
  adjustments. Touch devices start at 100% without the slider. Mute/unmute
  carries across posts. Device/system volume remains under the visitor's control.
- UI transitions respect reduced motion. Model intentional pause
  separately from source loading and temporary seek pauses. Clear stale drawer
  state before reactivating a post so scrolling never flashes old metadata.
- Try audible autoplay and retain the same media element across posts. If
  blocked, show a play control. Videos stop at their end and offer “Play again”
  and “Next Video” as borderless icon-and-label actions with opaque black hover
  backgrounds; the latter selects the next newer video in feed order,
  skipping audio/text, and is absent on the final video. Audio ends normally.
- Switching tabs/apps no longer deliberately pauses media. Release speculative
  preload while hidden, and expose current metadata and play/pause/seek/next
  actions through Media Session where supported. Browser/OS background policies
  can still suspend playback; do not force playback after a system interruption.
  Removing the viewer still disposes and pauses its player.
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

The system media controls follow the [Media Session specification](https://www.w3.org/TR/mediasession/).
WebKit also applies its own [background playback restrictions](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/audio/ios/MediaSessionManagerIOS.mm).
