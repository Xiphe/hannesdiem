import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

execFileSync(
  'npx',
  [
    '--no-install',
    'cmx-environment',
    'generate',
    '.cmx/environment.ts',
    '--config',
    'website/cmx.config.ts',
  ],
  { stdio: 'inherit' },
)

await rm('dist', { recursive: true, force: true })
await mkdir('.generated', { recursive: true })
const local = process.argv.includes('--local-media')
const result = await build({
  entryPoints: {
    entry: 'website/app/browser.ts',
    chrome: 'website/app/chrome.tsx',
    date: 'website/app/date.tsx',
    newsletter: 'website/app/newsletter/form.tsx',
    style: 'website/app/style.css',
  },
  outdir: 'dist/assets',
  entryNames: '[name]-[hash]',
  chunkNames: 'shared-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  jsxImportSource: 'remix/component',
  minify: true,
  metafile: true,
  external: ['/font/*'],
})

const serverModules = [
  'website/app/page.tsx',
  'website/app/ui-library/index.ts',
  'website/app/ui-library/render.ts',
  'website/app/ui-library/components.ts',
  'website/app/media.ts',
  'website/app/theme.ts',
  'website/app/navigation.tsx',
  'website/app/newsletter/index.ts',
  'website/app/newsletter/view.tsx',
  'website/app/router.tsx',
  'website/app/worker.ts',
]
for (const path of serverModules) {
  if (path in result.metafile.inputs)
    throw new Error(`Server-only module in browser bundle: ${path}`)
}
for (const path of Object.keys(result.metafile.inputs)) {
  if (/^(?:content|\.cmx)\//.test(path) || path.includes('node_modules/@cmx-tools/')) {
    throw new Error(`CMX content or runtime in browser bundle: ${path}`)
  }
}
const entries = Object.fromEntries(
  Object.entries(result.metafile.outputs)
    .filter(([, output]) => output.entryPoint)
    .map(([path, output]) => [
      {
        'website/app/browser.ts': 'entry',
        'website/app/chrome.tsx': 'chrome',
        'website/app/date.tsx': 'date',
        'website/app/newsletter/form.tsx': 'newsletter',
        'website/app/style.css': 'style',
      }[output.entryPoint!],
      '/' + path.replace(/^dist\//, ''),
    ]),
)
const mark = await readFile('website/app/assets/mark.svg')
entries.mark = `/assets/mark-${createHash('sha256').update(mark).digest('hex').slice(0, 16)}.svg`
await writeFile(`dist${entries.mark}`, mark)
await mkdir('dist/font', { recursive: true })
await cp('website/app/assets/fuggles.woff2', 'dist/font/fuggles-v12-latin-regular.woff2')
await cp('website/app/assets/googlef6f5b9a886cf5949.html', 'dist/googlef6f5b9a886cf5949.html')
let mediaHeaders = ''
if (local) {
  const media = JSON.parse(await readFile('.generated/media.json', 'utf8'))
  const firstImage = Object.values(media)[0] as { src: string }
  if (firstImage.src.startsWith('/')) {
    const prefix = firstImage.src.slice(0, firstImage.src.indexOf('/images/') + 1)
    await cp('.generated/media', `dist${prefix}`, { recursive: true })
    mediaHeaders = `${prefix}*\n  Cache-Control: public, max-age=31536000, immutable\n`
  }
}
await writeFile('.generated/assets.json', JSON.stringify(entries, null, 2) + '\n')
await writeFile(
  'dist/_headers',
  '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/font/*\n  Cache-Control: public, max-age=31536000, immutable\n' +
    mediaHeaders,
)
await writeFile('.generated/browser-meta.json', JSON.stringify(result.metafile, null, 2) + '\n')

let bytes = 0
let gzipBytes = 0
for (const path of Object.keys(result.metafile.outputs).filter((path) => path.endsWith('.js'))) {
  const contents = await readFile(path)
  bytes += contents.length
  gzipBytes += gzipSync(contents).length
}
console.log(`Browser JS: ${bytes} bytes; ${gzipBytes} bytes gzip. Server-only modules excluded.`)
