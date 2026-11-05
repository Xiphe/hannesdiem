import type { Handle } from 'remix/component'
import type { TemplePost, TemplePostsProps } from '@hannesdiem/content-components'
import { SiteContent } from '../ui-library/context.ts'
import { getMedia } from '../media.ts'
import { postPath, sortedPosts, thumbnail } from './feed/model.ts'

export function resolvePostCover(post: TemplePost, media: Parameters<typeof getMedia>[0]) {
  return post.cover ? getMedia(media, post.cover).src : thumbnail(post)
}

/** Watch contains links and covers, never hidden media players. */
export function TemplePosts(handle: Handle<TemplePostsProps>) {
  const site = handle.context.get(SiteContent)
  return () => (
    <div
      class="temple-post-previews"
      role="region"
      aria-label="Content"
      tabIndex={0}
    >
      {sortedPosts(handle.props.posts).map((post) => {
        const cover = resolvePostCover(post, site.media)
        return (
          <a
            id={post.id}
            class="temple-post-preview"
            href={postPath(post.id)}
            data-rmx-document
          >
            {cover && (
              <img
                src={cover}
                alt=""
                loading="lazy"
                width={1052}
                height={550}
              />
            )}
            <span class="temple-post-preview-title">{post.title}</span>
          </a>
        )
      })}
    </div>
  )
}
