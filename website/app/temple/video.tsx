import type { Handle } from 'remix/component'
import type { TempleVideoProps } from '@hannesdiem/content-components'
import { StreamVideo } from '../ui-library/video.tsx'

export function TempleVideo(handle: Handle<TempleVideoProps>) {
  return () => {
    const { id, title, children, aspectRatio = 16 / 9 } = handle.props
    return (
      <section
        id={id}
        class="temple-video"
        aria-labelledby={`${id}-title`}
        style={{ '--video-aspect': aspectRatio }}
      >
        <div class="temple-video-layout">
          <div class="temple-video-copy">
            <h2 id={`${id}-title`}>
              <a href={`#${encodeURIComponent(id)}`}>{title}</a>
            </h2>
            <div class="temple-video-description">{children}</div>
          </div>
          <div class="temple-video-player">
            <StreamVideo {...handle.props} />
          </div>
        </div>
      </section>
    )
  }
}
