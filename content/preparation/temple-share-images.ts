import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { reduceCmxDocumentNodes } from '@cmx-tools/reduce'
import type { ContentRoute, MediaImage, PublishedDocuments } from '../../contracts/content.ts'
import { readSite, siteEntry } from '../../contracts/content.ts'
import { storeMedia, type MediaStorage } from './media-storage.ts'
import { renderTempleShareImage } from './temple-share-image.ts'
import { templeSharePattern } from './temple-share-pattern.ts'
import type { ShareLine } from './temple-share-type.ts'
import { renderTempleOpenerShareImage } from './temple-opener-share.ts'

/** Attach cards to the same CMX post props the viewer and overview already read. */
export async function prepareTempleShareImages(
  documents: PublishedDocuments,
  storage: MediaStorage,
  request: typeof fetch = fetch,
) {
  const media = readSite(documents[siteEntry]).media
  const cards = new Map<string, Promise<MediaImage>>()
  const sources = new Map<string, Promise<Uint8Array>>()
  async function cardFor(
    title: string,
    options: {
      src?: string
      seed?: string
      showWordmark?: boolean
      lines?: readonly ShareLine[]
      wordmarkGapScale?: number
    } = {},
  ) {
    const { src, seed, showWordmark = true, lines, wordmarkGapScale } = options
    const key = JSON.stringify({ title, src, seed, showWordmark, lines, wordmarkGapScale })
    let card = cards.get(key)
    if (!card) {
      card = (async () => {
        const { bytes, width, height } = await renderTempleShareImage({
          title,
          lines,
          background: src ? await source(src) : seed ? templeSharePattern(seed) : undefined,
          showWordmark,
          wordmarkGapScale,
        })
        const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
        const url = await storeMedia(storage, `og/temple-${digest}.jpg`, bytes, 'image/jpeg')
        return { src: url, width, height, alt: title }
      })()
      cards.set(key, card)
    }
    return card
  }
  function source(src: string) {
    let bytes = sources.get(src)
    if (!bytes) {
      bytes = loadSource(src)
      sources.set(src, bytes)
    }
    return bytes
  }
  async function loadSource(src: string) {
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
    if (post.shareImage && post.previewImage) return post
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
    return {
      ...post,
      shareImage: post.shareImage ?? (await cardFor(title, { src })),
      previewImage: post.previewImage ?? (await cardFor(title, { src, showWordmark: false })),
    }
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
    const metadata = result.document.content.metadata as Partial<ContentRoute> | undefined
    if (metadata?.kind === 'temple') {
      const title = metadata.ogImageTitle ?? metadata.ogTitle ?? result.document.content.title
      if (typeof title !== 'string') throw new Error('Temple share cards require a title')
      const verseShares = metadata.verseShares
        ? Object.fromEntries(
            await Promise.all(
              Object.entries(metadata.verseShares).map(async ([verse, value]) => [
                verse,
                {
                  ...value,
                  ogImage:
                    value.ogImage ??
                    (await cardFor(value.title, {
                      seed: `${key}?verse=${verse}`,
                      lines: value.lines,
                    })),
                },
              ]),
            ),
          )
        : undefined
      let ogImage = metadata.ogImage
      if (!ogImage && metadata.openerShare) {
        const { bytes, width, height, date } = await renderTempleOpenerShareImage(
          await source(metadata.openerShare.frame.src),
          metadata.openerShare.dates,
        )
        const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
        ogImage = {
          src: await storeMedia(storage, `og/temple-${digest}.jpg`, bytes, 'image/jpeg'),
          width,
          height,
          alt: `${title} — ${date}`,
        }
      }
      output[key] = {
        ...result.document,
        content: {
          ...result.document.content,
          metadata: {
            ...metadata,
            ogImage:
              ogImage ??
              (await cardFor(title, {
                seed: key,
                showWordmark: !metadata.verseShares,
                wordmarkGapScale: 0.5,
              })),
            ...(verseShares ? { verseShares } : {}),
          },
        },
      }
    } else output[key] = result.document
  }
  return output
}
