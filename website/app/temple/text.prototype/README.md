# First pair / centred refrain workbench

Local exploration: `codex/temple-first-text-studies`. Run `npm run prototype:temple-text`; user access `sand tunnel 8790` → [preview](http://localhost:8790/temple-of-sound). No production source changes, CI polling or deployment; only opener approved for publication.

## Current artist direction

Original supplied wording/order in `studies.tsx`; approved duplicate-“to” correction and latest “you kindred souls” wording. Display casing differs from semantic text by request. No invented prose.

- Black ground, including light system preference. No flat pigment wash or old orange overlay. New textured warm multicolour mist is composited into the shared forest before masks: visible inside opener, first heading and refrain only. `atmosphere.ts`: domain-warped cloud banks/billows/filaments in a cached384px field (height≤512), refreshed15Hz. Three independently controlled warm hues mix spatially (screenshot defaults4°/33°/24°), intensity100%. Coverage extends through the interior with reduced density at the sun. Opacity is bounded≤36% even at full intensity; the image remains present. Zero intensity restores original material; controls also refresh frozen reduced-motion material.
- Added drifting warm-white flecks and broken light patches in the outer fog, clipped through the same masks. Independent Lichtpunkte0–100% control, experimental default65%; no change to the central sun or exterior black.
- Unbounded350 copy. **First statement is a single-face Cinzel mask again**, with local pointer/idle glyph glitches, no whole-face switching. Other bold passages remain opaque ordinary text, no canvas/glitch; secondary highlights can switch to Unbounded.
- First statement starts at document y100svh. After the original four-face sequence, opener exits at1px per scroll pixel; headline enters at the same rate. No visibility gate. Exit begins after0.1575 viewport heights; local adapter replaces the old ~7× exit speed.
- Refrain: mixed-case Cinzel → uppercase Bricolage → uppercase Unbounded. Follows text with24–40px margins. Stage fits tallest sentence +32px; holds at viewport centre for52svh, then leaves naturally.
- First transition starts at lock; last finishes at release. Working ranges0–0.5 and0.5–1. Random independent word schedules start one word immediately and finish the last at progress1, with no leading/trailing dead zone. Additional ragged bands and past/future frames while scrolling; reversible. No forced character/semantic word alignment.
- Copy colour: screenshot defaults50% variance/1.2× speed, base#d2d0c8. **Buchstaben** remains the default, with per-grapheme warm/cool patches. **Farbwolken** is an unselected comparison: an offscreen192px-wide 2D Canvas mixes warm/cool/neutral clouds; a PNG snapshot clips to native paragraph text via CSS, aligned in document coordinates across lines/paragraphs. DOM remains selectable/copyable; opaque accents retain their colour. Same variance/speed/base controls for both modes; zero variance restores base, zero speed freezes phase. Reduced motion freezes motion. Texture refresh10Hz; this is a local comparison, not a chosen production renderer.
- `defaults.ts` preserves the artist's screenshot settings (working values, not scene approval); client state/control defaults share that source.
- Bricolage: tracking−0.085em, leading0.62, fitted to actual glyph ink so the longest line touches viewport edges. Two rows in landscape; four in portrait. Ink-centred independently of advance boxes. Other faces retain their own settings. Spacing/fit/timing remain experiments.

## Shared material / implementation

Pinned approved opener: main `3b839491bf4743f05bce54b9f8a00c64de29ad08`. Local esbuild adapter changes black-ground/exit behaviour and observes the actual stage after its root leaves view. Extracted unchanged ragged-band and glyph-disturbance functions in `typography.ts` are shared by opener and refrain. Prototype adapter against pinned source, not a production refactor.

Capture the opener's combined forest/glimmers before its veil; refrain samples that exact live frame at viewport coordinates. No duplicated particle system. IMG_6257.JPG → rotate/1920px/WebP80, hash prefix `6f60f5b1a39bdac4`. Only four original font files; no new dependencies.

DOM supplies native word/glyph positions; cached masks supply animation. CSS sticky supplies the bounded hold. No wheel interception, auto advancement or scroll-handler seeking. No-JS shows all sentences in normal flow; semantic wording remains accessible after enhancement. Reduced motion freezes ambient particles, uses crossfades and disables idle bands. RAF stops on inactive tabs/page disposal.

Controls: secondary Cinzel/Unbounded, mist hue/intensity, light-fleck strength, copy colour mode/base/variance/speed, explicit opener/refrain seeks. H/× hides; ↔ restores. No persistence. Bundle generated at startup: touch `serve.tsx` after client edits for node watch.

## Validation / recovery

Scoped TypeScript/Prettier; inspected1440×960,390×844 and844×390. Measured matching opener/headline displacement; centre hold/release; stable document height through swaps; no horizontal overflow; opaque secondary highlights and restored single-face heading mask. Checked headline pointer disturbance/resolution, mist on/off/colour controls under reduced motion, stronger measured edge ink, per-letter variance/disable, speed0 freeze/4× movement, independent palette controls and unchanged wrapping. New checks: exact screenshot defaults after reload, light-fleck on/off comparison, both copy modes on desktop/phone, cloud clipping, selectable/copyable original text and mode restoration. Forward/reverse progression, normal/reduced motion, black under light preference and resize checked. No permanent visual tests.

Recovery: `7d140d2` before screenshot settings/light flecks/2D copy field; `11aa42f` narrow single-colour mist / slower limited text variation; `77be98f` before mist/copy variation and restored heading; `b37c3af` before current sync/opaque-text/overlap corrections; `089b17d` moving refrain; `62ca132` rejected new-font survey; `dc355ec` rejected Codrops effects. [Artist decision record](../docs/collaboration.md).
