# Document host

The application receives signed CMX documents, accepts a complete Publication,
serves coherent content snapshots, and completes cache refresh.

`index.ts` exposes content loading and prepared sources without a Worker dependency.
`cloudflare.ts` exposes `createDocumentHost`, which provides `handle` for incoming
publication/status requests and `load` for rendering. It owns persistent storage,
signature verification, replay protection, and revision-specific cache refresh.
`ContentState` remains the Worker export for the existing persistent binding.

CI owns publishing: content and media preparation run through `scripts/build-*.ts`,
media upload through `scripts/upload-media.ts`, and the CMX publishing command uses
[`scripts/publishing/transport.ts`](../../scripts/publishing/transport.ts) to sign
outgoing requests with the private key. The application only verifies them.
`scripts/publishing/config.ts` configures that command separately from the app's
CMX implementation configuration.

Shared contracts live outside the app:
[`contracts/content.ts`](../../contracts/content.ts) defines the document collection
and its validation; [`contracts/publication.ts`](../../contracts/publication.ts)
defines the endpoint and signed-request format. Neither imports app or CI code.

Production uses the persistent source. `app/local-worker.ts` supplies a prepared
source for local authoring; `tests/website-worker.ts` supplies synthetic documents
for website checks. These entry points use the same Worker composition as production.
Builds produce data and assets, without rewriting source modules to select content.

The module tests send requests with the CI signer through the real Worker route
and provide a cache-refresh adapter, including failure and retry behavior.
