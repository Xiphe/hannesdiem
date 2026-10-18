import { createHash } from 'node:crypto'
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import sharp from 'sharp'

if (!process.env.GITHUB_ACTIONS)
  throw new Error(
    'Palette extraction runs in GitHub Actions only; local builds use saved metadata.',
  )
const require = createRequire(new URL('../tools/palette/package.json', import.meta.url))
const { Vibrant } = require('node-vibrant/node')
const results: Record<string, unknown> = {}
for (const filename of (await readdir('content/media')).sort()) {
  if (!/\.(?:jpe?g|png|webp|avif)$/i.test(filename)) continue
  const bytes = await readFile(`content/media/${filename}`)
  const palette = await Vibrant.from(bytes).getPalette()
  const { data } = await sharp(bytes)
    .resize(1, 1, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  results[filename] = {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    color: `#${[...data.subarray(0, 3)].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`,
    palette: Object.entries(palette).flatMap(([name, swatch]) => {
      if (!swatch) return []
      const value = swatch as { hex: string; hsl: number[]; population: number }
      return [{ name, color: value.hex, hsl: value.hsl, population: value.population }]
    }),
  }
}
await mkdir('.generated', { recursive: true })
await writeFile('.generated/palettes.json', JSON.stringify(results, null, 2) + '\n')
console.log(`Extracted palettes for ${Object.keys(results).length} originals.`)
