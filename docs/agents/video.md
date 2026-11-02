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

Player placement in Temple of Sound remains an artwork decision; consult
`website/app/temple/docs/collaboration.md` before changing it.

References:

- [Stream upload recommendations](https://developers.cloudflare.com/stream/uploading-videos/)
- [Stream player and preload behavior](https://developers.cloudflare.com/stream/viewing-videos/using-the-stream-player/)
- [Stream pricing](https://developers.cloudflare.com/stream/pricing/)
