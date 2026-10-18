import { isCmxDocument, type CmxDocument } from '@cmx-tools/contracts'
import { cmx } from '@cmx-tools/remix'
import { environment } from '../.cmx/environment.ts'
import document from '../.cmx/documents/home.json' with { type: 'json' }

export type ContentLoader = (request: Request) => Promise<CmxDocument>

export const loadContent: ContentLoader = async () => {
  if (!isCmxDocument(document)) throw new Error('Invalid home CMX document')
  return document
}

export function renderContent(document: CmxDocument) {
  const page = cmx(document, environment)
  if (typeof page.title !== 'string') throw new Error('CMX page title must be a string')
  return { title: page.title, body: page.default }
}

export type PageContent = ReturnType<typeof renderContent>
