import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { reduceCmxDocumentNodes } from '@cmx-tools/reduce'
import type { MediaImage, PublishedDocuments } from '../../contracts/content.ts'
import { readSite, siteEntry } from '../../contracts/content.ts'
import { storeMedia, type MediaStorage } from './media-storage.ts'
import { renderTempleShareImage } from './temple-share-image.ts'

/** Attach cards to the same CMX post props the viewer and overview already read. */
export async function prepareTempleShareImages(
  documents: PublishedDocuments,
  storage: MediaStorage,
  request: typeof fetch = fetch,
) {
  const media = readSite(documents[siteEntry]).media
  const cards = new Map<string, Promise<MediaImage>>()
  async function source(src: string) {
    if ('directory' in storage && src.startsWith(`${storage.base}/`)) {
      const directory = resolve(storage.directory)
      const path = resolve(directory, src.slice(storage.base.length + 1))
      if (!path.startsWith(directory + sep)) throw new Error('Invalid Temple cover path')
      return readFile(path)
    }
    if (!src.startsWith('https://'))
      throw new Error('Temple covers must be imported media or HTTPS')
    const response = await request(src, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`Temple cover request failed (${response.status}): ${src}`)
    return new Uint8Array(await response.arrayBuffer())
  }
  async function prepare(post: Record<string, unknown>, recording: boolean) {
    if (post.shareImage) return post
    const title = post.shareTitle ?? post.title
    if (typeof title !== 'string' || typeof post.id !== 'string')
      throw new Error('Temple share cards require a post ID and title')
    let src: string | undefined
    if (post.cover) {
      const cover = typeof post.cover === 'string' ? media[post.cover] : (post.cover as MediaImage)
      if (!cover || typeof cover.src !== 'string')
        throw new Error(`Missing Temple cover: ${post.id}`)
      src = cover.src
    } else if (recording || post.kind === 'video') {
      if (
        typeof post.customerCode !== 'string' ||
        !/^[a-z0-9-]+$/i.test(post.customerCode) ||
        typeof post.videoId !== 'string'
      )
        throw new Error(`Missing Stream identity: ${post.id}`)
      src = `https://customer-${post.customerCode}.cloudflarestream.com/${encodeURIComponent(post.videoId)}/thumbnails/thumbnail.jpg?width=1200&height=1200&fit=clip`
    }
    const key = JSON.stringify({ title, src })
    let card = cards.get(key)
    if (!card) {
      card = (async () => {
        const { bytes, width, height } = await renderTempleShareImage({
          title,
          background: src ? await source(src) : undefined,
        })
        const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
        const url = await storeMedia(storage, `og/temple-${digest}.jpg`, bytes, 'image/jpeg')
        return { src: url, width, height, alt: title }
      })()
      cards.set(key, card)
    }
    return { ...post, shareImage: await card }
  }
  const output: PublishedDocuments = {}
  for (const [key, document] of Object.entries(documents)) {
    const result = await reduceCmxDocumentNodes({
      document,
      context: undefined,
      async reduceNode(node) {
        if (
          !node ||
          typeof node !== 'object' ||
          node.type !== 'component' ||
          node.from !== '@hannesdiem/content-components'
        )
          return node
        const field =
          node.import === 'TempleRecordings'
            ? 'videos'
            : node.import === 'TemplePosts'
              ? 'posts'
              : undefined
        if (!field || !Array.isArray(node.props?.[field])) return node
        const posts = []
        for (const post of node.props[field]) posts.push(await prepare(post, field === 'videos'))
        return { ...node, props: { ...node.props, [field]: posts } }
      },
    })
    output[key] = result.document
  }
  return output
}
