import type { CmxComponentNode, CmxDocument } from '@cmx-tools/contracts'
import { recordingsTempleContent, entryTempleContent } from '../app/temple/tests/fixture.ts'

/** Authored by the test suite; neither production media nor Publications. */
export const mixedFeedContent = structuredClone(recordingsTempleContent)
const opening = (mixedFeedContent.default as CmxComponentNode).children![0] as CmxComponentNode
const facts = opening.props!.facts as Record<string, unknown>[]
const collection = facts[0].after as CmxComponentNode
const videos = collection.props!.videos as Record<string, unknown>[]
collection.import = 'TemplePosts'
const posts: Record<string, unknown>[] = [
  ...videos.map((post, index) => ({
    ...post,
    kind: 'video',
    cover: { src: '/fixture-media/cover.svg', width: 640, height: 640 },
    ...(index === 0 ? { aspectRatio: 16 / 9, videoId: '11111111111111111111111111111111' } : {}),
  })),
  {
    id: 'fixture-audio',
    kind: 'audio',
    title: 'Synthetic audio',
    cover: { src: '/fixture-media/cover.svg', width: 640, height: 640 },
    postedAt: '2025-04-08T18:00:00Z',
    src: '/fixture-media/audio.wav',
    children: { type: 'element', tag: 'p', children: ['A synthetic audio description.'] },
  },
  {
    id: 'fixture-text',
    kind: 'text',
    title: 'Synthetic text',
    postedAt: '2025-04-08T17:00:00Z',
    body: {
      type: 'fragment',
      children: Array.from({ length: 32 }, (_, index) => ({
        type: 'element',
        tag: 'p',
        children: [
          `Synthetic paragraph ${index + 1}. ` +
            'Readable text continues naturally through the viewport. '.repeat(5),
        ],
      })),
    },
  },
]
collection.props = { posts }
collection.slots = posts.flatMap((post, index) => [
  ...('children' in post ? [['posts', index, 'children']] : []),
  ...('body' in post ? [['posts', index, 'body']] : []),
])
// Give the first video an overflowing description for nested scrolling checks.
posts[1].children = {
  type: 'fragment',
  children: Array.from({ length: 24 }, (_, index) => ({
    type: 'element',
    tag: 'p',
    children: [
      `Description detail ${index + 1}. ` + 'Long synthetic recording information. '.repeat(5),
    ],
  })),
}

export function feedFixtureDocument(
  template: CmxDocument,
  section: 'visit' | 'watch' = 'watch',
): CmxDocument {
  const content = entryTempleContent('inside', section)
  const opening = (content.default as CmxComponentNode).children![0] as CmxComponentNode
  ;(opening.props!.facts as Record<string, unknown>[])[0].after = structuredClone(collection)
  opening.slots = [['facts', 0, 'after']]
  return { ...structuredClone(template), content: { ...content, metadata: { kind: 'temple' } } }
}
