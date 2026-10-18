# hannesdiem.de

Remix 3 / Cloudflare Workers spike: cached SSR, one browser island, same-repo CMX content. Node 24 + npm.

```sh
npm ci
npx playwright install --with-deps chromium
npm run dev
npm run check
```

`check`: build, typecheck, server/browser tests, Wrangler deployment dry run. No Cloudflare credentials needed.

Pushes to `main` run checks, deploy the checked artifacts, then smoke test the public `workers.dev` URL. Deployment URL appears in the Actions summary. Local deployment: `npm run check && npm run deploy` with Cloudflare credentials exported.

## GitHub Actions configuration

[GitHub environment: Production](https://github.com/Xiphe/hannesdiem/settings/environments/24638962215/edit):

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | Account-owned token: **Specified Workers** → `hannesdiem`; **Editor** minimum (Worker-scoped Admin also works). |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Target account ID. |
| Variable | `R2_ACCOUNT_ID` | Account containing `hannesdiem-media` and the `hannesdiem.de` DNS zone. Independent of the Worker account. |
| Secret | `R2_ACCESS_KEY_ID` | R2 S3 access key: **Object Read & Write**, scoped only to `hannesdiem-media`. |
| Secret | `R2_SECRET_ACCESS_KEY` | Matching R2 S3 secret key. |

Existing Worker: `hannesdiem`. CI deploys through the `Production` environment; no account-wide or zone permissions required. Token creation: Manage account → Account API tokens. [Scoped tokens](https://developers.cloudflare.com/changelog/post/2026-09-15-granular-worker-permissions/), [token creation](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/), [account ID](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/).

Missing credentials fail after checks with setup instructions. Set the values, then rerun the failed deployment job.

## Assets

`app/assets/mark.svg` is hashed into `/assets/` and deployed with the Worker. `content/media/landscape.svg` becomes WebP variants at 480/960/1440px; SHA-256 filenames and a plain `.generated/media.json` manifest feed CMX `<img>` props (`src`, `srcSet`, dimensions). This manifest is temporary glue until CMX supports assets.

Local builds default to `/media/` and copy variants into `dist`; no cloud credentials needed. Production CI sets `MEDIA_BASE_URL=https://media.hannesdiem.de`, keeps media out of the Worker artifact, and uploads `.generated/media-files.json` entries to R2 over S3 before deploying. Objects use immutable caching; old objects remain available. `sharp` runs at build time only; uploads use the runner's AWS CLI. `npm run media:upload` requires `R2_ACCOUNT_ID`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`.

Create `hannesdiem-media` in the same Cloudflare account as the DNS zone. Bucket → Settings → Custom Domains → add `media.hannesdiem.de`; keep `r2.dev` disabled. R2 → Overview → API Tokens → create **Object Read & Write** credentials for this bucket only. Store the values above in `Production`. Plain `<img>` needs no CORS configuration. [R2 custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/), [scoped credentials](https://developers.cloudflare.com/r2/api/tokens/).

Browser checks substitute local generated files for production media URLs; post-deploy smoke verifies actual R2 delivery, MIME type, and cache headers. Assets are never routed through application code.

## Content and caching

`content/pages/*.tsx` → CMX bundle → JSON documents → generated Environment → application build. `npm run build` runs the entire sequence; `npm run cmx:build` runs only CMX. Generated output lives in ignored `.cmx/`. [CMX workflow](https://github.com/cmx-tools/packages#use-cmx-in-a-static-site-build).

`app/content.ts` maps `/` and `/example` to documents; unknown GET paths use `404.json` with HTTP 404 and `no-store`. Health remains `/health`. Successful pages have separate `page:home` / `page:example` cache tags.

Content imports `Counter` from the local `@hannesdiem/content-components` contract (`content/contract`). The generated Environment maps it to `app/cmx-components.ts`, which wraps the browser entry with Remix `clientEntry`. Content uses Remix JSX types; CMX compilation replaces the JSX runtime. `@cmx-tools/remix` resolves document components during SSR; only the counter hydrates. Home starts at 0, `/example` at 10. Content, Environment, and CMX stay outside the browser graph.

Environment implementation paths in `cmx.config.ts` are relative to `.cmx/environment.ts`. Page-specific `data-rmx-key` values on island sections reset state when navigating between documents; component JSX keys do not survive server hydration metadata.

Content changes currently require build/deployment. Future hosted CMX replaces the document loader, preserving runtime SSR and independent publication.

SSR HTML: 60-second edge TTL; browsers revalidate. Future CMX publication triggers cache invalidation; this spike has no webhook endpoint. Code deployments start with a fresh cache. JS/CSS use Workers Static Assets. [Workers Cache](https://developers.cloudflare.com/workers/cache/), [static asset versioning](https://developers.cloudflare.com/workers/versions-and-deployments/).
