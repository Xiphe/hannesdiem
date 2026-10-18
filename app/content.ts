import { isCmxDocument, type CmxDocument } from '@cmx-tools/contracts'
import { cmx } from '@cmx-tools/remix'
import { environment } from '../.cmx/environment.ts'
import home from '../.cmx/documents/home.json' with { type: 'json' }
import example from '../.cmx/documents/example.json' with { type: 'json' }
import notFound from '../.cmx/documents/404.json' with { type: 'json' }

export interface ContentPage {
  document: CmxDocument
  status: 200 | 404
  key: string
}

export type ContentLoader = (request: Request) => Promise<ContentPage>

const pages = new Map<string, { key: string; document: unknown }>([
  ['/', { key: 'home', document: home }],
  ['/example', { key: 'example', document: example }],
])

export const loadContent: ContentLoader = async (request) => {
  const page = pages.get(new URL(request.url).pathname)
  const document = page?.document ?? notFound
  if (!isCmxDocument(document)) throw new Error('Invalid CMX document')
  return { document, status: page ? 200 : 404, key: page?.key ?? '404' }
}

export function renderContent(document: CmxDocument) {
  const page = cmx(document, environment)
  if (typeof page.title !== 'string') throw new Error('CMX page title must be a string')
  return { title: page.title, body: page.default }
}

export type PageContent = ReturnType<typeof renderContent>
