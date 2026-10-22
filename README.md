# hannesdiem.de

A production Remix 3 site on Cloudflare Workers, with content published through
CMX. This codebase also serves as a reference for similar projects and research
for CMX's alpha APIs.

## Start locally

Use Node 24, npm, and Git LFS. From a fresh checkout:

```sh
git lfs install
git lfs pull
npm ci
npx playwright install --with-deps --only-shell chromium
npm run build
npm run check
```

Then run `npm run dev` to serve the site on port 8787. From your computer,
`sand tunnel 8787` forwards the preview. Local development needs no cloud credentials.

Development watches content, app code, CMX configuration, and build scripts; it
rebuilds and reloads the browser. Existing processed media is reused. Run
`npm run build` after changing media. `npm run check` uses existing build artifacts;
run the build first in a fresh checkout. `PLAYWRIGHT_PORT` selects a separate test
server port when working in parallel worktrees.

## Find the owner

[Architecture](docs/architecture.md) maps hosting, publishing, shared contracts,
rendering, and the local/test entrypoints. The app owns the document host; CI owns
publishing; shared contracts live outside the app.

- [Content authoring](content/README.md): pages, Song and Release metadata, navigation, and public paths.
- [Content publishing](docs/content-publishing.md): the two workflows, signing setup, cache refresh, and rollback.
- [Newsletter](docs/newsletter.md): sessions, confirmation, and optional delivery configuration.
- [CMX research](docs/research/cmx-publication-candidates.md): concrete upstream ownership candidates.

`npm run build` prepares local content, media, and app assets. `npm run build:app`
prepares the implementation environment and app assets for website deployment.
Generated output lives in `.cmx/`, `.generated/`, and `dist/`.

## Content and media

Pages live in `content/pages/`; public paths come from `content/routes.ts`.
The publication includes pages, navigation, redirects, SEO, and media metadata.
Remix implementations own presentation; only interactive controls, newsletter
forms, and localized dates hydrate. See [architecture](docs/architecture.md).

Original media is stored in Git LFS. Sharp produces immutable WebP variants and
share cards. Actions extracts palettes using `tools/palette`; local builds use
matching entries from `content/palettes.json` and fall back to the default theme
for new or changed images. CI uses freshly extracted `.generated/palettes.json`.
The palette tool is unnecessary for local development.

Local media defaults to `/media`; the content workflow sets `MEDIA_BASE_URL` to
`https://media.hannesdiem.de`. Every content run processes images and share cards.
Upload lists existing R2 keys and sends only missing immutable objects, retaining
old files for rollback. Browser tests substitute local files for remote media;
the publication smoke check verifies hosting.

## Deployment

Two independent, single-job workflows run on matching pushes to `main`:
[`deploy.yml`](.github/workflows/deploy.yml) deploys the website;
[`content.yml`](.github/workflows/content.yml) publishes content. Both share a
concurrency group, so production jobs run serially without cancelling active jobs.
Their order is unspecified. Deploy a compatible implementation before merging
content that requires it. Each workflow selects changes using its push path filters.

The website job uses synthetic documents and builds without authored pages or
media. The content job prepares the complete publication, uploads media, checks
the site, and publishes signed documents to the embedded host. The app completes
cache refresh. Setup and rollback: [content publishing](docs/content-publishing.md).

Configure the publishing key and site URL there, alongside these existing
[Production environment](https://github.com/Xiphe/hannesdiem/settings/environments/24638962215/edit)
settings:

| Kind     | Name                              | Value                                                         |
| -------- | --------------------------------- | ------------------------------------------------------------- |
| Secret   | `CLOUDFLARE_API_TOKEN`            | Account token, specified Worker `hannesdiem`, Editor minimum. |
| Secret   | `CLOUDFLARE_ACCOUNT_ID`           | Destination account ID.                                       |
| Variable | `R2_ACCOUNT_ID`                   | Account containing `hannesdiem-media` and the DNS zone.       |
| Secret   | `R2_ACCESS_KEY_ID`                | Object Read & Write, only `hannesdiem-media`.                 |
| Secret   | `R2_SECRET_ACCESS_KEY`            | Matching S3 secret.                                           |
| Secret   | `NEWSLETTER_SESSION_SECRET`       | Stable random ≥32 bytes; e.g. `openssl rand -base64 32`.      |
| Secret   | `RESEND_HANNESDIEM_DE_API_KEY`    | Existing Resend key with sending and contact access.          |
| Variable | `RESEND_HANNESDIEM_DE_SEGMENT_ID` | Existing site's segment ID.                                   |

R2 custom domain: `media.hannesdiem.de`; `r2.dev` disabled. No Worker media proxy or plain-image CORS setup. Worker deploy declares its SQLite Durable Object; no account-wide permission needed. Actions deploys newsletter secrets/variable when all three are present; otherwise the website deploys with signup unavailable. Details: [newsletter](docs/newsletter.md).

SSR HTML: browser revalidation, 60-second edge TTL, shared content and per-page cache tags. The Worker purges content-derived responses after publication. Missing pages, menu/account/forms, and publishing/auth responses: `no-store`. Public pages never set session cookies. CMX documents and metadata persist in a dedicated SQLite Durable Object, separately from newsletter state.

Deployment is reviewed on `workers.dev`; the production-domain cutover is separate. Legacy reference: `Xiphe/sites@463a13d62af76b145ef9729d1a3fe7ad824da786`; source DB snapshot: 2026-10-18. Raw exports/private state remain outside this public repo.
