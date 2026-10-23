# First verse/refrain — text studies (unapproved)

Question: which existing typefaces, measures, weights and paragraph arrangements should we explore further for the first pair?

`npm run prototype:temple-text` → `http://localhost:8790/temple-of-sound`.
`?variant=all` compares six studies; `?variant=A` … `F` opens one. Arrow keys switch; H hides/restores review controls. `sand tunnel 8790` forwards the preview.

Branch: `codex/temple-first-text-studies`. Local-only server; no Worker route, CMX publication entry or production build entry. No selection or publication approval. The live opener remains unchanged.

All studies read the first pair directly from `content/drafts/temple-of-sound.tsx`; preserve words, punctuation, explicit line breaks and order. Shared background `#030503`, text `#e4e0d4`. This pass explores static text images; reading motion, imagery, interaction and audio remain separate decisions. Six studies explicitly agreed with the artist; no whole-scene proposals.

| Study | Native font                   | Composition                                                   |
| ----- | ----------------------------- | ------------------------------------------------------------- |
| A     | Fraunces 620                  | Short left-aligned measure; SOFT 65, WONK 1, opsz 70          |
| B     | Bricolage Grotesque 750       | Large close-set text mass, native kerning                     |
| C     | Kalam Bold 700                | Hand-drawn letterforms, offset paragraphs, shared slight tilt |
| D     | Barlow Condensed Bold 700     | Narrow setting, successive paragraph indents                  |
| E     | Unbounded 400                 | Extended letters, long lines and alternating alignment        |
| F     | Cormorant Garamond Italic 650 | Large centred italic, shared centre                           |

Native fonts only; no glyph modifications or synthetic italics. OFL licenses accompany each added font. Bricolage/Unbounded use existing website assets. Barlow is restored byte-for-byte from `76e9ca7`.

New font sources: [Fraunces](https://github.com/google/fonts/tree/main/ofl/fraunces), [Kalam](https://github.com/google/fonts/tree/main/ofl/kalam), [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond). Downloads from their raw upstream files; licenses retained under `fonts/`.
