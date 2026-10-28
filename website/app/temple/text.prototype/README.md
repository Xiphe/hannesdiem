# First pair / centred refrain workbench

Local exploration: `codex/temple-first-text-studies`. Run `npm run prototype:temple-text`; user access `sand tunnel 8790` → [preview](http://localhost:8790/temple-of-sound). No production source changes, CI polling or deployment; only opener approved for publication.

## Current artist direction

Original supplied wording/order in `studies.tsx`; approved duplicate-“to” correction and latest “you kindred souls” wording. Display casing differs from semantic text by request. No invented prose.

- Black ground, including light system preference. No flat pigment wash or old orange overlay. New textured warm edge mist is composited into the shared forest before masks: visible inside opener, first heading and refrain only. `atmosphere.ts`: cached192px noise sprite, moving edge clouds in a640px field; hue0–60° (red/orange/yellow), intensity0–100%, defaults22°/45%. Zero intensity restores the original material; controls also refresh frozen reduced-motion material.
- Unbounded350 copy. **First statement is a single-face Cinzel mask again**, with local pointer/idle glyph glitches, no whole-face switching. Other bold passages remain opaque ordinary text, no canvas/glitch; secondary highlights can switch to Unbounded.
- First statement starts at document y100svh. After the original four-face sequence, opener exits at1px per scroll pixel; headline enters at the same rate. No visibility gate. Exit begins after0.1575 viewport heights; local adapter replaces the old ~7× exit speed.
- Refrain: mixed-case Cinzel → uppercase Bricolage → uppercase Unbounded. Follows text with24–40px margins. Stage fits tallest sentence +32px; holds at viewport centre for52svh, then leaves naturally.
- First transition starts at lock; last finishes at release. Working ranges0–0.5 and0.5–1. Random independent word schedules start one word immediately and finish the last at progress1, with no leading/trailing dead zone. Additional ragged bands and past/future frames while scrolling; reversible. No forced character/semantic word alignment.
- Copy colour: per-grapheme inline spans preserve wording/spacing; correlated irregular warm/cool patches drift slowly around the selected base. Default40% gives RGB offsets of roughly±6/∓1/∓8; strength0 disables variation. Excludes first heading and bold accents. Reduced motion freezes the field. `copy-colour.ts` changes only colour, throttled10Hz while visible.
- Bricolage: tracking−0.085em, leading0.62, fitted to actual glyph ink so the longest line touches viewport edges. Two rows in landscape; four in portrait. Ink-centred independently of advance boxes. Other faces retain their own settings. Spacing/fit/timing remain experiments.

## Shared material / implementation

Pinned approved opener: main `3b839491bf4743f05bce54b9f8a00c64de29ad08`. Local esbuild adapter changes black-ground/exit behaviour and observes the actual stage after its root leaves view. Extracted unchanged ragged-band and glyph-disturbance functions in `typography.ts` are shared by opener and refrain. Prototype adapter against pinned source, not a production refactor.

Capture the opener's combined forest/glimmers before its veil; refrain samples that exact live frame at viewport coordinates. No duplicated particle system. IMG_6257.JPG → rotate/1920px/WebP80, hash prefix `6f60f5b1a39bdac4`. Only four original font files; no new dependencies.

DOM supplies native word/glyph positions; cached masks supply animation. CSS sticky supplies the bounded hold. No wheel interception, auto advancement or scroll-handler seeking. No-JS shows all sentences in normal flow; semantic wording remains accessible after enhancement. Reduced motion freezes ambient particles, uses crossfades and disables idle bands. RAF stops on inactive tabs/page disposal.

Controls: secondary Cinzel/Unbounded, mist hue/intensity, copy base colour/temperature strength, explicit opener/refrain seeks. H/× hides; ↔ restores. No persistence. Bundle generated at startup: touch `serve.tsx` after client edits for node watch.

## Validation / recovery

Scoped TypeScript/Prettier; inspected1440×960,390×844 and844×390. Measured matching opener/headline displacement; centre hold/release; stable document height through swaps; no horizontal overflow; opaque secondary highlights and restored single-face heading mask. Checked headline pointer disturbance/resolution, mist on/off/colour controls under reduced motion, stronger measured edge ink, per-letter variation/disable and unchanged wrapping. Forward/reverse progression, normal/reduced motion, black under light preference and resize checked. No permanent visual tests.

Recovery: `77be98f` before mist/copy variation and restored heading; `b37c3af` before current sync/opaque-text/overlap corrections; `089b17d` moving refrain; `62ca132` rejected new-font survey; `dc355ec` rejected Codrops effects. [Artist decision record](../docs/collaboration.md).
