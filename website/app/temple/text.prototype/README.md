# First-pair typography / moving refrain

Local exploration, `codex/temple-first-text-studies`. Only the opener is approved for publication. No production source/Worker changes or deployment.

Run `npm run prototype:temple-text`; user access: `sand tunnel 8790` → [preview](http://localhost:8790/temple-of-sound).

## Artist direction / scope

The artist rejected the reading-face survey at `62ca132`, forbade additional fonts and supplied new wording with explicit emphasis/face assignments. Grilling Q1–8 confirmed the treatment; their subsequent correction supersedes the proposed sticky refrain: **the refrain moves with the document and changes sentences during that movement**. This implements that experiment, not acceptance of a finished scene.

- Unbounded 350 copy; first statement in Cinzel Decorative Bold.
- Marked emphasis: Cinzel by default; switch to Unbounded for comparison. Position/size/colour remain exploratory.
- Cinzel uses the live forest/glimmers as a mask, with pointer/idle disturbances and brief alternate-face glyph fragments; no whole-passage face swapping.
- Three refrain sentences replace each other in a single normally scrolling 100svh composition. Fixed associations: playful → Cinzel; breathing → Bricolage; faithful → Unbounded. Each has independent native setting/fit. Scroll transitions overlap whole sentences and ragged fragments; no fixed character slots or word mapping.
- New prose is recorded verbatim in `studies.tsx`; the explicitly approved correction removes the duplicate “to”. No prose invented. Existing draft elsewhere is not rewritten by this local experiment.

## Mechanics / shared effect

The actual accepted opener is pinned to main `3b839491bf4743f05bce54b9f8a00c64de29ad08`; original fonts, title shaping, sequence, theme and forest preparation remain. Server's esbuild adapter observes the actual stage after its root leaves the viewport. It extracts the opener's **unchanged** ragged-band and glyph-disturbance algorithms into shared `typography.ts` calls. This is a prototype adapter against a pinned source, not a production refactor. Opener and poem therefore use the same disturbance primitives, not a newly approximated CSS glitch.

The opener captures its combined forest/glimmers canvas before its opaque veil. All poem masks sample that same live frame at their actual viewport coordinates. No duplicated particle system or unrelated photograph crop. Source photo: IMG_6257.JPG → rotate/1920px/WebP80, hash prefix `6f60f5b1a39bdac4`.

Native DOM typography determines wrapping and glyph positions. Cached masks preserve natural proportions/spacing. Refrain position is `(viewportHeight - stage.top) / (viewportHeight + stage.height)`; working transition ranges .38–.46 and .54–.62, reversible. Stage is `position: relative`; there is no text pinning, wheel interception, fake spacer, automatic advancement or scroll-handler seeking. Sentence fitting caps ink layout height at 50% viewport so the entire sentence remains visible while its containing block moves.

Immediate opener handoff retained: first statement document top0.58 viewport, visibility at scroll0.14. Only opener stage stays behind the document. Foreground contrast and spacing are working settings, not approved scene decisions.

## Controls / fallback

- Cinzel / Unbounded changes the three secondary emphasis passages; initial statement and refrain associations remain fixed.
- Tönung, pigment, copy colour, background veil: live contrast exploration; theme-specific initial pigment (cream42% dark / dark green70% light), veil84%. No saved preferences.
- Zum Opener / Zum Refrain seek explicitly; H/× hides controls; ↔ restores them. All UI is outside artist prose.
- No-JS: original text and all three refrain sentences in ordinary flow. Canvas hidden until enhanced; semantic text remains present once enhanced.
- Reduced motion: frozen ambient frame, simple crossfades rather than bands, no idle disturbance; pointer response is weaker/shorter. RAF stops with inactive tabs or page disposal.

No new dependencies. Only four original font files; rejected Newsreader/Source Sans assets removed (recoverable at `62ca132`). Browser bundle is generated at startup; touch `serve.tsx` after client edits for node watch.

## Validation / recovery

Scoped TypeScript/Prettier; browser desktop1440×960 and phone390×844, dark/light, all three states forward/backward, original new wording/order, accent switch and contrast controls, no overflow. Refrain moves100px after100px scroll; document height constant through transition. Reduced-motion canvas pixel checks confirm pointer disturbance changes then returns exactly to baseline. Actual no-JS context checked. No permanent visual tests or CI polling.

Recovery: `62ca132` rejected reading-face survey; `dc355ec` rejected Codrops effects; `6dfe338` rejected pinned verse timeline; `4013e89` liked first-sentence close view. [Decision record](../docs/collaboration.md).
