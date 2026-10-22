# Publication

Owns publication acceptance, coherent content reads, and completion of cache refresh.

`index.ts` is the portable entry point for document types, collection verification,
signed requests, and prepared content sources. Authoring commands can load it in Node.

`cloudflare.ts` is the runtime adapter. `createPublication` provides `handle` for
publication/status requests and `load` for the existing content-loading seam. It owns
the named Durable Object, revision-specific refresh acknowledgement, and retries.
`ContentState` remains the Worker export for the existing persistent binding.

Production uses the persistent source. `app/local-worker.ts` supplies a prepared
source for local authoring; `tests/website-worker.ts` supplies synthetic documents
for website checks. These entry points use the same Worker composition as production.
Builds produce data and assets, without rewriting source modules to select content.

The SQLite adapter and HTTP authentication are implementation details. Site routing,
Remix rendering, and the contents of the site metadata remain application decisions.
The module tests publish through the real Worker route and provide a cache-refresh
adapter, including failure and retry behavior.
