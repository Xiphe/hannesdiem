# Synthetic ElectroCute recording

`electrocute.mp4` is a 96-second static grid and quiet 220 Hz test tone, generated
entirely with FFmpeg. It contains no artist recording. It is intercepted in
browser tests or copied into the isolated ElectroCute preview; normal website
asset builds do not copy it.

Regenerate with:

```sh
ffmpeg -f lavfi -i 'color=c=0x020024:s=640x360:r=5:d=96' \
  -f lavfi -i 'sine=frequency=220:sample_rate=22050:duration=96' \
  -vf 'drawgrid=w=80:h=45:t=1:c=0xae1ee4@0.5' -af volume=0.03 \
  -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p \
  -c:a aac -b:a 16k -movflags +faststart \
  website/tests/media/electrocute.mp4
```

MP4 test interception must support HTTP byte ranges. Returning a whole response
without Range headers produces a non-seekable resource in Chromium even when its
entire contents have buffered. This differs from both the local asset server and
the pCloud behavior reported in the handoff.
