import { clientEntry, type Handle } from 'remix/component'
import type { TempleRecordingsProps, TempleVideoProps } from '@hannesdiem/content-components'
import { LocalDate as DateComponent } from '../date.tsx'
import assets from '../../../.generated/assets.json' with { type: 'json' }
import { StreamVideo } from '../ui-library/video.tsx'
import { readingContours, watchReadingViewBox } from './facts/material.ts'
import { fragmentStroke } from '../../../contracts/temple/fragments.ts'
import { TemplePosts } from './posts.tsx'

const LocalDate = clientEntry(`${assets.date}#LocalDate`, DateComponent)

export function TempleRecordings(handle: Handle<TempleRecordingsProps>) {
  return () => {
    return (
      <TemplePosts
        posts={handle.props.videos.map((video) => ({ ...video, kind: 'video' as const }))}
      />
    )
  }
}

export function TempleVideo(handle: Handle<TempleVideoProps>) {
  return () => {
    const { id, title, postedAt, children, aspectRatio = 16 / 9 } = handle.props
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
            <div class="temple-video-title-screen">
              <h2 id={`${id}-title`}>
                <a href={`#${encodeURIComponent(id)}`}>{title}</a>
              </h2>
            </div>
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
              {postedAt && (
                <div class="temple-video-posted-at">
                  <LocalDate
                    value={postedAt}
                    showTime
                  />
                </div>
              )}
              {children}
            </div>
          </div>
        </div>
      </section>
    )
  }
}
