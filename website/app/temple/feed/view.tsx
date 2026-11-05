import { ref, type Handle } from 'remix/component'
import type { TemplePost } from '@hannesdiem/content-components'
import { postPath, templePath } from './model.ts'
import { mountFeed } from './enhance.ts'

type ResolvedCover<Post> = Post extends TemplePost
  ? Omit<Post, 'cover'> & { cover?: string }
  : never
export type FeedPost = ResolvedCover<TemplePost>
export interface FeedProps {
  selected: string
  posts: readonly (FeedPost & { dateLabel: string })[]
}

export function FeedIcon(
  handle: Handle<{ name: 'back' | 'share' | 'play' | 'pause' | 'sound' | 'muted' | 'down' }>,
) {
  return () => (
    <svg
      viewBox={handle.props.name === 'down' ? '0 0 36 12' : '0 0 24 24'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {handle.props.name === 'back' ? (
        <path d="m14.5 5-7 7 7 7" />
      ) : handle.props.name === 'share' ? (
        <>
          <path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8" />
        </>
      ) : handle.props.name === 'play' ? (
        <path
          d="m9 5 11 7-11 7Z"
          fill="currentColor"
          stroke="none"
        />
      ) : handle.props.name === 'pause' ? (
        <path
          d="M8 5v14m8-14v14"
          strokeWidth="4"
        />
      ) : handle.props.name === 'down' ? (
        <path d="m3 3 15 6 15-6" />
      ) : handle.props.name === 'muted' ? (
        <path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m0-6-6 6" />
      ) : (
        <>
          <path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
        </>
      )}
    </svg>
  )
}

export function Feed(handle: Handle<FeedProps>) {
  let root: HTMLElement | undefined
  handle.queueTask((signal) => {
    if (root) mountFeed(root, handle.props, signal)
  })
  return () => (
    <div
      class="temple-feed"
      role="region"
      aria-label="Content viewer"
      tabIndex={0}
      mix={ref((node) => {
        root = node
      })}
    >
      <div
        class="feed-player-home"
        hidden
      >
        <video
          class="feed-player"
          playsInline
          preload="metadata"
        />
      </div>
      {handle.props.posts.map((post) => (
        <article
          id={`post-${post.id}`}
          class="feed-post"
          data-post-id={post.id}
          data-kind={post.kind}
          data-active={post.id === handle.props.selected ? '' : undefined}
          data-orientation={
            post.kind === 'video' && (post.aspectRatio ?? 16 / 9) < 1 ? 'portrait' : 'landscape'
          }
          aria-labelledby={`feed-title-${post.id}`}
        >
          {post.kind === 'text' ? (
            <div class="feed-text">{post.body}</div>
          ) : (
            <div class="feed-stage">
              {post.cover && (
                <img
                  class="feed-cover"
                  src={post.cover}
                  alt=""
                  loading={post.id === handle.props.selected ? 'eager' : 'lazy'}
                />
              )}
              {post.kind === 'audio' && !post.cover && (
                <h2 class="feed-audio-title">{post.title}</h2>
              )}
              <div class="feed-media-mount" />
              <button
                class="feed-tap"
                type="button"
                aria-label={`Play ${post.title}`}
                data-toggle
              />
              <button
                class="feed-start feed-control"
                type="button"
                aria-label={`Play ${post.title}`}
                data-toggle
                hidden
              >
                <FeedIcon name="play" />
              </button>
              {post.kind === 'audio' && (
                <div class="feed-audio-controls">
                  <button
                    type="button"
                    class="feed-audio-toggle feed-control"
                    aria-label={`Play ${post.title}`}
                    data-toggle
                  >
                    <span data-play-icon>
                      <FeedIcon name="play" />
                    </span>
                    <span
                      data-pause-icon
                      hidden
                    >
                      <FeedIcon name="pause" />
                    </span>
                  </button>
                  <div
                    class="feed-waveform"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 300 56"
                      preserveAspectRatio="none"
                    />
                  </div>
                  <input
                    class="feed-seek"
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    defaultValue={0}
                    aria-label={`Playback position: ${post.title}`}
                  />
                </div>
              )}
            </div>
          )}
          <div class="feed-corners">
            <a
              href={templePath}
              data-back
              class="feed-control"
              aria-label="Back to Temple of Sound"
              data-rmx-document
            >
              <FeedIcon name="back" />
            </a>
            <button
              type="button"
              class="feed-control"
              data-share
              aria-label={`Share ${post.title}`}
            >
              <FeedIcon name="share" />
            </button>
          </div>
          {post.kind === 'video' && (
            <div
              class="feed-ended"
              hidden
            >
              <button
                type="button"
                class="feed-end-action"
                data-replay
              >
                Play again
              </button>
              <button
                type="button"
                class="feed-end-action"
                data-next
              >
                Next Video
              </button>
            </div>
          )}
          <div class="feed-panel">
            <div class="feed-summary">
              <h2 id={`feed-title-${post.id}`}>{post.title}</h2>
              {post.kind !== 'text' && (
                <div class="feed-transport">
                  {post.kind === 'video' && (
                    <input
                      class="feed-seek feed-video-seek"
                      type="range"
                      min={0}
                      max={100}
                      step={0.1}
                      defaultValue={0}
                      disabled
                      aria-label={`Playback position: ${post.title}`}
                    />
                  )}
                  <div class="feed-volume-control">
                    <button
                      type="button"
                      data-sound
                      class="feed-control feed-sound"
                      aria-label="Mute sound"
                    >
                      <span data-sound-on>
                        <FeedIcon name="sound" />
                      </span>
                      <span
                        data-sound-off
                        hidden
                      >
                        <FeedIcon name="muted" />
                      </span>
                    </button>
                    <div class="feed-volume-popover">
                      <input
                        class="feed-volume"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        defaultValue={100}
                        data-volume
                        aria-label="Volume"
                      />
                    </div>
                  </div>
                </div>
              )}
              <button
                type="button"
                class="feed-control feed-disclosure"
                data-details-toggle
                aria-expanded="false"
                aria-controls={`feed-details-${post.id}`}
                aria-label="Show description"
              >
                <FeedIcon name="down" />
              </button>
            </div>
            <div
              class="feed-details"
              id={`feed-details-${post.id}`}
              inert
            >
              <div
                class="feed-caption"
                tabIndex={0}
                aria-label={`Description: ${post.title}`}
              >
                <time dateTime={post.postedAt}>{post.dateLabel}</time>
                <div class="feed-description">{post.children}</div>
                <input
                  class="feed-share-url"
                  aria-label="Share link"
                  value={postPath(post.id)}
                  readOnly
                  hidden
                />
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
