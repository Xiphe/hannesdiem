# First pair — accumulation and pace (Expansion)

`npm run prototype:temple-text` → `http://localhost:8790/temple-of-sound?variant=A`.
User access: `sand tunnel 8790`.

Question: can earlier sentences remain felt as traces without consuming excessive reading space or making progression drag? Artist: “spuren sind wichtiger als lesbarkeit”; avoid a drawn-out, boring experience. No mechanism has been selected.

## Comparison

- **A · Aufrücken:** earlier sentences rise into a compressed stack above the current sentence.
- **B · Überdruck:** earlier sentences stay as enlarged, overlapping outlines near the reading position.
- **C · Randspuren:** earlier sentences move sideways; partially clipped text remains at viewport margins.

All compare the same unchanged first verse/refrain pair in Bricolage Grotesque 600. The source paragraph/`br` units supply seven fixed sentences/sense units; mobile wrapping does not create new units. Source: `content/temple-of-sound/draft.tsx`, with `content/drafts/temple-of-sound.tsx` fallback on this older branch. No invented artist prose.

Scroll selects a unit. Completed units leave traces; future units remain hidden. Short CSS transitions finish after input stops; time never advances the poem. Reverse scroll reverses the sequence. Neutral responsive light/dark background, central reading position, 300ms movement / 220ms opacity are isolation fixtures, not scene decisions. No forest, particles, audio or automatic playback.

## Review controls

- Links A/B/C and ←/→ cycle `?variant=` without losing the current unit. Variant URLs work on reload.
- “Position” jumps directly between units for comparison.
- “Scrollweg” adjusts total traversal between 0.6 and 3 viewport heights (initially 1.2); it preserves the current unit.
- H or × hides controls; ↔ restores them. Inputs keep their native arrow keys.

Phone rotation preserves the active unit. Reduced motion disables transitions. No ambient animation loop. Without JS the complete first pair remains readable in source order. Review controls are separate from artist prose; they are not a proposed part of the published artwork.

## Boundary / validation

Standalone port 8790 on `codex/temple-first-text-studies`; no Worker route, publication entry, new dependency or deployment. Public site still contains only the accepted opener. Bricolage is the accepted first-pair face; trace behaviours, pacing and composition remain unapproved.

Browser-checked three variants at first/long/final units, forwards/backwards, current-unit preservation during switches and scroll-distance changes, phone/rotation bounds, light/dark, reduced motion, shareable URLs and hidden controls. Scoped TypeScript, JS syntax, Prettier. No permanent tests or CI polling for throwaway visuals.

## Recovery

- `551612d`: parked glyph-coupling probe. The artist clarified that coupling text to glimmers was not the assignment; it is not a premise for this comparison.
- `0b97988`: four opener faces; artist selected Bricolage for the first pair.
- `d621633`: width survey rejected as unnecessary; use normal responsive capped reading width.
- `a43d68a`: withdrawn font/layout bundles; insufficient grounding.
- `dc20cdc`: material studies parked unjudged after an unframed scope change.

Current intention, acceptance boundaries and next review: [collaboration](../docs/collaboration.md).
