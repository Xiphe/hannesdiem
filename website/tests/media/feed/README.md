Synthetic blue video and440Hz tone, generated for browser playback tests. No
authored content or production media is used. The fixtures are served only by
Playwright interception and are never included in the website assets.

Regenerate with FFmpeg (not required for running the tests):

```sh
ffmpeg -f lavfi -i 'color=c=0x5874a8:s=180x320:r=10' \
  -f lavfi -i 'sine=frequency=440:sample_rate=22050' -t 12 \
  -c:v libx264 -profile:v baseline -pix_fmt yuv420p -g 20 \
  -c:a aac -b:a 32k -f hls -hls_time 2 -hls_list_size 0 \
  -hls_segment_type fmp4 -hls_fmp4_init_filename init.mp4 \
  -hls_segment_filename website/tests/media/feed/segment-%d.m4s \
  website/tests/media/feed/video.m3u8
```
