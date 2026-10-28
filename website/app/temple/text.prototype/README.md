# First-pair typography / moving refrain

Local exploration, `codex/temple-first-text-studies`. Only the opener is approved for publication. No production source/Worker changes or deployment.

Run `npm run prototype:temple-text`; user access: `sand tunnel 8790` → [preview](http://localhost:8790/temple-of-sound).

## Artist direction / scope

The artist rejected the reading-face survey at `62ca132`, forbade additional fonts and supplied new wording with explicit emphasis/face assignments. Grilling Q1–8 confirmed the treatment. The moving refrain at `089b17d` was a useful step; latest feedback now requests a compact hold at screen centre, stronger uneven word swaps, black ground and static bold accents. This implements those five corrections, not acceptance of a finished scene.

- Unbounded 350 copy; first statement in Cinzel Decorative Bold.
- Marked emphasis: Cinzel by default; switch to Unbounded for comparison. Position/size/colour remain exploratory.
- Bold accents (including the first statement) use the live forest/glimmers mask but **no pointer or idle glitch**. Opener and refrain retain interaction.
- Three refrain sentences keep their fixed face associations: playful → mixed-case Cinzel; breathing → uppercase Bricolage; faithful → uppercase Unbounded. Display casing changes only; semantic prose stays verbatim. Native word positions/wrapping remain. Words leave/arrive independently with per-visit stagger, stronger ragged bands and brief past/future word frames. No forced character or semantic word mapping.
- New prose is recorded verbatim in `studies.tsx`; the explicitly approved correction removes the duplicate “to”. No prose invented. Existing draft elsewhere is not rewritten by this local experiment.

## Mechanics / shared effect

The actual accepted opener is pinned to main `3b839491bf4743f05bce54b9f8a00c64de29ad08`; original fonts, title shaping, sequence and forest preparation remain. The local adapter now keeps its opaque veil black after title exit: forest/glimmers appear only inside lettering. CSS forces dark treatment even under a light system preference. Public opener source/theme unchanged. Server's esbuild adapter observes the actual stage after its root leaves the viewport. It extracts the opener's **unchanged** ragged-band and glyph-disturbance algorithms into shared `typography.ts` calls. This is a prototype adapter against a pinned source, not a production refactor. Opener and poem therefore use the same disturbance primitives, not a newly approximated CSS glitch.

The opener captures its combined forest/glimmers canvas before its opaque veil. All poem masks sample that same live frame at their actual viewport coordinates. No duplicated particle system or unrelated photograph crop. Source photo: IMG_6257.JPG → rotate/1920px/WebP80, hash prefix `6f60f5b1a39bdac4`.

Native DOM typography determines wrapping and glyph positions. Cached glyph/word masks preserve proportional spacing. Refrain stage height is the tallest fitted sentence plus32px, rather than a full empty viewport. It follows the preceding text with a24–40px margin, scrolls into view, holds with CSS sticky at vertical centre for52svh of scroll, then leaves naturally. Section height is stage height plus that hold distance. Working sentence-transition ranges .08–.45 and .53–.93 within the hold, reversible. Only the refrain holds; no wheel interception or automatic advancement.

First statement starts at document y100svh and enters through the bottom with ordinary scrolling. Removed the old y0.58/visibility-at-scroll0.14 switch that caused it to pop into the middle. No opacity/visibility threshold, no artificial entry animation. Only the opener's black canvas stage stays behind the document. Setting, timing and pigment remain open for review.

## Controls / fallback

- Cinzel / Unbounded changes the three secondary emphasis passages; initial statement and refrain associations remain fixed.
- Tönung, pigment and copy colour: live contrast exploration; cream42% starting pigment. Black background fixed; obsolete background control removed. No saved preferences.
- Zum Opener / Zum Refrain seek explicitly; H/× hides controls; ↔ restores them. All UI is outside artist prose.
- No-JS: original text and all three refrain sentences in ordinary flow. Canvas hidden until enhanced; semantic text remains present once enhanced.
- Reduced motion: frozen ambient frame, simple crossfades rather than bands, no idle disturbance; pointer response is weaker/shorter. RAF stops with inactive tabs or page disposal.

No new dependencies. Only four original font files; rejected Newsreader/Source Sans assets removed (recoverable at `62ca132`). Browser bundle is generated at startup; touch `serve.tsx` after client edits for node watch.

## Validation / recovery

Scoped TypeScript/Prettier; browser desktop1440×960 and phone390×844, dark/light, all three states forward/backward, original new wording/order, accent switch and contrast controls, no overflow. Initial statement moves exactly with scroll and is never visibility-gated. Stage centre stays at viewport centre through its hold, then moves out; document height constant across all forward/reverse states. Reduced-motion pixel checks show bold masks unchanged through hover/idle. Black ground also checked with light system preference; phone-to-landscape resize checked. No-JS text fallback retained. No permanent visual tests or CI polling.

Recovery: `089b17d` moving refrain / glitching accents; `62ca132` rejected reading-face survey; `dc355ec` rejected Codrops effects; `6dfe338` rejected pinned verse timeline; `4013e89` liked first-sentence close view. [Decision record](../docs/collaboration.md).
