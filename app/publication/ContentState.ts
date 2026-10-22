import { PublicationRequestError } from './PublicationRequestError.ts'
import { DurableObject } from 'cloudflare:workers'
import {
  createCmxDocumentHost,
  type CmxDocumentStore,
  type CmxDocumentStoreCommit,
} from '@cmx-tools/document-host'
import { verifyCmxDocumentEnvironment, type CmxDocument } from '@cmx-tools/contracts'
import { cmx } from '@cmx-tools/remix'
import { environment } from '../../.cmx/environment.ts'
import { contentPage } from './source.ts'
import { siteEntry, readSite, validatePublication, type PublishedDocuments } from './collection.ts'
import { verifyPublicationRequest, manifestConditionHeader } from './signatures.ts'

const emptyState = {
  contentHash: 'sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
  manifest: {} as Record<string, string>,
}
const privateHeaders = { 'Cache-Control': 'no-store' }
class InvalidCollection extends Error {}

export class ContentState extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS documents (entry TEXT PRIMARY KEY, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS publication (id INTEGER PRIMARY KEY CHECK (id = 1), state TEXT NOT NULL, purge_pending INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS publication_nonces (nonce TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    `)
  }

  private state() {
    const row = this.ctx.storage.sql
      .exec<{ state: string }>('SELECT state FROM publication WHERE id = 1')
      .toArray()[0]
    return row ? (JSON.parse(row.state) as typeof emptyState) : structuredClone(emptyState)
  }

  private document(key: string): CmxDocument | undefined {
    const row = this.ctx.storage.sql
      .exec<{ document: string }>('SELECT document FROM documents WHERE entry = ?', key)
      .toArray()[0]
    return row ? JSON.parse(row.document) : undefined
  }

  private commit(publication: CmxDocumentStoreCommit): boolean {
    return this.ctx.storage.transactionSync(() => {
      if (this.state().contentHash !== publication.baseContentHash) return false
      const documents: PublishedDocuments = Object.fromEntries(
        this.ctx.storage.sql
          .exec<{ entry: string; document: string }>('SELECT entry, document FROM documents')
          .toArray()
          .map((row) => [row.entry, JSON.parse(row.document)]),
      )
      for (const key of publication.remove) delete documents[key]
      for (const [key, document] of Object.entries(publication.upsert)) {
        Object.defineProperty(documents, key, {
          value: document,
          enumerable: true,
          configurable: true,
        })
      }
      try {
        validatePublication(documents)
        for (const document of Object.values(documents)) {
          const verification = verifyCmxDocumentEnvironment(document, environment)
          if (!verification.valid)
            throw new Error('Content requires a different component contract.')
          // Resolve named component imports as well as verifying dependency versions.
          cmx(document, environment)
        }
      } catch (error) {
        throw new InvalidCollection(error instanceof Error ? error.message : 'Invalid publication')
      }
      for (const key of publication.remove)
        this.ctx.storage.sql.exec('DELETE FROM documents WHERE entry = ?', key)
      for (const [key, document] of Object.entries(publication.upsert)) {
        this.ctx.storage.sql.exec(
          'INSERT OR REPLACE INTO documents (entry, document) VALUES (?, ?)',
          key,
          JSON.stringify(document),
        )
      }
      this.ctx.storage.sql.exec(
        'INSERT OR REPLACE INTO publication (id, state, purge_pending) VALUES (1, ?, 1)',
        JSON.stringify(publication.target),
      )
      return true
    })
  }

  status() {
    const dependencies = new Map<string, import('@cmx-tools/contracts').CmxDependency>()
    const components = new Map<string, { from: string; name: string }>()
    const versions = new Set<CmxDocument['cmxVersion']>()
    const visit = (value: unknown) => {
      if (!value || typeof value !== 'object') return
      if (
        !Array.isArray(value) &&
        'type' in value &&
        value.type === 'component' &&
        'from' in value &&
        typeof value.from === 'string'
      ) {
        const name =
          'import' in value && typeof value.import === 'string' ? value.import : 'default'
        components.set(JSON.stringify([value.from, name]), { from: value.from, name })
      }
      for (const child of Object.values(value)) visit(child)
    }
    for (const row of this.ctx.storage.sql
      .exec<{ document: string }>('SELECT document FROM documents')
      .toArray()) {
      const document = JSON.parse(row.document) as CmxDocument
      versions.add(document.cmxVersion)
      for (const dependency of Object.values(document.interface.imports))
        dependencies.set(JSON.stringify(dependency), dependency)
      visit(document.content)
    }
    return {
      ready: Object.keys(this.state().manifest).length > 0,
      versions: [...versions],
      dependencies: [...dependencies.values()],
      components: [...components.values()],
    }
  }

  // Materialize metadata and page synchronously: publication cannot interleave between reads.
  readPage(path: string) {
    const state = this.state()
    if (!Object.keys(state.manifest).length) return null
    const site = readSite(this.document(siteEntry))
    return contentPage(path, site, (key) => this.document(key), state.contentHash)
  }

  pendingPurge(): string | null {
    const row = this.ctx.storage.sql
      .exec<{ purge_pending: number }>('SELECT purge_pending FROM publication WHERE id = 1')
      .toArray()[0]
    return row?.purge_pending ? this.state().contentHash : null
  }

  acknowledgePurge(contentHash: string) {
    if (this.state().contentHash === contentHash)
      this.ctx.storage.sql.exec('UPDATE publication SET purge_pending = 0 WHERE id = 1')
  }

  async fetch(request: Request): Promise<Response> {
    if (!['GET', 'PUT'].includes(request.method))
      return new Response('Method not allowed', {
        status: 405,
        headers: { ...privateHeaders, Allow: 'GET, PUT' },
      })
    try {
      const { nonce, expires, body } = await verifyPublicationRequest(
        request,
        this.env.CMX_PUBLISH_PUBLIC_KEYS,
      )
      const consumed = this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec(
          'DELETE FROM publication_nonces WHERE expires < ?',
          Math.floor(Date.now() / 1000),
        )
        const rows = this.ctx.storage.sql.exec(
          'INSERT INTO publication_nonces (nonce, expires) VALUES (?, ?) ON CONFLICT DO NOTHING RETURNING nonce',
          nonce,
          expires,
        )
        return rows.toArray().length === 1
      })
      if (!consumed)
        throw new PublicationRequestError('Publication signature has already been used.', 401)
      let invalidCollection: InvalidCollection | undefined
      const store: CmxDocumentStore = {
        getState: async () => this.state(),
        getDocument: async (key) => this.document(key),
        commit: async (publication) => {
          try {
            return this.commit(publication)
          } catch (error) {
            if (!(error instanceof InvalidCollection)) throw error
            invalidCollection = error
            return false
          }
        },
      }
      const host = createCmxDocumentHost({
        store,
        verifyIncomingDocument: (document) => verifyCmxDocumentEnvironment(document, environment),
      })
      const publicationHeaders = new Headers(request.headers)
      if (request.method === 'GET') {
        publicationHeaders.set('If-None-Match', request.headers.get(manifestConditionHeader)!)
      }
      const response = await host.handlePublication(
        new Request(request.url, {
          method: request.method,
          headers: publicationHeaders,
          body: request.method === 'GET' ? undefined : body,
        }),
      )
      if (invalidCollection)
        return Response.json(
          { message: invalidCollection.message },
          { status: 422, headers: privateHeaders },
        )
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'no-store')
      return new Response(response.body, { status: response.status, headers })
    } catch (error) {
      if (error instanceof PublicationRequestError)
        return Response.json(
          { message: error.message },
          { status: error.status, headers: privateHeaders },
        )
      console.error(JSON.stringify({ message: 'Content publication failed' }))
      return Response.json(
        { message: 'Content publication failed.' },
        { status: 500, headers: privateHeaders },
      )
    }
  }
}
