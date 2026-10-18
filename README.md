# hannesdiem.de

Remix 3 / Cloudflare Workers spike: cached SSR, one browser island, bundled content fixture. Node 24 + npm.

```sh
npm ci
npx playwright install --with-deps chromium
npm run dev
npm run check
```

`check`: build, typecheck, server/browser tests, Wrangler deployment dry run. No Cloudflare credentials needed.

Pushes to `main` run checks, deploy the checked artifacts, then smoke test the public `workers.dev` URL. Deployment URL appears in the Actions summary. Local deployment: `npm run check && npm run deploy` with Cloudflare credentials exported.

## GitHub Actions configuration

[Repository settings → Secrets and variables → Actions](https://github.com/Xiphe/hannesdiem/settings/secrets/actions):

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | Account-owned token: **Specified Workers** → `hannesdiem-remix-spike` → **Editor**. |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Target account ID. |

First create `hannesdiem-remix-spike` yourself: Workers & Pages → Create application → Start with Hello World! → Get started → name → Deploy. CI updates this existing Worker; no Admin or zone permissions. Create its token under Manage account → Account API tokens. [Scoped tokens](https://developers.cloudflare.com/changelog/post/2026-09-15-granular-worker-permissions/), [token creation](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/), [account ID](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/).

Missing credentials fail after checks with setup instructions. Set the values, then rerun the failed deployment job.

## Content and caching

Async content loader currently reads a bundled fixture; future CMX HTTP content replaces its implementation. Bundled content changes require app deployment; hosted content publication will be independent.

SSR HTML: 60-second edge TTL; browsers revalidate. Future CMX publication triggers cache invalidation; this spike has no webhook endpoint. Code deployments start with a fresh cache. JS/CSS use Workers Static Assets. [Workers Cache](https://developers.cloudflare.com/workers/cache/), [static asset versioning](https://developers.cloudflare.com/workers/versions-and-deployments/).
