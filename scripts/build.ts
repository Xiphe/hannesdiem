import { build } from 'esbuild'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

await rm('dist', { recursive: true, force: true })
await mkdir('.generated', { recursive: true })
const result = await build({
  entryPoints: { entry: 'app/browser.ts', counter: 'app/counter.tsx', style: 'app/style.css' },
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
})

const serverModules = ['app/page.tsx', 'app/content.ts', 'app/router.tsx', 'app/worker.ts']
for (const path of serverModules) {
  if (path in result.metafile.inputs) throw new Error(`Server-only module in browser bundle: ${path}`)
}
const entries = Object.fromEntries(Object.entries(result.metafile.outputs)
  .filter(([, output]) => output.entryPoint)
  .map(([path, output]) => [
    ({ 'app/browser.ts': 'entry', 'app/counter.tsx': 'counter', 'app/style.css': 'style' })[output.entryPoint!],
    '/' + path.replace(/^dist\//, ''),
  ]))
await writeFile('.generated/assets.json', JSON.stringify(entries, null, 2) + '\n')
await writeFile('dist/_headers', '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n')
await writeFile('.generated/browser-meta.json', JSON.stringify(result.metafile, null, 2) + '\n')

let bytes = 0
let gzipBytes = 0
for (const path of Object.keys(result.metafile.outputs).filter((path) => path.endsWith('.js'))) {
  const contents = await readFile(path)
  bytes += contents.length
  gzipBytes += gzipSync(contents).length
}
console.log(`Browser JS: ${bytes} bytes; ${gzipBytes} bytes gzip. Server-only modules excluded.`)
