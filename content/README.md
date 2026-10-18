# Content

| Source                            | Owns                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `people.ts`                       | Shared names/links, including organizations.                                  |
| `songs.ts`                        | Song slug, title, writing date, authors, dedication.                          |
| `pages/songs/**/*.tsx`            | Lyrics; spreads shared song metadata, excluding its slug.                     |
| `pages/releases/*.ts`             | Release metadata, ordered tracks, shops, contributor roles.                   |
| `pages/releases/*.tsx`            | Release prose; imports sibling metadata.                                      |
| `pages/one-week-album/**/*.tsx`   | Retreat pages/recaps.                                                         |
| `pages/*.tsx`                     | Remaining standalone pages; root `404.tsx` anchors CMX entry paths.           |
| `routes.ts`                       | Public paths, document keys, SEO/publication metadata. Reuses songs/releases. |
| `types.ts`, `contract/index.d.ts` | Authoring types and external component props.                                 |

Credits: `{ ...people.hannesDiem, roles: [...] }`; roles stay with the release. Tracks reuse song titles/references while keeping recording duration, additions, and intentional title overrides local. Instrumentals need no song reference; reprises with separate lyrics remain separate songs.

Only `pages/**/*.tsx` becomes CMX documents; imported `.ts` values resolve at build time. Document keys retain folders relative to `pages/` (e.g. `releases/hoffnung`, `songs/irgendwann/reprise`); public URLs come from `routes.ts`. The Worker consumes generated route JSON and self-contained CMX documents. Authored catalogs do not enter browser bundles.

`npx tsc --noEmit -p content/tsconfig.json` checks authoring types on demand. `npm run build:app` compiles content without media preprocessing. `npm run check` stays focused on app functionality; no editorial inventories or content snapshots.
