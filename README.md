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

```sh
npm run dev
```

[Content](content/README.md) · [Website workflow](.github/workflows/deploy.yml) · [Content workflow](.github/workflows/content.yml) · [Publishing setup](scripts/configure-content-publishing.ts)
