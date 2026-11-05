# Temple content share cards

The artist selected a full-bleed image, a lower-left caption, orange
`#F7A264` Temple name above the title, and opaque warm/cool Cloud ink.
At 1200×630, the name is 40px and plain titles now grow up to 180px. The artist then
requested an adaptive implementation and a text/background coverage overview.
The decision trail is in `website/app/temple/docs/collaboration.md`.

## Rendering and capacity

`content/preparation/temple-share-image.ts` owns measurement and composition.
Fit the full title between the 200px upper caption boundary and 55px bottom
margin, with 64px left and 76px right insets. Keep the name at 40px and a
44px visible gap between the wordmark and title glyphs, matching the accepted
Watch card. Apply it to every lower-left caption card, including photographs,
pattern backgrounds and pictureless posts, independently of title size or line
count. Fit both the visible stack and the title's line box within the caption
area. Plain titles grow up to 180px and shrink when necessary, down to 48px. Long unbroken
words wrap by character. Escape markup and retain punctuation. If the full title
still cannot fit at 48px, trim its end and append literal `...`, measuring the
dots within the same caption area. Prefer a complete final word and never split
a Unicode grapheme. Keep the original title and share metadata intact; only the
card text is shortened. An authored `shareTitle` remains an optional alternative.

Character count is not a capacity rule: glyph widths and word boundaries matter.
The current coverage examples include 15/43/72 characters at 180/125/95px,
133 at 66px and 223 at 52px; the 287-character specimen trims with `...` at 48px.

Shade with one straight gradient ending at 80% black. Its start is solved from
both text height and sampled background brightness under each text role, using
3:1 for the orange name and 4.5:1 for the dimmest title ink. A positive start
leaves the upper image unshaded. A negative start extends the same ramp above
the image, producing some darkening across the full image. Thus even a short
title on white may need full-image shading. Samples use an 8px grid; this is a
conservative contrast aid, not a guarantee for every pixel or every platform crop.

## Publication and runtime

`prepareTempleShareImages()` uses CMX's node reducer, including declared prop
slots, to find `TempleRecordings` and `TemplePosts`. Attach `shareImage` and
`previewImage` to their existing post props within the same Publication. Deduplicate
identical title/cover inputs across section documents. Publish immutable, byte-hashed JPEGs
through the existing media storage, finishing storage before returning the URL.
Do not create another sharing index. The post-render asset-generation gap and
existing temporary media exception are documented in ADR 0007.

An explicit `shareImage` bypasses share-card generation. Otherwise use the supplied
`cover`, then the Stream default thumbnail for video, or a black ground for pictureless
audio/text. `shareTitle` overrides only the share title, preserving the full
reader-facing title. Cover fetch failures stop preparation. Keep playback posters
independent from generated share cards.

The feed route emits each post's generated share image and share title as server
HTML metadata. The artist requests no Temple-name label in Watch's overview, so
Watch uses a separate `previewImage`, generated with the same card renderer and
`showWordmark: false`, without drawing a second title over it. Reuse background
bytes across both variants. A custom `previewImage` remains intact independently
of a custom `shareImage`. Older Publications without overview cards fall back to
the cover plus native post title rather than showing a branded share card.
The two shared fonts live under `contracts/assets/temple/`, so website-only and
content-only builds both receive the same files.

## Temple, section and poem cards

The photographic card work is accepted at checkpoint `bc5fc04` (implementation
through `ef04008`). For the text cards the artist selected the same caption
layout over random fragment shapes like the page. They subsequently supply the
four practical card titles and two explicit opening lines for each poem card.
Preserve those words, line breaks and emphasis; do not invent descriptions.

`contracts/temple/fragments.ts` owns the page's existing seeded shape generator;
the browser keeps its placement helpers. `temple-share-pattern.ts` composes a
static dark crop with those shapes and soft joins. Seed it from each document
or document/verse identity, so patterns differ while repeated publishing stays
stable. Section and poem cards retain the small orange wordmark above the
large Cloud ink headline, with the shared44px visible gap on practical cards.
Poem cards center the name at the top and center each phrase line in the
whole card, independently of the name. The whole-Temple card uses a captured opener frame
and a date derived from the same authored start/end values as the page.

Poem metadata reuses native `PoemLine` text/face fields in `verseShares.lines`.
`temple-share-type.ts` fits each supplied line separately like the page: Unbounded
copy, Cinzel emphasis, and a quieter spaced address distributed across the width.
Long introductory copy can be smaller than the 48px plain-title lower bound so
its explicit line stays intact. The poem block is centered on the card's315px
midpoint, within symmetric140px top/bottom bounds below its independently
positioned wordmark. All four native fonts and licenses now live under `contracts/assets/temple/`.

`openerShare` contains an imported frame and calendar start/end values. Its image
passes through the existing CMX image loader; `temple-opener-share.ts` adds the
formatted date at publication time. Section metadata omits this parent-only
configuration. The committed PNG is a manual capture of the real opener canvas,
with an early native font transition plus its foreground glimmers. A capture-only
seed keeps TEMPLE in Bricolage while OF and SOUND transition first. The capture
selects a frame with visible escaped particles and lifts that real foreground
slightly for thumbnail viewing. The compositor shifts the artwork32px upward
and puts the date below it at550px, using the dark top-bar date ink `#403d36`
and8px tracking. These measurements implement the artist’s layout feedback for
review. Recapture with a running authored
preview using `node website/app/temple/debug/capture-share-opener.mjs [URL] [PATH]`.
Only the captured asset is needed for content-only publication, not a browser or
website implementation. Its date is never baked into the frame.

Native CMX metadata declares `verseShares` on the complete poem page, mapping
normalized `verse` query values to authored titles and optional custom images.
The existing preparation adapter attaches generated `ogImage` values to this
metadata and to each Temple route. Section entrypoints supply their own OG titles
without inheriting the poem query map. No separate route/share index is created.
Validation checks the nested metadata and media URLs with the Publication.

The server selects a matching verse's OG title/image without changing the page
body. Canonical and `og:url` retain only the normalized, percent-encoded verse
query; unknown values fall back to the whole Temple. Browser fragment and query
arrival behavior remains with the entry implementation.

## Review and checks

Generate the synthetic coverage gallery with:

```bash
node content/preparation/temple-share-overview.ts
```

Optional `--photo NAME PATH` arguments add actual source images for manual review.
The gallery and measured results go to `.generated/temple-share-overview/`.
Automated assertions use synthetic text, backgrounds and CMX documents only.

After a local content build, generate a gallery of the actual prepared text
cards with `node content/preparation/temple-text-card-overview.ts`. It writes ten
cards, their destinations and a contact sheet under
`.generated/temple-share-overview/text-cards/`. This is manual review material,
not an automated test fixture. The inline review is
`/home/agent/.codex/visualizations/2026/11/05/01a1ab72-6377-72d2-b7fb-537a14ef85d8/temple-text-cards.html`.
