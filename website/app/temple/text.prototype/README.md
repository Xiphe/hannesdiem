# First verse/refrain after the opener — contextual exploration

`npm run prototype:temple-text` → `http://localhost:8790/temple-of-sound`.
User access: `sand tunnel 8790`. Branch `codex/temple-first-text-studies`; local only.

Artist feedback on `4013e89`: likes the shown close-view state (size 160, onset 0.18), asks for a snappier entrance and the following lines. Preserve this local preference; no complete scene, trace mechanism or publication is approved.

## Current sequence

The actual accepted opener leads into all **seven fixed sense units** of the original first verse/refrain pair. Source wording/order is unchanged. Sentences may wrap on smaller screens; wrapping does not create new units.

- Defaults: **Aus nächster Nähe**, size **160**, onset **0.18 viewport**.
- Entrance: **0.12 viewport**, cubic ease-out; previously 0.23 with a slow initial smoothstep.
- Spacing: **0.22 viewport** for short units, up to 1.65× for long units. Full traversal including opener ~1.95 viewports; no compulsory dwell or automatic text advance.
- Earlier text recedes smaller/upward into depth as faint traces. This is a working accumulation hypothesis, not an approved trace design.
- Short phrases retain the chosen size. Long units shrink only as needed to fit 76% of stage height at rest, including landscape phones. Entry clipping at enlarged scale is intentional.
- Reduced motion changes poses directly; scroll backwards reverses the full sequence.

## Controls

**Größe**, **Einsatz**, **Abstand**, **Scrollposition** manipulate the sequence in place. Counter shows active unit / seven. The earlier rising entrance remains available for comparison. **Zum Anfang** resets to the opener; H/× hides controls, ↔ restores them. Review controls are separate from artist prose.

## Actual opener, no production edits

The local server bundles `scene.ts`/`forest.ts`, CSS and fonts from pinned main `3b839491bf4743f05bce54b9f8a00c64de29ad08` via esbuild. This retains accepted portrait/theme behaviour without merging unrelated CMS work. `Opening` renders its unchanged real markup. `context-props.ts` uses the published title/dates/light source and a local image URL. The sticky scene is extended locally beyond the title exit to host the poem.

Source photo preparation matches the accepted 1920px WebP (rotate, quality 80, SHA-256 prefix `6f60f5b1a39bdac4`). No CDN dependency, new package, particle/text coupling, audio, Worker/publication entry or deployment. Public site remains opener-only.

Words are read from `content/temple-of-sound/draft.tsx`, falling back to `content/drafts/temple-of-sound.tsx` on this older branch. Restart the server after editing bundled client modules.

## Validation / recovery

Scoped TypeScript and formatting pass. Browser-checked every settled unit on desktop 1440×960, phone 390×844 and landscape 844×390, source order, original text, liked defaults, trace presence and complete reverse reset. No permanent visual tests or CI polling.

- `4013e89`: first-sentence contextual workbench; liked close-view configuration.
- `c1d9879`: all isolated trace variants rejected for insufficient impact; do not carry their mechanisms forward as selected.
- `551612d`: glyph coupling parked; it was not the assignment.
- `0b97988`: Bricolage accepted for this first pair.

[Shared intention, scoped feedback and next review](../docs/collaboration.md).
