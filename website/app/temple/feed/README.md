# Content viewer

Approved after the feed interview, 2026-11-05. Implements only the content below
Watch; the entry and share-image conversations own their corresponding views.

- `/feed/{slug}` opens a specific post in a site-wide vertical feed. `/feed`
  redirects to the newest post; old `/temple-of-sound/watch/{slug}` links redirect
  permanently to their corresponding feed URL. Oldest above newest. Select playback and replace the URL when the
  native scroll settles, preserving browser history and avoiding source/drawer
  changes halfway through a swipe.
- Legacy `/temple-of-sound#{slug}` links resolve against the published Watch
  preview links and go straight to `/feed/{slug}`, preserving query parameters.
  The fragment is browser-only, so this compatibility redirect needs JavaScript;
  it does not navigate through the Watch overview or mark the Temple as entered.
- Watch is a horizontal band of share-image-like covers. `TempleRecordings`
  remains supported; `TemplePosts` adds video, audio and rich text.
  Playable covers show the viewer's Play icon in a prominent shaded circle
  centered over the thumbnail. It is decorative; the complete card
  retains its native link into the feed. Text cards omit this indicator.
- Preview links expand into the viewer over 420ms; the viewer's Back control and
  Escape return to the original entry point. Shrink back to that preview only
  while the same post is selected; after browsing other posts, return without
  a shared-image morph. Use the browser View Transition API around Remix's
  existing frame navigation. Wait for the destination's layout gate and a bounded
  image decode before capturing it; no cover is added over scrolling videos.
  Direct shared links show the site logo linking home. Reduced motion,
  unsupported browsers, modified clicks and new tabs keep native document links.
  Skip the animation if the destination does not become ready promptly.
  CMX does not provide a shared-element navigation primitive; this is browser
  presentation of its existing published link surface. Keep no-JavaScript viewer
  CSS inside `@media (scripting: none)`: frame navigation can extract inline
  styles from a `noscript` subtree into the active document.
- Same-tab entries from any site page keep one original return URL and scroll
  position throughout browsing and reload. Back traverses the existing history
  entry so browser Forward can reopen the feed. This context belongs to browser
  history, with a short-lived session handoff for document navigation; shared
  URLs carry no return context. Direct entry and new tabs use the logo/Home
  control regardless of Temple entry memory. Preserve opaque Navigation API
  state when replacing classic history URLs, and defer initial persistence until
  Remix's active frame navigation finishes.
- Video covers when its orientation matches the viewport; otherwise contains on
  black. Scrolling and loading show the video's own frame, never its selected
  cover. Unfinished videos retain progress; completed videos start afresh. Keep
  a temporary canvas of the displayed frame while its timestamp image loads,
  capped at three pending canvases and released after decoding or disposal. Use
  Stream's explicit timestamp thumbnail with `fit=clip` to preserve source aspect
  ratio for inactive posts and the native poster. New videos start with `time=0s`;
  revisited videos show their saved timestamp. Keep the player hidden until its
  seek has decoded the matching frame, then hand over without an opening-frame flash
  ([thumbnail API](https://developers.cloudflare.com/stream/viewing-videos/displaying-thumbnails/)).
  Selected covers remain on Watch thumbnails and audio posts. Tap surface toggles playback. Both orientations center the smaller title at the top between Back and Share.
  The bottom summary has Play/Pause, a scrubber with an icon-only speaker, and a
  small, dim drag indicator above the scrubber. Center the Play/Pause
  glyph in its 44px control, restoring its position before the caption alignment.
  The indicator has
  no shape or position animation; it stays fixed within the moving summary. A single open
  percentage drives drawer travel and backdrop extent, including during dragging.
  Space toggles playback without a focus outline on the video surface. Escape
  activates the shared Back link directly, including from focused controls and
  descriptions; it does not pause playback first. The
  drawer toggle and scrubber have no focus outline; other controls retain keyboard
  focus indicators.
  The bottom gradient fades evenly from transparent to 94% black across its
  full height, anchored to the post’s bottom throughout drawer animation and dragging.
  Collapsed, it covers only the controls and a 48px fade above them; it grows with the description drawer. The centered top title has
  its own dark fade. Back and Share remain icon-only corner controls; all appear
  with the rest of the UI and gain a subtle darker shade on cursor hover. One shared set of corner buttons
  stays fixed to the viewport. Each post’s title and bottom panel travel with its
  media at full opacity. Scrolling does not fade the departing or incoming
  panels; they simply travel with their video edges. Keep the scrubber's brightness
  steady as a post becomes active and its source loads; temporarily disabling
  seeking must not dim it at snap completion.
  An icon-only fullscreen toggle sits immediately left of Share on browsers
  supporting element fullscreen, with a fine pointer, hover and at least 768px
  viewport width. Hide it on mobile/touch devices and narrow layouts, updating
  when the viewport changes. It expands the whole viewer, preserving the
  feed and its controls, and reflects browser-driven exits. The title remains
  centered between equally sized corner columns.
- During video playback the summary and corner controls fade in over one second
  after interaction or cursor movement. After four inactive seconds they fade
  out over three seconds. Entry and cursorless scrolling do not restart that
  timer or reveal a hidden playing UI. A swipe that begins with visible UI keeps
  the incoming bars fully rendered at their own video’s bottom edge, without
  waiting for activation. They travel into view with that edge and never stick
  to the screen while entering. A deliberate pause or blocked autoplay keeps
  subsequent media paused while browsing. Incoming video panels inherit the paused
  drawer’s open/collapsed choice, including before activation and through source
  loading. Explicit Play ends that paused browsing session and forgets its drawer
  choice; the next Pause opens the date/description afresh. This choice is not
  saved across visits.
  Their normal playback fade resumes when playback resumes. A deliberate pause,
  the drag indicator or an upward drag on the summary opens the date/description drawer; a downward drag
  or clicking the indicator closes it. Opening the drawer does not interrupt playback. The
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
  Keep controls visible while adjusting. Pause, play, drawer toggle, completion and
  share fallback animate drawer changes over 220ms. Panels belong to their posts;
  inactive panels are inert but remain laid out, ready to enter with their media.
  Dragging takes over from its current visual position and follows the pointer
  directly, with no animation on release. Once a swipe settles, close the outgoing
  drawer offscreen before handing over playback, so it stays stable during the
  gesture and cannot flash stale metadata on return. Reduced motion skips drawer animations.
- Cursor devices reveal a vertical volume slider in one connected pill above
  the speaker when hovering/focusing it, with a short expanding/fading transition
  on entrance and exit;
  clicking the speaker mutes/unmutes. Volume starts at 100% and remembers
  adjustments. Touch devices start at 100% without the slider. Mute/unmute
  carries across posts. Device/system volume remains under the visitor's control.
- UI transitions respect reduced motion. Model intentional pause
  separately from source loading and temporary seek pauses. Clear stale drawer
  state before reactivating a post so scrolling never flashes old metadata.
- Try audible autoplay and retain the same media element across posts. Show
  the center Play control on ordinary pauses and blocked autoplay, including
  paused browsing with the drawer collapsed. Incoming and outgoing paused posts
  carry their center Play control with their media throughout scrolling, before
  activation. Inactive center controls remain inert. Explicit Play hides them
  across posts. Hide the active control during temporary seek/loading pauses.
  Videos stop at their end
  and offer “Play again” and “Next Video” as borderless icon-and-label actions with opaque black hover
  backgrounds; the latter selects the next newer video in feed order,
  skipping audio/text, and is absent on the final video. Next Video scrolls smoothly
  to its destination; reduced motion jumps directly. Audio ends normally.
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
