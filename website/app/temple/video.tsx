import type { Handle } from 'remix/component'
import type { TempleVideoProps } from '@hannesdiem/content-components'
import { StreamVideo } from '../ui-library/video.tsx'
import { readingContours, watchReadingViewBox } from './facts/material.ts'
import { fragmentStroke } from './fragment-button/material.ts'

export function TempleVideo(handle: Handle<TempleVideoProps>) {
  return () => {
    const { id, title, children, aspectRatio = 16 / 9 } = handle.props
    const materialId = `${id}-description-material`
    return (
      <section
        id={id}
        class="temple-video"
        aria-labelledby={`${id}-title`}
        style={{ '--video-aspect': aspectRatio }}
      >
        <div class="temple-video-layout">
          <div class="temple-video-player">
            <StreamVideo {...handle.props} />
            <h2 id={`${id}-title`}>
              <a href={`#${encodeURIComponent(id)}`}>{title}</a>
            </h2>
          </div>
          <div class="temple-video-description-piece">
            <svg
              class="temple-video-material"
              viewBox={watchReadingViewBox}
              preserveAspectRatio="none"
              aria-hidden="true"
              data-nav-visual
            >
              <defs>
                <linearGradient
                  id={materialId}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop class="fact-material-start" />
                  <stop
                    offset="1"
                    class="fact-material-end"
                  />
                </linearGradient>
              </defs>
              <g transform="rotate(8)">
                <path
                  d={readingContours.watch}
                  fill={`url(#${materialId})`}
                  stroke={`url(#${materialId})`}
                  stroke-width={fragmentStroke}
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </g>
            </svg>
            <div
              class="temple-video-description"
              data-nav-visual
            >
              {children}
            </div>
          </div>
        </div>
      </section>
    )
  }
}
