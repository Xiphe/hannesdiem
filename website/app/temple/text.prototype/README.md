# First pair — fixed sense units + glimmer coupling (exploring)

`npm run prototype:temple-text` → `http://localhost:8790/temple-of-sound`.
`sand tunnel 8790`. Scroll / touch to advance; ←/→ or buttons move one unit. H hides/restores review controls. “Buchstabenform” toggles between glyph-bound particles and the same free field without changing the text position.

Branch `codex/temple-first-text-studies`; standalone port 8790. No Worker route, publication entry, new dependency, audio or deployment. Only the opener is published.

## Accepted constraints

- Typeface: Bricolage Grotesque 600 for the first verse/refrain pair; artist selected A from `0b97988`.
- Artist rejected width tuning (`d621633`): normal responsive reading width, capped on large screens. Working cap: 65ch / 56rem with 1.5rem minimum side padding; not an artistic layout verdict.
- “Zeile” means **a fixed sentence/sense unit**, not a rendered screen line. A unit may wrap across several lines on a phone.
- Preserve supplied words, punctuation and order. The seven existing paragraph/`br` units are read directly from the unchanged draft. No new editorial splits. Source: `content/temple-of-sound/draft.tsx`, with the pre-colocation `content/drafts/temple-of-sound.tsx` path on this older experimental branch.

## One coupling hypothesis, not a selected form language

The artist proposed revealing units individually, with a glimmer formation accompanying each. This first probe derives a mechanism from the accepted opener's light/letter relationship: **particles gather just outside the active words' glyph contours**, then travel to the next unit's contours. The free field is a comparison baseline, not a second scene.

This is an agent-proposed hypothesis. The artist has not asked for literal particle lettering or accepted its result. Do not assign metaphors or symbols to individual sentences. Other, independent spatial formations remain open for co-creation.

The working reveal replaces each unit in place; previous units do not accumulate. Scroll position selects the active unit and interpolates particle targets. The next unit has a short 240ms entrance that completes when input stops; at rest one full unit stays readable rather than leaving the visitor between two faded or overlapping sentences. Ambient motion continues at rest; it never advances text. Reversing scroll reverses the sequence. Traversal is 0.7 viewport per unit (4.2 viewports total), an unapproved timing fixture.

One particle field keeps the opener's native forest photo, pinned sun point (53.24% / 54.07%), uneven brightness and viewport-edge fading. A subset gathers at glyph edges while the rest continues drifting. Plain DOM text stays readable; no semantic dependency on the canvas. Working dark veil supports text contrast; colour/composition are not being approved here.

Native wrapping only changes a unit's shape, not its identity. Resize remeasures masks and preserves semantic progress, including browser scroll clamping during rotation. Reduced motion freezes ambient rendering and switches directly between units. Hidden tabs pause RAF; page exit removes listeners/observers. Image failure retains readable text and the particle field. Without JS the full first pair remains readable in source order.

## Validation / boundary

Browser-checked all seven states forward/backward, original text, desktop/phone bounds, free/bound toggle, hidden controls, portrait/landscape identity and frozen reduced-motion canvas. Scoped TypeScript, JS syntax and Prettier checks. No permanent tests for throwaway visuals; no CI wait.

Open: whether glyph formation is useful; reveal style and pacing; independent form language and the purpose of particular forms. This is a coupling fragment, not a finished scene or publication approval.

## Recovery

- `a43d68a`: withdrawn font/layout bundles; insufficient grounding.
- `dc20cdc`: parked material tests; question changed without agreement.
- `e44f3fe`: superseded new-font survey.
- `0b97988`: four existing faces; artist chose A for the first section.
- `d621633`: width study, parked by artist as unnecessary optimization.
- `eeea438`: artist-led direction toward fixed units and glimmer formations.
