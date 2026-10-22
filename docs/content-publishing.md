# Independent content publishing

Merging to `main` publishes content without deploying website code. Pages, public
paths, redirects, navigation/social links, SEO, media metadata, and share cards publish as
one collection. Remix implementations, styles, and component contracts belong to
website deployment. Content remains in this repository.

## Release flow

Pushes to `main` run `deploy.yml`:

1. Detect website and content changes.
2. Build, check, and deploy website code when needed.
3. Call `content.yml` to prepare and publish changed content after website deployment succeeds. Content-only changes skip website deployment.

The Production concurrency group covers the whole sequence without cancelling
running jobs. A failed website deployment blocks publishing. Both jobs check out
the same commit; no build artifacts pass between them.

The content workflow compiles and typechecks CMX, processes media, uploads
missing immutable R2 objects, and publishes the complete document map. Rendering
uses `--complete-only` to prevent failed entries from becoming deletions. The
reserved `_site` entry carries routes, navigation, media, and share-card metadata.

The embedded host stores documents in the `CONTENT_STATE` SQLite Durable Object.
It checks the complete candidate against the deployed component environment and
commits documents and metadata in one transaction. Page reads materialize a
consistent snapshot. Website deployments preserve that storage. Production
bundles contain no authored documents or generated content/media manifests.
The website job uses synthetic CMS documents for server and browser checks; it
never compiles authored content, checks out LFS media, or receives R2 credentials.
The content workflow owns the full site integration suite and media processing.

The Worker owns cache refresh: after accepting content it purges the shared
`content` tag through Workers Cache. If purging fails, accepted content remains
stored with a pending refresh. Retrying publication, including an unchanged
manifest GET, completes that refresh. CI only sees publishing success or failure.
Success means the purge was accepted; global propagation takes a short time. The
60-second edge TTL remains a fallback. Private responses remain uncached.

An empty host returns 503 until its first publication. Production is initialized;
website deployments keep serving its stored collection.
Before deploying code, CI checks published CMX versions, dependency contracts,
and named imports against the new implementation environment. A release that
would reject the current collection stops before deployment. Implementation changes must
preserve the component prop behavior used by the currently published collection.

## Signing and setup

CI signs GET and PUT requests with Ed25519 HTTP Message Signatures (RFC 9421).
`npm run content:publish` uses `scripts/publishing/config.ts` and the signer in
`scripts/publishing/`. The app's `document-host` module verifies incoming requests;
shared document and request contracts live in `contracts/`.
The Worker stores public keys only. Signatures cover the destination URI, method,
content type, SHA-256 content digest, and `CMX-If-None-Match` on GET. The host
restores the standard conditional header only after verifying the signature; this
keeps edge cache handling from stripping the authenticated manifest condition.
Each proof expires after 60 seconds with five seconds of clock tolerance. SQLite
consumes each nonce once, preserving replay records across restarts. Retries use
fresh signatures. The transport pins its endpoint and refuses redirects.

The Production GitHub environment needs:

| Kind     | Name                      | Purpose                                              |
| -------- | ------------------------- | ---------------------------------------------------- |
| Secret   | `CMX_PUBLISH_PRIVATE_KEY` | Private Ed25519 JWK used only by publishing CI.      |
| Variable | `CMX_PUBLISH_KEY_ID`      | ID of the signing key.                               |
| Variable | `CMX_PUBLISH_PUBLIC_KEYS` | JSON object mapping accepted key IDs to public JWKs. |
| Variable | `SITE_URL`                | Stable website origin without a trailing slash.      |

Existing R2 credentials upload media. Cloudflare deployment credentials are used
only by the website job. The setup script configures the publishing key pair and
destination before the first publication.

Configure without printing a private key:

```sh
SITE_URL=https://hannesdiem.YOUR-SUBDOMAIN.workers.dev node scripts/configure-content-publishing.ts
```

The script generates a key if absent, stores it encrypted in gopass at
`projects/hannesdiem/cmx/publishing-private-key`, and streams it to GitHub's
environment secret. Existing keys are reused. It sets the public keyring, key ID,
and site origin as environment variables. Deployment passes the public keyring to
the Worker. No private key is written to the repository or `.env`.

For rotation, deploy the additional public key before switching CI's private key
and key ID. Once active runs finish and the signature window passes, remove the
old public key and deploy the reduced keyring. Removing a key revokes that
publisher. Compromised CI or a stolen private key can still authorize publication.

## Local work and rollback

`npm run dev` retains local content previews and browser reloads without cloud
credentials. `npm run build` creates a local fixture for tests. `npm run build:app`
generates only the implementation environment and app assets. Use `PLAYWRIGHT_PORT` to isolate tests across worktrees.

Revert the content change on `main` to roll back through the same pipeline. Old
immutable R2 files remain available. There is no separate rollback endpoint or
automatic rollback after a cache-refresh failure.

Sources: [CMX host](https://github.com/cmx-tools/packages/blob/main/packages/document-host/README.md),
[CMX publishing](https://github.com/cmx-tools/packages/blob/main/packages/publish/README.md),
[HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html),
[Workers Cache purge](https://developers.cloudflare.com/workers/cache/purge/).
