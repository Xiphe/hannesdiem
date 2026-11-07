import { execFile } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, rename, stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { promisify } from 'node:util'

/** Choose the smallest Stream rendition for local, silent scene searching. */
export function searchRendition(manifest: string, base: string) {
  const lines = manifest.split(/\r?\n/)
  const variants = lines.flatMap((line, index) => {
    if (!line.startsWith('#EXT-X-STREAM-INF:')) return []
    const resolution = line.match(/RESOLUTION=(\d+)x(\d+)/)
    const path = lines.slice(index + 1).find((next) => next.trim() && !next.startsWith('#'))
    if (!resolution || !path) return []
    const url = new URL(path.trim(), base)
    if (url.protocol !== 'https:' || url.origin !== new URL(base).origin)
      throw new Error('Invalid video rendition')
    return [
      {
        url: url.href,
        pixels: Number(resolution[1]) * Number(resolution[2]),
        frameRate: Number(line.match(/FRAME-RATE=([\d.]+)/)?.[1]) || 30,
      },
    ]
  })
  const variant = variants.sort((a, b) => a.pixels - b.pixels)[0]
  if (!variant) throw new Error('Video has no search rendition')
  return variant
}

const run = promisify(execFile)
export function searchVideoCache(directory: string) {
  const pending = new Map<string, Promise<string>>()
  return async (id: string, source: string) => {
    if (!/^[a-z0-9]+$/i.test(id)) throw new Error('Invalid video identity')
    let result = pending.get(id)
    if (!result) {
      result = (async () => {
        await mkdir(directory, { recursive: true })
        const path = `${directory}/${id}.mp4`
        try {
          if ((await stat(path)).size > 0) return path
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
        // Remux the low-resolution video without audio; keep original frame timing.
        await run(
          'ffmpeg',
          [
            '-hide_banner',
            '-loglevel',
            'error',
            '-y',
            '-i',
            source,
            '-map',
            '0:v:0',
            '-an',
            '-c:v',
            'copy',
            '-movflags',
            '+faststart',
            `${path}.tmp.mp4`,
          ],
          // Long recordings can take several minutes to remux over Stream's segment requests.
          { timeout: 15 * 60 * 1000 },
        )
        await rename(`${path}.tmp.mp4`, path)
        return path
      })()
      pending.set(id, result)
      result.catch(() => pending.delete(id))
    }
    return result
  }
}

/** Native video seeks need byte ranges, including Safari's small initial probe. */
export async function serveSearchVideo(
  request: IncomingMessage,
  response: ServerResponse,
  path: string,
) {
  const { size } = await stat(path)
  const headers = {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-cache',
  }
  let start = 0
  let end = size - 1
  if (request.headers.range) {
    const range = request.headers.range.match(/^bytes=(\d*)-(\d*)$/)
    if (range && (range[1] || range[2])) {
      start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
      end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1
    } else start = size
    if (
      start >= size ||
      end < start ||
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end)
    ) {
      response.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` })
      response.end()
      return
    }
    response.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
    })
  } else response.writeHead(200, { ...headers, 'Content-Length': size })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  const stream = createReadStream(path, { start, end })
  stream.on('error', () => response.destroy())
  response.on('close', () => stream.destroy())
  stream.pipe(response)
}
