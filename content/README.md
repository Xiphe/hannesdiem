# Content

| Source                            | Owns                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `people.ts`                       | Shared names/links, including organizations.                                               |
| `pages/songs/**/*.tsx`            | One song: exported typed `song` record + lyrics.                                           |
| `pages/releases/*.tsx`            | One release: exported typed `release` record + prose. Recording details/credits stay here. |
| `pages/one-week-album/**/*.tsx`   | Retreat pages/recaps.                                                                      |
| `pages/*.tsx`                     | Standalone pages; root `404.tsx` anchors CMX entry paths.                                  |
| `routes.ts`                       | Publication paths, document keys, SEO overrides; ordinary titles come from CMX.            |
| `redirects.ts`                    | Legacy aliases and redirect destinations.                                                  |
| `navigation.ts`                   | Navigation sections, legal links, and social/listening links.                              |
| `types.ts`, `contract/index.d.ts` | Authoring types and external component props.                                              |

Import songs from their owning CMX pages: `{ song: allesBrennt, duration: 229 }`. Tracks inherit the song title; set `title` only for a recording-specific override. Instrumentals have a title without a song reference. Credits use `{ ...people.hannesDiem, roles: [...] }`; roles stay on the release. Reprises with separate lyrics remain separate songs.

CMX bundles `pages/**/*.tsx`, resolving page imports and serializing optional `song`/`release` data exports beside the rendered body. Build scripts read that JSON; they do not execute authored JSX. `scripts/build-routes.ts` combines CMX metadata with publication declarations for navigation, SEO, and share cards. Document keys retain folders relative to `pages/`; public URLs come from `routes.ts`. `scripts/build-publication.ts` combines published pages with a reserved `_site` document for routes, navigation, media, and share cards. The Worker reads the accepted collection at runtime; regular production builds keep authored content outside website and browser bundles. An empty host returns 503 until its first publication; website deployments preserve the accepted collection.

`scripts/compile-cmx.ts` uses CMX's Rolldown plugin with `preserveEntrySignatures: 'allow-extension'`. This avoids sourcemap-free forwarding chunks when pages import one another; the CMX bundler expects sourcemaps for those chunks. This integration remains a CMX research candidate.

`npx tsc --noEmit -p content/tsconfig.json`: authoring types on demand. `npm run cmx:build`: CMX + route metadata. `npm run content:build`: complete publication and media. `npm run build:app`: production implementation environment and app assets, without content or media preprocessing. `npm run build`: local fixture and app assets for tests. `npm run check`: app functionality, no editorial inventories or snapshots. The current content workflow processes media on each run; uploading skips immutable objects already present in R2.

Merging content to `main` publishes automatically; see [publishing](../docs/content-publishing.md).

Shared publication types and validation live in `contracts/content.ts`. Component
props live in `content/contract/`; `cmx.config.ts` connects them to the app
implementations. See [architecture](../docs/architecture.md) for the full ownership map.
