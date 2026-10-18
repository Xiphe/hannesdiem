# Content

| Source                            | Owns                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `people.ts`                       | Shared names/links, including organizations.                                               |
| `pages/songs/**/*.tsx`            | One song: exported typed `song` record + lyrics.                                           |
| `pages/releases/*.tsx`            | One release: exported typed `release` record + prose. Recording details/credits stay here. |
| `pages/one-week-album/**/*.tsx`   | Retreat pages/recaps.                                                                      |
| `pages/*.tsx`                     | Standalone pages; root `404.tsx` anchors CMX entry paths.                                  |
| `routes.ts`                       | Publication paths, document keys, SEO overrides; ordinary titles come from CMX.            |
| `types.ts`, `contract/index.d.ts` | Authoring types and external component props.                                              |

Import songs from their owning CMX pages: `{ song: allesBrennt, duration: 229 }`. Tracks inherit the song title; set `title` only for a recording-specific override. Instrumentals have a title without a song reference. Credits use `{ ...people.hannesDiem, roles: [...] }`; roles stay on the release. Reprises with separate lyrics remain separate songs.

CMX bundles `pages/**/*.tsx`, resolving page imports and serializing optional `song`/`release` data exports beside the rendered body. Build scripts read that JSON; they do not execute authored JSX. `scripts/build-routes.ts` combines CMX metadata with publication declarations for navigation, SEO, and share cards. Document keys retain folders relative to `pages/`; public URLs come from `routes.ts`. The Worker consumes self-contained CMX documents and generated route JSON. Authored content stays outside browser bundles.

`scripts/compile-cmx.ts` uses CMX's native Rolldown plugin with `preserveEntrySignatures: 'allow-extension'`: CMX bundle 0.1.1 otherwise rejects sourcemap-free forwarding chunks created by page imports. Rolldown is an explicit build dependency, at CMX's existing installed version.

`npx tsc --noEmit -p content/tsconfig.json`: authoring types on demand. `npm run cmx:build`: CMX + route metadata. `npm run build:app`: adds app assets without media preprocessing. `npm run check`: app functionality, no editorial inventories or snapshots. CI hashes generated route metadata for media caching; prose, lyrics, and release credits do not invalidate it.
