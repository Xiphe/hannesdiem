# Independent content publishing

Merging to `main` publishes content without deploying website code. Pages, public
paths, redirects, navigation/social links, SEO, media metadata, and share cards publish as
one collection. Remix implementations, styles, and component contracts belong to
website deployment. Content remains in this repository.

## Release flow

`deploy.yml` serializes releases on `main`. Each revision is compared with the
last successful release, so superseded pending runs and failed releases do not
lose changes. Content-only changes call `content.yml`. Mixed changes deploy
compatible website code before publishing content. Documentation-only changes
need neither deployment. There is no manual trigger or hosted draft collection.

The content workflow compiles and typechecks CMX, reuses processed media, uploads
missing immutable R2 objects, and publishes the complete document map. Rendering
uses `--complete-only` to prevent failed entries from becoming deletions. The
reserved `_site` entry carries routes, navigation, media, and share-card metadata.

The embedded host stores documents in the `CONTENT_STATE` SQLite Durable Object.
It checks the complete candidate against the deployed component environment and
commits documents and metadata in one transaction. Page reads materialize a
consistent snapshot. Website deployments preserve that storage. Production
bundles normally contain no authored documents or generated content/media manifests.

The Worker owns cache refresh: after accepting content it purges the shared
`content` tag through Workers Cache. If purging fails, accepted content remains
stored with a pending refresh. Retrying publication, including an unchanged
manifest GET, completes that refresh. CI only sees publishing success or failure.
Success means the purge was accepted; global propagation takes a short time. The
60-second edge TTL remains a fallback. Private responses remain uncached.

The first release checks `/_cmx/status`, uploads bootstrap media, and carries a
temporary compiled-content fallback while the new store is empty. The first
signed publication takes precedence immediately; later content changes continue
using persistent storage without rebuilding that fallback. The next website
deployment sees an initialized store and omits the fallback. This also keeps the
site available if initial publication fails. Configure credentials before merging.
Before deploying code, CI checks published CMX versions, dependency contracts,
and named imports against the new implementation environment. A release that
would reject the current collection stops before deployment. Mixed releases must
also preserve existing component prop behavior during the transition.

## Signing and setup

CI signs GET and PUT requests with Ed25519 HTTP Message Signatures (RFC 9421).
The Worker stores public keys only. Signatures cover the destination URI, method,
content type, SHA-256 content digest, and conditional manifest header on GET.
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
only by the website job. The coordinator checks the publishing key pair and
destination before changing the live site.

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
generates only the implementation environment and app assets, disabling that
fixture for production. Use `PLAYWRIGHT_PORT` to isolate tests across worktrees.

Revert the content change on `main` to roll back through the same pipeline. Old
immutable R2 files remain available. There is no separate rollback endpoint or
automatic rollback after a cache-refresh failure.

Sources: [CMX host](https://github.com/cmx-tools/packages/blob/main/packages/document-host/README.md),
[CMX publishing](https://github.com/cmx-tools/packages/blob/main/packages/publish/README.md),
[HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html),
[Workers Cache purge](https://developers.cloudflare.com/workers/cache/purge/).
