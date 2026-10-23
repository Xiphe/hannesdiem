import { cmx } from '@cmx-tools/bundle'
import { createCmxAssetPipeline } from '@cmx-tools/assets'
import { globSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, resolve, sep } from 'node:path'
import { rolldown } from 'rolldown'
import config from '../cmx.config.ts'

const cwd = process.cwd()
const pages = resolve(cwd, 'content/pages')
const entries = Object.fromEntries(
  globSync('**/*.tsx', { cwd: pages })
    .sort()
    .map((file) => [file.slice(0, -4).split(sep).join('/'), resolve(pages, file)]),
)
if (Object.keys(entries).length === 0) throw new Error('No CMX pages found')
entries._routes = resolve(cwd, 'content/routes.ts')

const assets = createCmxAssetPipeline({ cwd, assets: config.assets })
await assets.prepare({
  entries,
  configPath: 'content/cmx.config.ts',
})

const bundle = await rolldown({
  cwd,
  input: entries,
  plugins: [
    cmx({ ...config, cwd }),
    {
      name: 'media-manifest',
      async generateBundle() {
        const images = Object.fromEntries(
          await Promise.all(
            [...this.getModuleIds()]
              .filter(assets.matches)
              .sort()
              .map(async (file) => [basename(file), await assets.load(file)]),
          ),
        )
        await mkdir('.generated', { recursive: true })
        await writeFile('.generated/media.json', JSON.stringify(images, null, 2) + '\n')
      },
    },
  ],
  // Page imports can create entry facades without sourcemaps.
  // https://github.com/cmx-tools/packages/issues/208
  preserveEntrySignatures: 'allow-extension',
})
try {
  await bundle.write({
    dir: resolve(cwd, '.cmx/bundle'),
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-[hash].js',
  })
} finally {
  await bundle.close()
}
