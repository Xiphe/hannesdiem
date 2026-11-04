# Publish recorded video with Cloudflare Stream

The artist chose Stream so recordings can play on the website without maintaining
an encoder or uploading multiple versions. Upload one finished Final Cut export
directly to Stream; Stream handles encoding and adaptive delivery. The artist
maintains source backups separately.

## Add a video to content

Wait for Stream to finish processing. Copy the customer code and video ID from
the dashboard's embed URL, then use the shared content component:

```tsx
import { StreamVideo } from '@hannesdiem/content-components'

export default (
  <StreamVideo
    customerCode={customerCode}
    videoId={videoId}
    title={title}
  />
)
```

The component is available through the existing CMX content contract. The customer
code and video ID are public playback identifiers, not upload credentials. Supply
the recording's actual title; use `aspectRatio={9 / 16}` for portrait video or
another width/height ratio when necessary. The default is 16:9.

Playback uses Cloudflare's player, starts on viewer interaction, and requests no
video preload. The iframe loads lazily; Stream still fetches initialization
metadata. No additional player SDK, video backend, or R2 source copy is needed.
Publishing a video is a separate content decision from uploading it.

## Present a recording in Temple of Sound

`TempleVideo` adds a stable `id`, a linked title, an optional posting date, and
native CMX children for a rich-text description around the same player. Supply
`postedAt="2025-04-07T19:30:00+02:00"` to keep the timestamp in CMX content.
The shared release-date component formats it in the visitor's locale and timezone,
including the time. Server rendering falls back to English and Berlin time.
The date appears below the player and above the caption in small, dimmed text,
remaining visible during playback. This is a
typed content component within the page document, not a separate recording model.
Place it in a fact's `after` slot
to render it immediately after that fact and before the next verse. The fact's
action follows this slot, placing Watch's signup beneath the recording and caption.
The slot is
resolved by CMX and passed as serializable JSX through the existing Opening
island. The title is an overlay on the poster, with the description's reading
piece tucked underneath the rounded player.

`video-title.ts` uses Cloudflare's official player SDK to hide the overlay during
playback and restore it on pause/end. It loads only when a recording is present,
keeps the iframe's playback controls and releases listeners when Opening is
disposed. If the SDK is unavailable, the title remains visible without blocking
the central play button or controls. There is no custom video player or extra
island.

The artist requested the first recording after Watch, titled `Mic/Tech-Check`,
with their supplied description unchanged. Its direct link is
`/temple-of-sound#mic-tech-check`; authored content lives in
`content/pages/temple-of-sound/_recordings.tsx`. The title itself links to that
anchor. Rich-text descriptions use ordinary paragraphs, emphasis, links and lists
rather than a new Markdown parser or HTML string.

The preceding poem changes height while fonts and artwork are fitted. On initial
recording deep links, restore the native anchor arrival after readiness/fallback
so the title stays below the navigation. Synthetic checks cover initial load,
reload, native links, portrait sizing and rich-text hydration on phone/desktop,
plus rendering without site JavaScript.

## Present multiple Temple recordings

Use `TempleRecordings` in Watch's `after` slot with a `videos` array of
`TempleVideo` props. Each entry requires a timezone-qualified `postedAt` and
keeps its description in native CMX `children`. CMX resolves these nested
description slots through the existing Opening island; no collection service
or separate content format is needed.

The component sorts by timestamp, newest first, before rendering. Its native
horizontal scroll area fills the viewport and starts at the rightmost recording
on a fresh visit. RTL flex flow places that newest recording on the right and
older recordings to its left; each recording keeps LTR text. Mandatory scroll
snapping stops at each recording. Cards take the width of their height-fitted
player plus padding, capped at the viewport width, so multiple videos appear
side by side whenever they fit. Older title permalinks still
address their individual recordings. Keyboard, wheel and touch scrolling use
browser behavior. Watch's signup remains after the complete collection.
Printing stacks the collection vertically.

The artist supplied `permission-spaces.mov` and `kennt-ihr-das.MP4` on
2026-11-05, with their titles, descriptions and Berlin posting times. Both
Stream uploads were ready at 1080 × 1920. Their authored entries join the
existing technical recording in `_recordings.tsx`.

## Validate the first recording

The artist's local agent saved the Final Cut destination `Cloudflare Stream
1080p`. 1080p is sufficient and sound takes priority. Preserve the finished mix
without added mastering. Compare Stream playback against the actual export,
especially the sound; unchanged audio passthrough has not been established.

### First uploaded video: 2026-11-02

The artist uploaded `tech-check.mp4`. Its public Stream player is:

https://customer-ku6r49ei7df9hym2.cloudflarestream.com/54f94a6c1df7a504f462ecc8e2564f6d/iframe

Use customer code `ku6r49ei7df9hym2`, video ID
`54f94a6c1df7a504f462ecc8e2564f6d`, and `aspectRatio={9 / 16}` for this technical
sample. It is 13:56.4 long; it is not the earlier proposed 60-second test.

The public DASH manifest reports five video qualities, from 240 × 426 through
1080 × 1920, all at 30 fps. Audio is stereo AAC-LC at 48 kHz, with declared
bandwidth of 130,696 bits/second. These properties do not establish unchanged
audio or perceptual quality against the local export.

A browser check of the actual `StreamVideo` component confirmed paused, unmuted
initial state; playback and seeking without media errors; and 9:16 sizing without
horizontal overflow at desktop and 390px viewport widths. Before playback, the
observed requests included initialization metadata and a manifest, but no media
segments. The matched-volume listening comparison against the local export is
still pending.

Further artwork changes follow `website/app/temple/docs/collaboration.md`.

References:

- [Stream upload recommendations](https://developers.cloudflare.com/stream/uploading-videos/)
- [Stream player and preload behavior](https://developers.cloudflare.com/stream/viewing-videos/using-the-stream-player/)
- [Stream pricing](https://developers.cloudflare.com/stream/pricing/)
