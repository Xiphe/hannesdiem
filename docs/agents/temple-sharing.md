# Temple content share cards

The artist selected a full-bleed image, a lower-left caption, orange
`#F7A264` Temple name above the title, and opaque warm/cool Cloud ink.
At 1200×630, the name is 40px and titles start at 90px. The artist then
requested an adaptive implementation and a text/background coverage overview.
The decision trail is in `website/app/temple/docs/collaboration.md`.

## Rendering and capacity

`content/preparation/temple-share-image.ts` owns measurement and composition.
Fit the full title between the 200px upper caption boundary and 55px bottom
margin, with 64px left and 76px right insets. Keep the name at 40px and a
16px gap. Titles shrink only when necessary, down to 48px. Long unbroken
words wrap by character. Escape markup, retain punctuation and preserve the
complete supplied text; never add an ellipsis or invent replacement wording.
If it still cannot fit, stop preparation and request an authored `shareTitle`.

Character count is not a capacity rule: glyph widths and word boundaries matter.
The coverage examples include 15/43/72 characters at 90px, 133 at 69px and
223 at 51px; the 287-character specimen exceeds the readable lower bound.

Shade with one straight gradient ending at 80% black. Its start is solved from
both text height and sampled background brightness under each text role, using
3:1 for the orange name and 4.5:1 for the dimmest title ink. A positive start
leaves the upper image unshaded. A negative start extends the same ramp above
the image, producing some darkening across the full image. Thus even a short
title on white may need full-image shading. Samples use an 8px grid; this is a
conservative contrast aid, not a guarantee for every pixel or every platform crop.

## Publication and runtime

`prepareTempleShareImages()` uses CMX's node reducer, including declared prop
slots, to find `TempleRecordings` and `TemplePosts`. Attach `shareImage` to
their existing post props within the same Publication. Deduplicate identical
title/cover inputs across section documents. Publish immutable, byte-hashed JPEGs
through the existing media storage, finishing storage before returning the URL.
Do not create another sharing index. The post-render asset-generation gap and
existing temporary media exception are documented in ADR 0007.

An explicit `shareImage` bypasses generation. Otherwise use the supplied `cover`,
then the Stream default thumbnail for video, or a black ground for pictureless
audio/text. `shareTitle` overrides only the share title, preserving the full
reader-facing title. Cover fetch failures stop preparation. Keep playback posters
independent from generated share cards.

The feed route emits each post's generated image and share title as server HTML
metadata. Watch uses that same image without drawing a second title over it.
Older Publications without generated cards retain their existing preview fallback.
The two shared fonts live under `contracts/assets/temple/`, so website-only and
content-only builds both receive the same files.

## Review and checks

Generate the synthetic coverage gallery with:

```bash
node content/preparation/temple-share-overview.ts
```

Optional `--photo NAME PATH` arguments add actual source images for manual review.
The gallery and measured results go to `.generated/temple-share-overview/`.
Automated assertions use synthetic text, backgrounds and CMX documents only.

This change implements post cards. Whole-Temple, practical-section and poem-card
artwork remain separate; the artist deferred missing poem titles/descriptions.
Server-rendered metadata for verse query identities is also still outstanding.
Existing entry compatibility already handles public legacy links.
