import { CMX_DOCUMENT_SCHEMA, CMX_DOCUMENT_VERSION, type CmxDocument } from '@cmx-tools/contracts'
import { readFile, writeFile } from 'node:fs/promises'
import { navigation } from '../../content/navigation.ts'
import { redirects } from '../../content/redirects.ts'
import {
  siteEntry,
  validatePublication,
  type PublishedDocuments,
  type SiteMetadata,
} from '../../contracts/content.ts'

const read = async (file: string) => JSON.parse(await readFile(file, 'utf8'))
const routes: SiteMetadata['routes'] = await read('.generated/routes.json')
const documents: PublishedDocuments = Object.fromEntries(
  await Promise.all(
    [...new Set(['404', ...routes.map((route) => route.document)])].map(async (key) => [
      key,
      await read(`.cmx/documents/${key}.json`),
    ]),
  ),
)
if (Object.hasOwn(documents, siteEntry)) throw new Error('Reserved CMX entry: ' + siteEntry)
documents[siteEntry] = {
  $schema: CMX_DOCUMENT_SCHEMA,
  cmxVersion: CMX_DOCUMENT_VERSION,
  interface: { imports: {}, exports: { site: {} } },
  content: {
    site: {
      version: 1,
      routes,
      media: await read('.generated/media.json'),
      shareImages: await read('.generated/og.json'),
      navigation: navigation(routes),
      redirects: [...redirects].map(([path, destination]) => ({
        path,
        ...destination,
        ...(path === '/' ? { preserveSearch: true } : {}),
      })),
    } satisfies SiteMetadata,
  },
} satisfies CmxDocument
validatePublication(documents)
await writeFile('.generated/publication.json', JSON.stringify(documents) + '\n')
console.log(`Prepared ${Object.keys(documents).length} CMX documents for publication.`)
