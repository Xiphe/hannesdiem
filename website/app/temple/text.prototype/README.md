# Two document forms — first verse/refrain in context

`npm run prototype:temple-text`; user access: `sand tunnel 8790`.

- **A · Schriftfläche:** `http://localhost:8790/temple-of-sound?layout=type`
- **B · Text & Bild:** `http://localhost:8790/temple-of-sound?layout=woven`

The artist rejected the verse's pinned scroll model (`6dfe338`): the scrollbar must retain a tangible relationship to the document. They requested exploring both large typographic flow and interwoven text/image composition before choosing a direction. Both studies remain in Expansion.

## The comparison

**A:** a large first statement, smaller direct address and body, then a dense refrain. First words locally rise/unfold as the paragraph enters; paragraphs keep their document positions.

**B:** native grid composition with text reaching across two differently cropped fields of the existing forest photo. One reading path, original source order. Images move up to 16px inside their fixed document boxes; text itself follows native scrolling.

Both use the unchanged seven original units in Bricolage 600, with the first statement capped at 160px on desktop. Sizes, spacing, veil, crop and motion are hypotheses. No artwork labels or invented prose. Earlier text physically remains above; no residual text copies. Whether this fulfils the artist's desired sense of traces remains open.

## Actual document and opener

All verse text has natural content height. No fake scroll range, active-sentence timeline, text pinning, forced dwell, wheel interception, or `scrollTo` in scroll handling. A 120px scroll moves paragraphs exactly 120px; their document coordinates remain stable.

The accepted opener retains its 130svh document box and title sequence. After title exit its stage stays fixed behind the reading area. Local esbuild uses renderer/CSS/fonts from main `3b839491bf4743f05bce54b9f8a00c64de29ad08`; one visibility adaptation observes the actual stage rather than the departed opener root. This keeps ambient glimmers alive without changing title visuals or production code. Reduced motion freezes local word/image movement and ambient particles.

The source photo is prepared with accepted pipeline settings (rotate, 1920px, WebP quality 80; hash prefix `6f60f5b1a39bdac4`). No CDN dependency or new package. Text comes from `content/temple-of-sound/draft.tsx`, or `content/drafts/temple-of-sound.tsx` on this older branch. Source prose/order unchanged.

## Review controls

A/B links or ←/→ switch at the currently read passage and update `?layout=`. URL survives reload; no saved preference. Native scrolling keys otherwise retain their behaviour. **Zum Anfang** returns to the opener. H/× hides controls; ↔ restores them. Hidden alternative is excluded from rendering/accessibility. Review UI is outside artist prose. Reload/restart the local server after bundled client edits.

## Validation / boundary

Scoped TypeScript and Prettier. Browser-checked exact native scroll displacement, stable document coordinates, original text/order, desktop and 390px phone bounds, variant switching (mid-passage top within a pixel), ambient motion after opener exit, shareable URLs, hidden controls and reset. No permanent visual tests, CI polling, Worker/publication changes or deployment. Only the opener remains public.

Recovery: `6dfe338` pinned first-pair sequence; `4013e89` liked first-sentence close view; `c1d9879` rejected isolated traces; `551612d` parked glyph coupling. [Shared context](../docs/collaboration.md).
