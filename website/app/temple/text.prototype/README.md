# Reading voices / typography exploration

Expansion, local only. The artist rejected both Codrops effects and the headline-only setting at `dc355ec`. They declined supplying a reference and explicitly requested `$explore`: make concrete comparisons instead of turning a reference into a prerequisite. No specimen selected; only the approved opener is public.

`npm run prototype:temple-text`; user access: `sand tunnel 8790`.

- **A · Bricolage:** `http://localhost:8790/temple-of-sound?study=bricolage`
- **B · Newsreader:** `http://localhost:8790/temple-of-sound?study=newsreader`
- **C · Source Sans:** `http://localhost:8790/temple-of-sound?study=source`

## Question and specimens

Explore a reading voice, emphasis and refrain together, before more poem motion. The earlier accepted Bricolage specimen does not authorize display settings throughout. Its observed limitation here is the previous headline-only texture, not a claimed emotional property of the family.

Common fixture: original seven semantic units in order, one responsive column (768px maximum), actual opener/forest context, native document flow, no poem animation. Different typography naturally changes wrapping and document height; this is not a layout or width survey. Initial statement stays larger; the longer address/body gets a reading setting; the refrain has a separate typographic role. These role assignments are proposals.

| Specimen | Reading body                      | Initial statement     | Refrain               |
| -------- | --------------------------------- | --------------------- | --------------------- |
| A        | Bricolage 400, opsz14, 28px / 1.5 | Bricolage 600, opsz48 | Bricolage 450         |
| B        | Newsreader 400, 32px / 1.43       | Bricolage 600         | Newsreader italic 400 |
| C        | Source Sans 3 400, 28px / 1.55    | Unbounded 400         | Unbounded 350         |

Body sizes reduce on phones. Normal proportional spacing; no per-letter splitting, particle coupling, verse timeline, pinning, fake scroll range or wheel interception. First statement starts at document y0.58 viewport and becomes visible at scroll0.14, overlapping the opener's exit. This handoff fixture is not a proposed verse effect.

## Participation

A/B/C links or ←/→ switch near the current passage and update `?study=`. Different document lengths can limit scroll restoration near the bottom. **Lesesatz** scales body/refrain to 85–125%; **Gewicht** changes body weight300–550. Accent/refrain role weights remain fixed. Reset restores100%/400; reload resets adjustments, retains the URL specimen. **Zum Opener** returns to the beginning. H/× hides controls; ↔ restores them. Input fields retain native keyboard controls. Review UI is outside the artist's prose; hidden alternatives are excluded from rendering/accessibility.

## Context / provenance

The actual approved opener retains its 130svh document box and title sequence. After title exit, its stage stays fixed behind the reading area. Local esbuild reads renderer/CSS/fonts from main `3b839491bf4743f05bce54b9f8a00c64de29ad08`; one visibility adaptation observes the actual stage rather than the departed root. No production source edits. Reduced motion freezes ambient particles; reading text is static in all modes. No-JS displays the prose in ordinary flow after the opener.

Source photo: accepted rotate → 1920px → WebP80 preparation, hash prefix `6f60f5b1a39bdac4`. Text: `content/temple-of-sound/draft.tsx`, fallback `content/drafts/temple-of-sound.tsx` on this older branch. No prose changes or new npm dependency.

Existing Bricolage/Unbounded are reused. Two additional reading faces are prototype assets, not publication decisions:

- [Newsreader, Production Type](https://github.com/productiontype/Newsreader): designed for continuous on-screen reading; normal and italic variable files.
- [Source Sans 3, Adobe](https://github.com/adobe-fonts/source-sans): designed for UI environments; humanist sans comparison.
- Files from Google Fonts `ofl/newsreader` and `ofl/sourcesans3`; OFL notices retained beside them. Local serving, no runtime font CDN. SHA256 prefixes: Newsreader `8a08d13f8a6c0d51`, italic `796668611f80b64d`, Source Sans `042fe2cc0b933e32`.

Client bundle is generated at server startup; restart after editing `context.ts` (touch `serve.tsx` for node watch).

## Validation / recovery

Scoped TypeScript, Prettier and browser inspection at1440×960/390×844. All three computed reading faces/weights, original seven units, no horizontal overflow, size/weight controls/reset, passage switching, reduced-motion rendering and real no-JS fallback checked. No CI polling, Worker changes or deployment.

Rejected Codrops implementations/license remain in `dc355ec`; removed from this current specimen. Recovery: `6dfe338` rejected pinned sequence; `4013e89` liked close first sentence; `c1d9879` rejected detached traces; `551612d` parked glyph coupling. [Shared decision record](../docs/collaboration.md).
