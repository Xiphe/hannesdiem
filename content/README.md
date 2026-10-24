# Content

Pages: `pages/**/*.tsx`. Strip `.tsx`; terminal `index` maps to its directory.
Any `_`-prefixed file/directory is excluded from discovery; imports still work.
Other extensions are supporting files. Duplicate URLs fail the build/publication.
`pages/_404.tsx` supplies the fallback; it has no public route.

Each page exports `title`, `default`, and optional typed `metadata` (`PageMetadata`
from `types.ts`). URLs come only from filenames. Song/release entries call helpers
from `metadata.ts` during CMX execution; explicit metadata overrides defaults.
OG titles default to the page title; music helpers supply kind/type/artist defaults.
Shared description: `site.ts`. Authored pages contain no legacy CMS IDs/timestamps.
Legacy CMS share-image ID redirects are removed. CMX host state provides hashes,
not per-document modification timestamps; new pages omit sitemap `lastmod`.

Publication v2: document keys determine URLs; each page carries `content.metadata`.
`_site`: global navigation/media. `_redirects`: explicit aliases from `redirects.ts`.
The Worker reads v1 publications during rollout; new builds emit only v2.

`preparation/prepare.ts`: discover → CMX Bundle → CMX Documents → publication file.
Globals are ordinary CMX entries: `site.ts`, `redirects.ts`. Complete rendering and
publication validation precede output. No page/route/OG intermediate JSON files.

Temporary exception: `preparation/share-images.ts` consumes evaluated metadata and
attaches generated image URLs before output. It remains outside CMX; moving its
inputs before CMX is deferred. Imported photos use the existing CMX Assets loader.

Navigation sections with `collection: 'release'` query the current Publication in
the app; the content build does not enumerate release links.

Reprises with separate lyrics remain separate songs.
