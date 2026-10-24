# Content

Pages: `pages/**/*.tsx`. Strip `.tsx`; terminal `index` maps to its directory.
Any `_`-prefixed file/directory is excluded from discovery; imports still work.
Other extensions are supporting files. Duplicate URLs fail the build/publication.
`pages/_404.tsx` supplies the fallback; it has no public route.

Each page exports `title`, `default`, and optional typed `metadata` (`PageMetadata`
from `types.ts`). URLs come only from filenames. Song/release data supplies derived
metadata; explicit metadata overrides it. Share images are attached during preparation.

Publication v2: document keys determine URLs; each page carries `content.metadata`.
`_site`: global navigation/media. `_redirects`: explicit aliases from `redirects.ts`.
The Worker reads v1 publications during rollout; new builds emit only v2.

Reprises with separate lyrics remain separate songs.
