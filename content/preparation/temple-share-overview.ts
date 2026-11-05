import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp, { type OverlayOptions } from 'sharp'
import { renderTempleShareImage, type TempleCardLayout } from './temple-share-image.ts'

const output = resolve('.generated/temple-share-overview')
const specimens = [
  { label: 'Short', text: 'Synthetic title' },
  { label: 'Medium', text: 'A synthetic recording title for this layout' },
  {
    label: 'Three-line range',
    text: 'A synthetic recording title with enough words to wrap across three lines',
  },
  {
    label: 'Long',
    text: 'A longer synthetic recording title that retains every word while reducing its font size to fit within the same available caption area',
  },
  { label: 'Very long', text: 'Synthetic title '.repeat(14).trim() },
  { label: 'Unbroken word', text: 'SyntheticUnbrokenTitle'.repeat(6) },
  { label: 'Punctuation', text: '“Synthetic title” — Grüße, umlauts & punctuation' },
  { label: 'Overflow trimmed', text: 'Synthetic title '.repeat(18).trim() },
]
const backgrounds: { name: string; bytes?: Uint8Array; color?: string }[] = [
  { name: 'Black', color: '#000000' },
  { name: 'Near-white', color: '#fffefd' },
  {
    name: 'Saturated colour',
    bytes: await sharp(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><path fill="#ffce28" d="M0 0h400v630H0z"/><path fill="#e63b8c" d="M400 0h400v630H400z"/><path fill="#5bcbd3" d="M800 0h400v630H800z"/></svg>',
      ),
    )
      .png()
      .toBuffer(),
  },
  {
    name: 'Busy high contrast',
    bytes: await sharp(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><pattern id="p" width="70" height="70" patternUnits="userSpaceOnUse"><path fill="#fff" d="M0 0h70v70H0z"/><path fill="#101010" d="M0 0h35v35H0zM35 35h35v35H35z"/></pattern></defs><path fill="url(#p)" d="M0 0h1200v630H0z"/></svg>',
      ),
    )
      .png()
      .toBuffer(),
  },
]
for (let index = 2; index < process.argv.length; index += 3) {
  if (process.argv[index] !== '--photo' || !process.argv[index + 1] || !process.argv[index + 2])
    throw new Error('Usage: node content/preparation/temple-share-overview.ts [--photo NAME PATH]')
  backgrounds.push({
    name: process.argv[index + 1],
    bytes: await readFile(process.argv[index + 2]),
  })
}
await mkdir(`${output}/images`, { recursive: true })
const cases: {
  background: string
  label: string
  text: string
  characters: number
  image?: string
  layout?: TempleCardLayout
  error?: string
}[] = []
for (const [column, background] of backgrounds.entries()) {
  for (const [row, specimen] of specimens.entries()) {
    try {
      const result = await renderTempleShareImage({
        title: specimen.text,
        background: background.bytes,
        backgroundColor: background.color,
      })
      const image = `images/${column}-${row}.jpg`
      await writeFile(`${output}/${image}`, result.bytes)
      cases.push({
        background: background.name,
        label: specimen.label,
        text: specimen.text,
        characters: specimen.text.length,
        image,
        layout: result.layout,
      })
    } catch (error) {
      cases.push({
        background: background.name,
        label: specimen.label,
        text: specimen.text,
        characters: specimen.text.length,
        error: (error as Error).message,
      })
    }
  }
}
const escape = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
await writeFile(`${output}/results.json`, JSON.stringify(cases, null, 2) + '\n')
const cards = cases
  .map(
    (item) =>
      `<article data-background="${escape(item.background)}" data-length="${escape(item.label)}"><header><strong>${escape(item.background)}</strong><span>${escape(item.label)} · ${item.characters} characters</span></header>${item.image ? `<a href="${item.image}"><img src="${item.image}" loading="lazy" width="1200" height="630" alt="${escape(item.layout!.titleText)}"></a><p>${item.layout!.titleSize}px title · ${item.layout!.titleLines} lines${item.layout!.titleTruncated ? ' · trimmed with ...' : ''} · ${Math.round(item.layout!.gradient.topOpacity * 100)}% shade at top${item.layout!.gradient.startY > 0 ? ` · fade starts ${item.layout!.gradient.startY}px down` : ''}</p>` : `<div class="failure">${escape(item.error!)}</div>`}</article>`,
  )
  .join('\n')
await writeFile(
  `${output}/index.html`,
  `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Temple share-card coverage</title>
<style>html{color-scheme:dark;background:#171717;color:#e1d9ce;font:16px/1.5 system-ui,sans-serif}body{max-width:1600px;margin:32px auto;padding:0 24px}h1{font-size:28px;margin:0 0 8px}p{max-width:85ch}nav{display:flex;gap:20px;flex-wrap:wrap;margin:24px 0}label{display:grid;gap:5px}select{font:inherit;padding:8px;background:#292929;color:inherit;border:1px solid #777;border-radius:4px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:32px 24px}article[hidden]{display:none}header{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-bottom:8px}header span{color:#aaa}img{display:block;width:100%;height:auto}article p{margin:8px 0;font-size:14px;color:#ccc}.failure{display:grid;place-items:center;aspect-ratio:1200/630;background:#292020;color:#ffd3c0;padding:0 24px}footer{margin:32px 0;color:#aaa}</style>
<h1>Temple share-card coverage</h1><p>Actual renderer output using explicitly synthetic text. Titles start at 180px and reduce to 48px as needed. The wordmark stays at 40px. Titles fit above the 55px bottom margin and below the 200px caption ceiling. If the full wording cannot fit at 48px, the card ends with ...; the original title stays intact.</p><p>Shading is a single linear fade, ending at 80% black. Its start adapts to text height and image brightness. Bright images can require shading across the whole image, even with short titles.</p>
<nav><label>Background<select id="background"><option>All backgrounds</option>${backgrounds.map((item) => `<option>${escape(item.name)}</option>`).join('')}</select></label><label>Text amount<select id="length"><option>All text lengths</option>${specimens.map((item) => `<option>${escape(item.label)}</option>`).join('')}</select></label></nav>
<main>${cards}</main><footer>Click a card to inspect its full 1200×630 output. Overflow titles trim at 48px and append ... on the card. An authored shareTitle can still provide a shorter alternative.</footer>
<script>const background=document.getElementById('background'),length=document.getElementById('length');function filter(){document.querySelectorAll('article').forEach(card=>card.hidden=(background.selectedIndex>0&&card.dataset.background!==background.value)||(length.selectedIndex>0&&card.dataset.length!==length.value))}background.onchange=length.onchange=filter;</script></html>`,
)
const sampleBackgrounds = [
  backgrounds[5]?.name ?? 'Black',
  'Near-white',
  backgrounds[4]?.name ?? 'Saturated colour',
  'Black',
  'Busy high contrast',
  'Saturated colour',
]
const sampleLengths = [
  'Medium',
  'Short',
  'Three-line range',
  'Long',
  'Very long',
  'Overflow trimmed',
]
const layers: OverlayOptions[] = []
for (let index = 0; index < sampleBackgrounds.length; index++) {
  const item = cases.find(
    (item) => item.background === sampleBackgrounds[index] && item.label === sampleLengths[index],
  )!
  if (!item.image || !item.layout) continue
  const left = (index % 2) * 800
  const top = Math.floor(index / 2) * 500
  const label = await sharp({
    text: {
      text: `<span foreground="#e1d9ce">${escape(`${item.background} · ${item.characters} characters · ${item.layout.titleSize}px`)}</span>`,
      font: 'sans 24',
      rgba: true,
      width: 760,
    },
  })
    .png()
    .toBuffer()
  layers.push({ input: label, left: left + 20, top: top + 18 })
  layers.push({
    input: await sharp(`${output}/${item.image}`).resize(800, 420).png().toBuffer(),
    left,
    top: top + 62,
  })
}
await sharp({ create: { width: 1600, height: 1500, channels: 4, background: '#171717' } })
  .composite(layers)
  .jpeg({ quality: 90 })
  .toFile(`${output}/overview.jpg`)
console.log(
  `Review: ${output}/index.html (${cases.filter((item) => item.image).length} cards, ${cases.filter((item) => item.layout?.titleTruncated).length} trimmed, ${cases.filter((item) => item.error).length} errors)`,
)
console.log(
  JSON.stringify(
    cases
      .filter((item) => item.background === 'Near-white')
      .map(({ label, characters, layout, error }) => ({
        label,
        characters,
        titleSize: layout?.titleSize,
        lines: layout?.titleLines,
        truncated: layout?.titleTruncated,
        error,
      })),
    null,
    2,
  ),
)
