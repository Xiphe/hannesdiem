# hannesdiem.de

Remix 3 SSR + CMX on Cloudflare Workers. Node 24 + npm; Git LFS for `content/media/**`.

```sh
git lfs install
git lfs pull
npm ci
npx playwright install --with-deps chromium
npm run build
npm run check
```

`npm run format` applies Prettier to authored files, including CMX. After `build` (or `dev`), `check` enforces formatting, app types, and server/browser functionality; it does not rebuild or assert editorial content, route counts, or a migration inventory. `npm test` also uses existing build artifacts. Local development needs no cloud credentials.

`npm run dev`: port 8787; watches `content/`, `app/`, `cmx.config.ts`, and `scripts/`, rebuilds CMX/app assets, and reloads the browser. Existing processed media is reused; run `npm run build` after media changes. `sand tunnel 8787` forwards the preview. The custom build hook runs only for `wrangler dev`; Actions owns production builds.

## Content

`content/pages/` groups authored CMX into releases, songs, and One Week Album pages. Each song/release owns its typed metadata and body in one CMX file; people are shared. [content/README.md](content/README.md) maps ownership. `content/routes.ts` declares publication paths and SEO overrides; the build combines these with CMX exports into `.generated/routes.json`. `/` redirects to `/linktree`; legacy aliases and direct lyric URLs remain supported. `app/content-components.tsx` owns native Remix styling/markup; `app/media.ts` resolves image identities. Ordinary rich-text HTML and intentional one-offs are allowed. No Payload/Next/React runtime.

`npm run build`: `content:build` (CMX, route metadata, media, and complete publication) → local fixture + app assets. `build:app` generates only the implementation environment and app assets for production. Generated files: `.generated/`, `.cmx/`, `dist/`. `cmx.config.ts` implementation paths are relative to `.cmx/environment.ts`. Production Workers read published content from persistent storage; production builds keep authored content outside website and browser bundles. Website CI uses synthetic CMS input; compilation, image metadata extraction, and site integration checks belong to the content pipeline. [Content publishing](docs/content-publishing.md) covers the pipeline and signing setup.

Native Remix `css`/`mix` emits server-rendered styles. Only menu/dialog controls, newsletter state/forms, and localized dates hydrate. Navigation is cached page HTML and opens locally; its island loads private state after opening. Lyric links use canonical `/song/*` URLs; `data-rmx-src` fetches private `/m/song/*` Frame fragments. Public content DOM remains static. Decisions: `docs/adr/0003-*` through `0006-*`.

## Media

51 originals in LFS; `content/media.json` preserves alt text, dimensions, focal points, and source IDs. Sharp emits immutable WebP variants (320/480/960/1440/1920/up to 2560px; no upscaling). Share cards retain the legacy 1052×550 canvas/fonts; releases share cover images. The content publication includes generated image URLs/srcSets.

Actions alone installs `tools/palette` and runs `scripts/content/palettes.ts` using legacy `node-vibrant@4.0.4`. `content/palettes.json` is a saved Actions output for local previews; SHA mismatches fall back to the default theme until preprocessing. Do not install the palette tool locally.

Local `MEDIA_BASE_URL` defaults to `/media`; production uses `https://media.hannesdiem.de`. Content CI processes media on every run. A single R2 listing finds missing immutable keys; only those upload, and old objects remain. `sharp` is build-only. Browser tests substitute local files for remote media; deployment smoke checks actual hosting. App logo/font stay in Workers Static Assets. The dedicated content workflow owns media upload before publishing references.

## Deployment

`deploy.yml` deploys website code; `content.yml` publishes content. Both run on matching pushes to `main` and share a concurrency group. Their execution order is unspecified. Content smoke checks app endpoints/assets, the active publication revision, and representative R2 files. Configure the publishing key and site URL through [content publishing](docs/content-publishing.md), alongside the existing [Production environment](https://github.com/Xiphe/hannesdiem/settings/environments/24638962215/edit) settings:

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
