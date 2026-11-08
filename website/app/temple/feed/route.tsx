import { cmx } from '@cmx-tools/remix'
import type { CmxNode } from '@cmx-tools/contracts'
import { clientEntry, type Handle } from 'remix/component'
import type { TemplePostsProps } from '@hannesdiem/content-components'
import { environment } from '../../../../.cmx/environment.ts'
import assets from '../../../../.generated/assets.json' with { type: 'json' }
import type { ContentPage } from '../../document-host/index.ts'
import { SiteContent } from '../../ui-library/context.ts'
import { resolvePostCover } from '../posts.tsx'
import { feedDocument } from './document.ts'
import { Feed as FeedComponent } from './view.tsx'
import { sortedPosts, postPath } from './model.ts'
import { dateLabel } from '../../date.tsx'
import { StreamVideo } from '../../ui-library/video.tsx'
import { ThemedImage } from '../../themed-image.tsx'
import { externalLinksDocument } from '../../ui-library/document-links.ts'

const Feed = clientEntry(`${assets.templeFeed}#Feed`, FeedComponent)

export async function renderFeed(page: ContentPage, id?: string) {
  const { posts, document } = await feedDocument(await externalLinksDocument(page.document))
  const selected = id
    ? posts.find((post) => post.id === id)
    : sortedPosts(posts as (Record<string, unknown> & { id: string; postedAt: string })[])[0]
  if (!selected || typeof selected.title !== 'string') return undefined
  const selectedId = selected.id as string
  function FeedPosts(handle: Handle<TemplePostsProps>) {
    const site = handle.context.get(SiteContent)
    return () => {
      const posts = sortedPosts(handle.props.posts).toReversed()
      const selected = posts.find((post) => post.id === selectedId)!
      return (
        <>
          <Feed
            selected={selectedId}
            mark={assets.mark}
            darkMark={assets.markDark}
            posts={posts.map((post) => ({
              ...post,
              cover: resolvePostCover(post, site.media),
              dateLabel: dateLabel({ value: post.postedAt, showTime: true }),
            }))}
          />
          <noscript>
            <style>{'@media (scripting: none) { .temple-feed { display: none; } }'}</style>
            <article class="feed-fallback">
              <a
                href="/"
                aria-label="Home"
              >
                <ThemedImage
                  src={assets.mark}
                  darkSrc={assets.markDark}
                  width={20}
                  height={40}
                  alt=""
                />
              </a>
              <h1>{selected.title}</h1>
              {selected.subheadline && <p>{selected.subheadline}</p>}
              {selected.kind === 'video' ? (
                <StreamVideo {...selected} />
              ) : selected.kind === 'audio' ? (
                <audio
                  src={selected.src}
                  controls
                  preload="metadata"
                />
              ) : (
                selected.body
              )}
              <time dateTime={selected.postedAt}>
                {dateLabel({ value: selected.postedAt, showTime: true })}
              </time>
              {selected.children}
              <nav aria-label="Content">
                {posts
                  .filter((post) => post.id !== selectedId)
                  .map((post) => (
                    <a href={postPath(post.id)}>{post.title}</a>
                  ))}
              </nav>
            </article>
          </noscript>
        </>
      )
    }
  }
  const body = cmx<{ default: CmxNode }>(document, {
    ...environment,
    imports: {
      ...environment.imports,
      '@hannesdiem/content-components': {
        ...environment.imports['@hannesdiem/content-components'],
        TemplePosts: FeedPosts,
      },
    },
  }).default
  return {
    path: postPath(selectedId),
    title: selected.title,
    body,
    shareImage: selected.shareImage as
      import('../../../../contracts/content.ts').MediaImage | undefined,
    shareTitle: typeof selected.shareTitle === 'string' ? selected.shareTitle : selected.title,
    shareDescription: typeof selected.subheadline === 'string' ? selected.subheadline : undefined,
  }
}
