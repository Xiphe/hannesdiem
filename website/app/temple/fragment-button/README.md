# Temple fragment action

The artist selected a border assembled from independently generated oblique pieces: some shared edges and uneven gaps, no continuous snake. Pieces drift around the perimeter, with neighbour pressure keeping them distributed. Hover/focus/press aligns each real straight cut at its current location (50ms in,300ms out). Rotation anticipates corners. Click scatters the pieces, then grows them back into the live border after a pause. Individual muted shades vary; light mode uses the same hues at lower lightness. Reduced motion freezes travel and substitutes a short opacity response for the click effect.

Requested integration: “mit origin/main integrieren … einen ‘join me in person’ button nach der ersten strophe”. The optional `PoemPair.action` colocates the supplied label/contact link with the relevant content. `FirstPair` renders this action after its complete verse/refrain/coda; the existing final pause contains the action. The first authored pair links to the artist's supplied `sound@hannesdiem.de`. No other invitation copy or location studies are included.

`FragmentAction` is an ordinary component within the existing Opening island, using its own task signal. The native anchor is present and usable in server-rendered/no-JavaScript output. Each instance gets one random seed unless content supplies `action.seed`; geometry and colour remain stable during layout updates. No editor storage or gallery controls are shipped.

- `fragment-generator.ts`: seeded oblique shapes and mixed-border placement; actual edge/contact geometry.
- `border-flow.ts`: independent perimeter travel with bounded neighbour gaps and smooth corner orientation.
- `border-motion.ts`: one visibility-aware frame loop, precise alignment and click state. Observers/listeners/RAF stop on disposal; no hidden/offscreen catch-up.
- `fragment-burst.ts`: scatter/absence/staggered zoom phases; final geometry is restored exactly.
- `action.tsx` / `style.css`: native anchor, decorative SVG and layout/theme integration.

Synthetic geometry tests are in `website/tests/fragment-*.test.ts`; integration coverage uses the synthetic Temple fixtures, including theme changes, responsive layout, native keyboard navigation, click/zoom recovery and the no-JavaScript link. The preceding atelier remains in the invitation worktree for further experimentation.

Integration validation: full authored build, root TypeScript, repository Prettier,47 synthetic Node checks and28 Temple browser checks pass. Manual page review covers Chromium desktop in both schemes and WebKit mobile. Preview runs on8787 from `codex/temple-fragment-button`, based on origin/main14a777b; no deployment or CI polling.
