# First words after the opener — contextual workbench

`npm run prototype:temple-text` → `http://localhost:8790/temple-of-sound`.
User access: `sand tunnel 8790`. Local only, on `codex/temple-first-text-studies`.

The artist rejected all three isolated trace studies (`c1d9879`): too little impact; exploration must happen directly after the opener, in the page context. Preserve the direction that past words should remain felt as traces, but do not carry over any rejected mechanism.

## Scope of this workbench

Start with the actual opener. Its title exits over the approved 0.3 viewport of scroll. The same forest/glimmer canvas then stays pinned as the **original first sentence** enters: “I’m in love with humanity.” This is an agent-bounded next fragment for exploration, not a finished first verse/refrain or an approved layout. The rest of the poem is absent from the workbench; its source is unchanged.

Adjust consequential variables directly in context:

- **Von unten aufsteigen:** sentence travels upward from below the viewport.
- **Aus nächster Nähe:** initially oversized/cropped text resolves into readable size.
- **Größe:** responsive base size, 48–160 at 1440px (initially 96).
- **Einsatz:** onset relative to the opener, 0.18–0.6 viewport (initially 0.30).
- **Scrollposition:** scrub the complete opener + first-word transition; native scrolling works too.
- **Zum Anfang:** replay from the opening; H/× hides controls, ↔ restores them.

Text direction/typeface: original wording, Bricolage 600. Size, 0.23-viewport entrance span, cream text/shadow, vertical position and motion are open fixtures. The harness is 200svh, not a proposed duration for the whole pair. Input controls progress; no automatic poem playback or ambient text effect. Reduced motion uses a direct reveal. Appearance and portrait behaviour come from the accepted opener. Controls are review UI, not artist prose.

## Actual opener, no production edits

`serve.tsx` bundles `scene.ts` and `forest.ts` from pinned main revision `3b839491bf4743f05bce54b9f8a00c64de29ad08` through esbuild. CSS/fonts come from the same revision. This keeps the approved portrait/theme updates without merging unrelated CMS changes into the experimental branch. `Opening` renders the unchanged real markup; the local entry mounts its canvas renderer. `context-props.ts` uses the published title/dates/light source and a local image URL.

The source photo is prepared in memory with the existing media pipeline settings (rotate, 1920px, WebP quality 80); SHA-256 starts `6f60f5b1a39bdac4`, matching the accepted media variant. No CDN dependency or new package. Scene code and published CMX entry stay untouched. The only scene extension is local: retain its sticky stage after the title exit for the new fragment.

Source words are read from `content/temple-of-sound/draft.tsx`, or the older `content/drafts/temple-of-sound.tsx` on this branch. Server/watch starts from the package script; restart it after editing the bundled client modules.

## Validation / boundary

Browser-checked opener readiness, first-word reveal, both movement controls, size/onset changes, replay/hidden controls, mobile bounds and light/dark/reduced motion. Image hash matches the accepted variant. Scoped TypeScript and formatting pass. No permanent visual tests, CI polling or deployment. Public site remains opener only.

## Recovery / next review

- `c1d9879`: rejected isolated trace comparison (upward compression, outlines, margins).
- `551612d`: parked glyph-coupling probe; coupling was not the assignment.
- `0b97988`: artist selected Bricolage for this first pair.
- `d621633`: unnecessary width survey; retain normal responsive capped reading width.

Review from the opener: how should the first words arrive with sufficient presence? No entrance selected and no finished-scene approval. [Shared context](../docs/collaboration.md).
