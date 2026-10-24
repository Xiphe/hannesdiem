# Derive content routes from filenames

`content/pages/**/*.tsx` determines URLs; terminal `index` maps to its directory.
Underscore-prefixed files/directories are supporting code, excluded from discovery;
`_404.tsx` is compiled only as the fallback. Duplicate URLs are rejected.

Page metadata lives in each page's typed `metadata` export. Publication v2 stores it
with the page; `_site` contains global data, `_redirects` contains legacy aliases.
The Worker derives its route index from published document keys, so new pages need
no website deployment. Existing Remix request handlers remain; no routing dependency.

Accept v1 publications until content moves to v2; website deployment precedes content publication.
