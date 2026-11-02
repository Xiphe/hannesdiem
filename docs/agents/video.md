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

The Final Cut export preset is being configured by the artist's local agent.
1080p is sufficient and sound takes priority. Preserve the finished mix without
added mastering. Compare Stream playback against the actual export, especially
the sound; unchanged audio passthrough has not been established.

Stream subscription setup and the first real upload have not been verified by
this repository change. Player placement in Temple of Sound remains an artwork
decision; consult `website/app/temple/docs/collaboration.md` before changing it.

References:

- [Stream upload recommendations](https://developers.cloudflare.com/stream/uploading-videos/)
- [Stream player and preload behavior](https://developers.cloudflare.com/stream/viewing-videos/using-the-stream-player/)
- [Stream pricing](https://developers.cloudflare.com/stream/pricing/)
