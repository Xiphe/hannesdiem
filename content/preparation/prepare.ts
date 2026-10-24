import { compileCmxBundle, type CompileCmxBundleOptions } from '@cmx-tools/bundle'
import { renderCmxDocuments } from '@cmx-tools/document'
import { globSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { discoverPages, notFoundEntry } from '../../contracts/page-routing.ts'
import { validatePublication, type PublishedDocuments } from '../../contracts/content.ts'

export async function buildPublication(
  options: CompileCmxBundleOptions,
): Promise<PublishedDocuments> {
  const bundleDir = resolve(options.cwd ?? process.cwd(), options.outDir)
  await rm(bundleDir, { recursive: true, force: true })
  await compileCmxBundle(options)
  const rendered = await renderCmxDocuments({ bundleDir })
  if (rendered.result !== 'complete') {
    throw new Error(
      'CMX document rendering failed:\n' +
        rendered.diagnostics.map((diagnostic) => diagnostic.message).join('\n'),
    )
  }
  const documents = Object.fromEntries(
    Object.entries(rendered.entries).map(([key, entry]) => [key, entry.document]),
  )
  validatePublication(documents)
  return documents
}

if (import.meta.main) {
  const { default: config } = await import('../cmx.config.ts')
  const pages = resolve('content/pages')
  const entries = Object.fromEntries(
    discoverPages(
      globSync('**/*.tsx', { cwd: pages }).map((file) => file.split(sep).join('/')),
    ).map(({ file, document }) => [document, resolve(pages, file)]),
  )
  if (Object.keys(entries).length === 0) throw new Error('No CMX pages found')
  entries[notFoundEntry] = resolve(pages, '_404.tsx')
  entries._site = resolve('content/site.ts')
  entries._redirects = resolve('content/redirects.ts')

  await mkdir('.generated', { recursive: true })
  await rm('.generated/publication.json', { force: true })
  const documents = await buildPublication({
    ...config,
    cwd: process.cwd(),
    entries,
    outDir: resolve('.cmx/bundle'),
    configPath: 'content/cmx.config.ts',
  })
  // Temporary media adapter: the existing generator consumes evaluated metadata.
  const { prepareShareImages } = await import('./share-images.ts')
  const { routes } = validatePublication(documents)
  const images = await prepareShareImages(routes, config.assets.loaders.image.options.storage)
  for (const route of routes) {
    const image = images[route.path]
    if (image) {
      const content = documents[route.document].content
      content.metadata = { ...(content.metadata as object), ogImage: image }
    }
  }
  validatePublication(documents)
  await writeFile('.generated/publication.json', JSON.stringify(documents) + '\n')
  console.log(`Prepared ${Object.keys(documents).length} CMX documents for publication.`)
}
