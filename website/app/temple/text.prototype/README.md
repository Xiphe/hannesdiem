# First pair — line-length study (parked)

`npm run prototype:temple-text` → `http://localhost:8790/temple-of-sound?variant=all`.
1–3 open individual specimens; arrows switch; H hides/restores review chrome. `sand tunnel 8790`.

Branch `codex/temple-first-text-studies`; standalone port 8790. No Worker route, production entry or CMX publication. Live remains opener-only. Artist text comes directly from `content/drafts/temple-of-sound.tsx`; preserve punctuation, order, explicit breaks and the verse/refrain pair.

## Typeface accepted — 2026-10-24

Artist: “All of these work somehow” and “let's use A for the first section.” A is **Bricolage Grotesque 600**, not a new face. Applied to the draft first pair (`#verse-1`) in the regular Temple stylesheet. This settles its typeface, not its setting, effects or publication.

Other feedback: Germania One “is kind of a meme”; Cinzel Decorative is more suitable for headlines/special effects; Unbounded also works. This is not an instruction to remove them from the accepted opener or a rejection of all future uses. Four-face comparison recoverable at `0b97988`.

## Artist correction / next question

The artist rejected this width study as unnecessary optimization. Use a normal readable maximum width and otherwise adapt to the viewport (`max-width: 65ch` already exists in the regular draft stylesheet). Do not seek a width choice from these specimens.

Next artist-led idea: reveal text line by line, with a glimmer form accompanying each line. Pending clarification: rendered screen lines versus stable authored sentence/sense units. Preserve wording/order; do not assign symbolic shapes or restructure the prose. The viewer below is archived work, not the active design question.

## Parked question

How much of a sentence should share one line? This is the first bounded part of the agreed setting exploration. Three widths, same left edge and all other type parameters fixed. No hierarchy, emphasis, motion or scene proposals bundled into the comparison.

| Specimen   | Width at the 1280px comparison viewport | Prospective question                                               |
| ---------- | --------------------------------------- | ------------------------------------------------------------------ |
| 1 / Short  | 44vw = 563.2px                          | Do frequent wraps support the direct address or fragment thoughts? |
| 2 / Medium | 64vw = 819.2px                          | How do longer thoughts and the short refrain statements relate?    |
| 3 / Wide   | 82vw = 1049.6px; previous A's measure   | Does the longer line support the opening or lose tension?          |

These widths are unapproved probes; the middle one is not a recommendation. Same Bricolage 600, `opsz 48`, `wdth 100`, font-size adjustment 0.52, size, physical line/paragraph spacing, left edge at 9vw, `#e4e0d4` ink and `#030503` background. Original font binary and OFL already in `website/app/assets/temple/`. No new font files or dependencies.

Only native wrapping changes. On narrow screens columns stop shrinking at 340px or 82vw, whichever fits; differences can disappear on phones. The overview uses the same 1280px viewport for each specimen. Explicit artist breaks remain in every size. This neutral setting is a comparison fixture, not approved scene composition.

## Sequence / boundary

1. **Type character accepted:** Bricolage for the first verse/refrain pair.
2. **Setting resolved pragmatically:** responsive, readable maximum width; no width survey.
3. **Next exploration:** line-by-line text and glimmer formation together, following the artist's direction.

Proceed proactively within the authorized exploration. The artist makes the expressive decisions; no complete scene or poem publication follows from this step.

## Recovery

- `a43d68a`: six withdrawn font/layout bundles; insufficient grounding.
- `dc20cdc`: three material tests, parked and unjudged; question changed without agreement.
- `e44f3fe`: superseded new-font survey; no verdict on individual new faces.
- `0b97988`: existing four-face comparison; artist selected A for the first section.
- Only the accepted opener is published.
