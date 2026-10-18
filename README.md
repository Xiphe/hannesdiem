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
| Secret | `CLOUDFLARE_API_TOKEN` | Account-owned token: **Specified Workers** → `hannesdiem-remix`; **Editor** minimum (Worker-scoped Admin also works). |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Target account ID. |

Existing Worker: `hannesdiem-remix`. CI deploys through the `Production` environment; no account-wide or zone permissions required. Token creation: Manage account → Account API tokens. [Scoped tokens](https://developers.cloudflare.com/changelog/post/2026-09-15-granular-worker-permissions/), [token creation](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/), [account ID](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/).

Missing credentials fail after checks with setup instructions. Set the values, then rerun the failed deployment job.

## Content and caching

`content/pages/*.tsx` → CMX bundle → JSON documents → generated Environment → application build. `npm run build` runs the entire sequence; `npm run cmx:build` runs only CMX. Generated output lives in ignored `.cmx/`. [CMX workflow](https://github.com/cmx-tools/packages#use-cmx-in-a-static-site-build).

`app/content.ts` maps `/` and `/example` to documents; unknown GET paths use `404.json` with HTTP 404 and `no-store`. Health remains `/health`. Successful pages have separate `page:home` / `page:example` cache tags.

Content imports `Counter` from the local `@hannesdiem/content-components` contract (`content/contract`). The generated Environment maps it to `app/cmx-components.ts`, which wraps the browser entry with Remix `clientEntry`. Content uses Remix JSX types; CMX compilation replaces the JSX runtime. `@cmx-tools/remix` resolves document components during SSR; only the counter hydrates. Home starts at 0, `/example` at 10. Content, Environment, and CMX stay outside the browser graph.

Environment implementation paths in `cmx.config.ts` are relative to `.cmx/environment.ts`. Page-specific `data-rmx-key` values on island sections reset state when navigating between documents; component JSX keys do not survive server hydration metadata.

Content changes currently require build/deployment. Future hosted CMX replaces the document loader, preserving runtime SSR and independent publication.

SSR HTML: 60-second edge TTL; browsers revalidate. Future CMX publication triggers cache invalidation; this spike has no webhook endpoint. Code deployments start with a fresh cache. JS/CSS use Workers Static Assets. [Workers Cache](https://developers.cloudflare.com/workers/cache/), [static asset versioning](https://developers.cloudflare.com/workers/versions-and-deployments/).
