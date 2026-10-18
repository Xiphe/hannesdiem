# hannesdiem.de

Remix 3 SSR + CMX on Cloudflare Workers. Node 24 + npm; Git LFS for `content/media/**`.

```sh
git lfs install
git lfs pull
npm ci
npx playwright install --with-deps chromium
npm run dev
npm run check
```

`check`: media/CMX/app build, typechecks, server/browser tests, deployment dry run. `npm test` uses existing build artifacts. Local development needs no cloud credentials.

## Content

34 routes: four CMS pages, five releases, 21 lyric pages, linktree/about/imprint/privacy. `/` redirects to `/linktree`; legacy aliases and direct lyric URLs remain supported. `content/routes.json` holds paths and metadata; `content/pages/*.tsx` are authored CMX; `content/contract` is the external component contract. `app/content-components.tsx` owns native Remix styling/markup; `app/media.ts` resolves image identities. Ordinary rich-text HTML and intentional one-offs are allowed. No Payload/Next/React runtime.

`npm run build`: media → CMX bundle/documents/Environment → browser assets/content registry. Generated files: `.generated/`, `.cmx/`, `dist/`. `cmx.config.ts` implementation paths are relative to `.cmx/environment.ts`. Content stays outside the browser graph. Current publication still requires CI; hosted CMX will replace the async loader.

Native Remix `css`/`mix` emits server-rendered styles. Only menu/dialog controls and localized dates hydrate. Named overlay Frames fetch private navigation/lyrics; public content DOM remains static. Styling, media, and newsletter decisions: `docs/adr/0003-*` through `0005-*`.

## Media

51 originals in LFS; `content/media.json` preserves alt text, dimensions, focal points, and source IDs. Sharp emits immutable WebP variants (320/480/960/1440/1920/up to 2560px; no upscaling). Share cards retain the legacy 1052×550 canvas/fonts; releases share cover images. Generated image URLs/srcSets remain implementation metadata.

Actions alone installs `tools/palette` and runs `scripts/extract-palettes.ts` using legacy `node-vibrant@4.0.4`. `content/palettes.json` is a saved Actions output for local previews; SHA mismatches fall back to the default theme until preprocessing. Refresh it from the `media-palettes` workflow artifact after changing originals. Do not install the palette tool locally.

Local `MEDIA_BASE_URL` defaults to `/media`; production uses `https://media.hannesdiem.de`. CI uploads variants, share cards, and a content-hashed metadata manifest directly to R2 before deploying; retains old objects. `sharp` is build-only. Browser tests substitute local files for remote media; deployment smoke checks actual hosting. App logo/font stay in Workers Static Assets. Preprocessing will move alongside hosted content.

## Deployment

Only pushes to `main` run checks, upload media, deploy, and smoke-test all 34 routes. Worker: `hannesdiem`; deployment URL appears in Actions. [Production environment](https://github.com/Xiphe/hannesdiem/settings/environments/24638962215/edit):

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | Account token, specified Worker `hannesdiem`, Editor minimum. |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Destination account ID. |
| Variable | `R2_ACCOUNT_ID` | Account containing `hannesdiem-media` and the DNS zone. |
| Secret | `R2_ACCESS_KEY_ID` | Object Read & Write, only `hannesdiem-media`. |
| Secret | `R2_SECRET_ACCESS_KEY` | Matching S3 secret. |
| Secret | `NEWSLETTER_SESSION_SECRET` | Stable random ≥32 bytes; e.g. `openssl rand -base64 32`. |
| Secret | `RESEND_HANNESDIEM_DE_API_KEY` | Existing Resend key with sending and contact access. |
| Variable | `RESEND_HANNESDIEM_DE_SEGMENT_ID` | Existing site's segment ID. |

R2 custom domain: `media.hannesdiem.de`; `r2.dev` disabled. No Worker media proxy or plain-image CORS setup. Worker deploy declares its SQLite Durable Object; no account-wide permission needed. Actions deploys newsletter secrets/variable when all three are present; otherwise content deploys with signup unavailable. Details: [newsletter](docs/newsletter.md).

SSR HTML: browser revalidation, 60-second edge TTL, per-page cache tag. Missing pages, menu/account/forms, and auth responses: `no-store`. Public pages never set session cookies. Future CMX publication can invalidate tagged HTML; no webhook yet.

Deployment is reviewed on `workers.dev`; the production-domain cutover is separate. Legacy reference: `Xiphe/sites@463a13d62af76b145ef9729d1a3fe7ad824da786`; source DB snapshot: 2026-10-18. Raw exports/private state remain outside this public repo.
