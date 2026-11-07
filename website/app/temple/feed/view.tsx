import { ref, type Handle } from 'remix/component'
import type { TemplePost } from '@hannesdiem/content-components'
import { videoFrame, postPath } from './model.ts'
import { mountFeed } from './enhance.ts'
import { FeedIcon } from './icon.tsx'

type ResolvedCover<Post> = Post extends TemplePost
  ? Omit<Post, 'cover'> & { cover?: string }
  : never
export type FeedPost = ResolvedCover<TemplePost>
export interface FeedProps {
  selected: string
  mark: string
  posts: readonly (FeedPost & { dateLabel: string })[]
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
              {(post.kind === 'video' || post.cover) && (
                <img
                  class={post.kind === 'video' ? 'feed-frame' : 'feed-cover'}
                  src={post.kind === 'video' ? videoFrame(post) : post.cover}
                  alt=""
                  loading={post.id === handle.props.selected ? 'eager' : 'lazy'}
                />
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
          <div class="feed-heading">
            <div class="feed-title-group">
              <h2
                class="feed-title"
                id={`feed-title-${post.id}`}
              >
                {post.title}
              </h2>
              {post.subheadline && <p class="feed-subheadline">{post.subheadline}</p>}
            </div>
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
                <FeedIcon name="replay" />
                Play again
              </button>
              <button
                type="button"
                class="feed-end-action"
                data-next
              >
                <FeedIcon name="next" />
                Next Video
              </button>
            </div>
          )}
          <div
            class="feed-panel-motion"
            inert={post.id !== handle.props.selected}
          >
            <div class="feed-panel">
              <div
                class="feed-bottom-shade"
                aria-hidden="true"
              />
              <div class="feed-summary">
                {post.kind !== 'text' && (
                  <div class="feed-transport">
                    <button
                      type="button"
                      class="feed-control feed-playback-toggle"
                      data-toggle
                      aria-label={`Play ${post.title}`}
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
                  <span
                    class="feed-drag-indicator"
                    aria-hidden="true"
                  />
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
          </div>
        </article>
      ))}
      <div class="feed-corners">
        <a
          href="/"
          data-back
          class="feed-control"
          aria-label="Home"
          data-rmx-history="replace"
        >
          <span
            data-return-back
            hidden
          >
            <FeedIcon name="back" />
          </span>
          <img
            class="feed-home-logo"
            data-return-home
            src={handle.props.mark}
            width={18}
            height={36}
            alt=""
          />
        </a>

        <div class="feed-corner-actions">
          <button
            type="button"
            class="feed-control"
            data-fullscreen
            aria-label="Enter fullscreen"
            aria-pressed="false"
            hidden
          >
            <span data-fullscreen-enter>
              <FeedIcon name="fullscreen" />
            </span>
            <span
              data-fullscreen-exit
              hidden
            >
              <FeedIcon name="exit-fullscreen" />
            </span>
          </button>
          <button
            type="button"
            class="feed-control"
            data-share
            aria-label={`Share ${handle.props.posts.find((post) => post.id === handle.props.selected)!.title}`}
          >
            <FeedIcon name="share" />
          </button>
        </div>
      </div>
    </div>
  )
}
