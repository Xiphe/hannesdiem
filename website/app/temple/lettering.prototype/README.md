# Temple of Sound — accepted opener prototype

Accepted 2026-10-23: “lass uns das bitte als opener scene festhalten. Prototype akzeptiert”. This is the baseline for the opening scene. Production integration and subsequent poem sections are separate work; preserve the artist’s supplied prose.

Run `npm run prototype:temple`; open `http://localhost:8787/prototype/temple-lettering?mode=layers`. From the artist’s machine: `sand tunnel 8787`. Standalone native browser/canvas study, outside production Worker routes; no new application dependencies.

## Accepted scene

- Live forest photo + uneven radiating glimmers share one text mask. Sun held at viewport centre; particles fade by distance to viewport edges. No global gold wash.
- Original faces: Bricolage → Germania One → Cinzel Decorative Bold → Unbounded. Complete words change in a per-visit shuffled order with uneven timing and occasional overlaps; brief past/future fragments and whole-word flashes interrupt the progression. Reverse scroll/resize preserve that visit’s schedule.
- Alignment: TEMPLE.right = OF.right; OF.left = SOUND.left. Bricolage touches the left/right viewport edges, uses optical pair corrections for shallow ink overlaps and a baseline distance of 89 per 100 cap-height units. Germania has strikethroughs. Cinzel reads `TEMpLe of SOuNd`, with half the visible of–SOuNd gap. No altered font outlines or fixed character slots.
- Scroll range: 0.3 viewport heights (130svh scene). All four faces precede the upward title exit; pinned forest gradually reveals. No zoom or word separation.
- Date: `November 1 – December 20, 2026`, `#343434`, 20–36px top inset plus safe area, isolated 28ms opacity flickers. Exits upward with the title; reverse scroll restores it.
- Edge overlay: `#ff8800`, 11%, fades toward the centre and clips to lettering. Revealed forest stays uncoloured.
- Mouse movement disrupts at most two characters locally, then resolves. Idle glitches last 180–340ms with ~0.95–2.3s intervals and varied targets/strength.
- Heroicons 2.2.0 `16/solid/arrow-down`, 20×26px container, `#343434`, bottom-centre. Fades over the first 36px of scroll (4% of the viewport on smaller screens); returns at the start. No review/tuning controls in the accepted scene.
- Reduced motion freezes ambient particles, removes date/arrow animation and uses crossfades instead of sliced scroll transitions. Inactive tabs suspend rendering.

## Reproduction and references

`assets/forest.webp` is the exact accepted 1920px preview of the artist’s IMG_6257.JPG, stored with Git LFS. No generated-media directory or original upload is required to run this prototype. Retrieve LFS objects after checkout with `git lfs pull` if needed.

Original upstream fonts and licenses live in `fonts/` (OFL; Syncopate Apache 2.0). `typefaces.json` retains all 21 exploration faces; extra source URLs are in `new-font-sources.json`. Heroicons SVG source is unmodified; MIT license: `../../assets/heroicons-LICENSE`.

Earlier references remain available: base URL shows all specimens, `?round=2` the additional options, `?round=3` the artist-requested five-face comparison. `?mode=layers&effect=cuts` retains the alternative treatment. `?mode=glitch` is the rejected fixed-slot swap, not the accepted opener. Static specimen routes retain comparison controls and original layouts.

Rationale: [collaboration](../../../../docs/research/temple-design-collaboration.md), [glitch references](../../../../docs/research/temple-typographic-glitch.md). Original poem and A–L experiments: local archive branch `codex/temple-exploration-archive` at `0b58f9e`.

Validation covers font alignment, mouse/idle resolution, all four faces before exit, reversible scrolling, date exit, scroll-cue fading, absence of controls, fixed overlay, mobile fit, reduced motion and no browser errors. This captures prototype acceptance; it does not approve new artwork or change production traffic.
