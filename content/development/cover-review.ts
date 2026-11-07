import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { reduceCmxDocumentNodes } from '@cmx-tools/reduce'
import {
  readSite,
  siteEntry,
  validatePublication,
  type MediaImage,
  type PublishedDocuments,
} from '../../contracts/content.ts'
import { renderTempleShareImage } from '../preparation/temple-share-image.ts'
import { coverReviewStore, coverCompositionVersion } from './cover-review-store.ts'
import { searchRendition, searchVideoCache, serveSearchVideo } from './cover-review-video.ts'

const requested = new Set(process.argv.slice(2))
if (!requested.size)
  throw new Error('Choose the videos for this session: npm run content:review-covers -- <id> [id…]')

// Local authoring aid. Read native CMX inputs; choices stay drafts until applied to content.
const output = resolve('.generated/temple-cover-review')
const assets = fileURLToPath(new URL('./cover-review/', import.meta.url))
const draftsPath = `${output}/selections.json`
const documents: PublishedDocuments = JSON.parse(
  await readFile('.generated/publication.json', 'utf8'),
)
validatePublication(documents)
const media = readSite(documents[siteEntry]).media
type Video = {
  id: string
  title: string
  customerCode: string
  videoId: string
  cover?: MediaImage
}
const videos = new Map<string, Video>()
for (const document of Object.values(documents)) {
  await reduceCmxDocumentNodes({
    document,
    context: undefined,
    reduceNode(node) {
      if (
        node &&
        typeof node === 'object' &&
        node.type === 'component' &&
        node.from === '@hannesdiem/content-components'
      ) {
        const posts =
          node.import === 'TempleRecordings'
            ? node.props?.videos
            : node.import === 'TemplePosts'
              ? node.props?.posts
              : undefined
        if (Array.isArray(posts))
          for (const post of posts) {
            if (typeof post.videoId !== 'string') continue
            if (
              typeof post.id !== 'string' ||
              !/^[a-z0-9-]+$/i.test(post.id) ||
              typeof post.customerCode !== 'string' ||
              !/^[a-z0-9-]+$/i.test(post.customerCode) ||
              !/^[a-z0-9]+$/i.test(post.videoId)
            )
              throw new Error('Invalid recording identity')
            const cover = typeof post.cover === 'string' ? media[post.cover] : post.cover
            videos.set(post.id, {
              id: post.id,
              title: post.shareTitle ?? post.title,
              customerCode: post.customerCode,
              videoId: post.videoId,
              cover,
            })
          }
      }
      return node
    },
  })
}
if (!videos.size) throw new Error('No videos found. Run npm run content:build first.')
for (const id of requested)
  if (!videos.has(id)) throw new Error(`Unknown video for cover review: ${id}`)
for (const id of videos.keys()) if (!requested.has(id)) videos.delete(id)
const choices = await coverReviewStore(output)
const frames = new Map<string, Promise<Uint8Array>>()
const previews = new Map<string, Promise<{ share: string; watch: string }>>()
const base = (video: Video) =>
  `https://customer-${video.customerCode}.cloudflarestream.com/${video.videoId}`
async function frame(video: Video, time: number) {
  const key = `${video.videoId}:${time}`
  let result = frames.get(key)
  if (!result) {
    result = (async () => {
      const response = await fetch(
        `${base(video)}/thumbnails/thumbnail.jpg?time=${time}s&width=1920&height=1920&fit=clip`,
        { signal: AbortSignal.timeout(30000) },
      )
      if (!response.ok)
        throw new Error(`Frame unavailable (${response.status}); choose another time and retry`)
      return new Uint8Array(await response.arrayBuffer())
    })()
    frames.set(key, result)
    result.catch(() => frames.delete(key))
    if (frames.size > 24) frames.delete(frames.keys().next().value!)
  }
  return result
}
const metadata = new Map<string, Promise<{ duration: number; frameRate: number; source: string }>>()
function videoInfo(video: Video) {
  let result = metadata.get(video.videoId)
  if (!result) {
    result = (async () => {
      const url = `${base(video)}/manifest/video.m3u8`
      const master = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!master.ok) throw new Error('Video unavailable')
      const variant = searchRendition(await master.text(), url)
      const response = await fetch(variant.url, {
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error('Video duration unavailable')
      const length = [...(await response.text()).matchAll(/#EXTINF:([\d.]+)/g)].reduce(
        (total, match) => total + Number(match[1]),
        0,
      )
      if (!(length > 0)) throw new Error('Video duration unavailable')
      return { duration: length, frameRate: variant.frameRate, source: variant.url }
    })()
    metadata.set(video.videoId, result)
    result.catch(() => metadata.delete(video.videoId))
  }
  return result
}
const cachedVideo = searchVideoCache(`${output}/search`)
async function searchVideo(video: Video) {
  return cachedVideo(video.videoId, (await videoInfo(video)).source)
}
async function input(body: Record<string, unknown>) {
  const video = videos.get(String(body.id))
  if (!video) throw new Error('Unknown video')
  const { time, focalX, focalY } = body
  if (
    typeof time !== 'number' ||
    !Number.isFinite(time) ||
    time < 0 ||
    time >= (await videoInfo(video)).duration
  )
    throw new Error('Choose a time within this video')
  for (const value of [focalX, focalY])
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)
      throw new Error('Focus must be between 0 and 100%')
  return {
    video,
    time: Math.round(time * 1000000) / 1000000,
    focalX: focalX as number,
    focalY: focalY as number,
  }
}
const staticFiles: Record<string, [string, string]> = {
  '/': [`${assets}index.html`, 'text/html; charset=utf-8'],
  '/app.js': [`${assets}app.js`, 'text/javascript; charset=utf-8'],
  '/style.css': [`${assets}style.css`, 'text/css; charset=utf-8'],
  '/transport.js': [`${assets}transport.js`, 'text/javascript; charset=utf-8'],
}
const server = createServer(async (request, response) => {
  const send = (status: number, value: unknown) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify(value))
  }
  try {
    const url = new URL(request.url!, 'http://local.invalid')
    if (request.method === 'GET' && staticFiles[url.pathname]) {
      const [path, type] = staticFiles[url.pathname]
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' })
      response.end(await readFile(path))
    } else if (request.method === 'GET' && url.pathname === '/api/videos') {
      send(
        200,
        await Promise.all(
          [...videos.values()].map(async (video) => ({
            ...video,
            duration: (await videoInfo(video)).duration,
            frameRate: (await videoInfo(video)).frameRate,
            compositionVersion: coverCompositionVersion,
            choice:
              choices.get(video.id)?.videoId === video.videoId ? choices.get(video.id) : undefined,
          })),
        ),
      )
    } else if (['GET', 'HEAD'].includes(request.method!) && url.pathname === '/api/search-video') {
      const video = videos.get(url.searchParams.get('id') ?? '')
      if (!video) throw new Error('Unknown video')
      await serveSearchVideo(request, response, await searchVideo(video))
    } else if (request.method === 'GET' && url.pathname === '/api/frame') {
      const { video, time } = await input({
        id: url.searchParams.get('id'),
        time: Number(url.searchParams.get('time')),
        focalX: 50,
        focalY: 50,
      })
      const bytes = await frame(video, time)
      response.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' })
      response.end(bytes)
    } else if (request.method === 'POST' && ['/api/preview', '/api/save'].includes(url.pathname)) {
      if (
        !request.headers['content-type']?.startsWith('application/json') ||
        (request.headers.origin && new URL(request.headers.origin).host !== request.headers.host)
      )
        return send(403, { error: 'Open the review tool directly to save choices' })
      let body = ''
      for await (const chunk of request) {
        body += chunk
        if (body.length > 4096) throw new Error('Request too large')
      }
      const { video, time, focalX, focalY } = await input(JSON.parse(body))
      const background = await frame(video, time)
      if (url.pathname === '/api/preview') {
        const key = JSON.stringify({ id: video.id, time, focalX, focalY })
        let preview = previews.get(key)
        if (!preview) {
          preview = (async () => {
            const options = { title: video.title, background, focalX, focalY }
            const [share, watch] = await Promise.all([
              renderTempleShareImage(options),
              renderTempleShareImage({ ...options, showWordmark: false }),
            ])
            return {
              share: `data:image/jpeg;base64,${share.bytes.toString('base64')}`,
              watch: `data:image/jpeg;base64,${watch.bytes.toString('base64')}`,
            }
          })()
          previews.set(key, preview)
          preview.catch(() => previews.delete(key))
          if (previews.size > 24) previews.delete(previews.keys().next().value!)
        }
        send(200, await preview)
      } else {
        send(200, {
          choice: await choices.save(
            video.id,
            {
              time,
              focalX,
              focalY,
              videoId: video.videoId,
              compositionVersion: coverCompositionVersion,
            },
            background,
          ),
        })
      }
    } else send(404, { error: 'Not found' })
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    if (!response.headersSent)
      send(400, { error: error instanceof Error ? error.message : 'Review request failed' })
    else response.end()
  }
})
const port = Number(process.env.COVER_REVIEW_PORT ?? 8794)
server.listen(port, '0.0.0.0', () =>
  console.log(`Cover review: http://localhost:${port}\nDrafts: ${draftsPath}`),
)
for (const video of videos.values())
  searchVideo(video).then(
    (path) => console.log(`Search video ready: ${video.id} (${path})`),
    (error) => console.error(`Search video failed: ${video.id}: ${error.message}`),
  )
