import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp, { type OverlayOptions } from 'sharp'
import { validatePublication } from '../../contracts/content.ts'

// Manual review of actual prepared cards. Automated tests use synthetic fixtures.
const { routes } = validatePublication(
  JSON.parse(await readFile('.generated/publication.json', 'utf8')),
)
const output = resolve('.generated/temple-share-overview/text-cards')
await mkdir(output, { recursive: true })
const cards = routes
  .filter(
    (route) =>
      route.kind === 'temple' &&
      (route.path === '/temple-of-sound' || route.path.startsWith('/temple-of-sound/')),
  )
  .flatMap((route) => [
    { title: route.ogTitle ?? route.title, path: route.path, image: route.ogImage },
    ...Object.entries(route.verseShares ?? {}).map(([verse, share]) => ({
      title: share.title,
      path: `${route.path}?verse=${encodeURIComponent(verse)}`,
      image: share.ogImage,
    })),
  ])
const escape = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const layers: OverlayOptions[] = []
for (const [index, card] of cards.entries()) {
  if (!card.image?.src.startsWith('/media/'))
    throw new Error('Run a local content build before reviewing text cards')
  await copyFile(resolve('.generated', card.image.src.slice(1)), `${output}/${index}.jpg`)
  const label = await sharp({
    text: {
      text: `<span foreground="#e1d9ce">${escape(card.title)}</span>`,
      font: 'sans 20',
      rgba: true,
    },
  })
    .png()
    .toBuffer()
  const left = (index % 2) * 600
  const top = Math.floor(index / 2) * 365
  layers.push({ input: label, left: left + 16, top: top + 10 })
  layers.push({
    input: await sharp(`${output}/${index}.jpg`).resize(600, 315).png().toBuffer(),
    left,
    top: top + 42,
  })
}
await sharp({
  create: {
    width: 1200,
    height: Math.ceil(cards.length / 2) * 365,
    channels: 3,
    background: '#171717',
  },
})
  .composite(layers)
  .jpeg({ quality: 90 })
  .toFile(`${output}/overview.jpg`)
await writeFile(`${output}/cards.json`, JSON.stringify(cards, null, 2) + '\n')
await writeFile(
  `${output}/index.html`,
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Temple text cards</title><style>html{color-scheme:dark;background:#171717;color:#e1d9ce;font:16px/1.5 system-ui}body{max-width:1400px;margin:24px auto;padding:0 20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:28px}h1{font-size:24px}h2{font-size:18px;margin:0}p{margin:4px 0 12px}code{overflow-wrap:anywhere;color:#aaa}img{display:block;width:100%;height:auto}</style><h1>Temple text cards</h1><p>Prepared share images: the same caption layout over the page's seeded fragment shapes. Each identity keeps its own stable pattern.</p><main>${cards.map((card, index) => `<article><h2>${escape(card.title)}</h2><p><code>${escape(card.path)}</code></p><a href="${index}.jpg"><img width="1200" height="630" src="${index}.jpg" alt="${escape(card.title)}"></a></article>`).join('')}</main></html>`,
)
console.log(`Review: ${output}/index.html (${cards.length} cards)`)
