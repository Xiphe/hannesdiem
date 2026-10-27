# Codrops letter motion — immediate opener-to-verse handoff

`npm run prototype:temple-text`; user access: `sand tunnel 8790`.

- **A · Aufrichten / Effect 2:** `http://localhost:8790/temple-of-sound?layout=type`
- **B · Aufklappen / Effect 7:** `http://localhost:8790/temple-of-sound?layout=woven`

The artist rejected the verse's pinned scroll model (`6dfe338`): the scrollbar must retain a tangible relationship to the document. They requested exploring both large typographic flow and interwoven text/image composition before choosing a direction. Both studies remain in Expansion.

## Current correction

The artist rejected the low-amplitude result at `531c222` as boring, expects the actual linked Codrops experiments and wants the first line during the opener exit without a blank screen.

Mechanisms adapted from [Codrops OnScrollTypographyAnimations](https://github.com/codrops/OnScrollTypographyAnimations/blob/main/src/js/index.js), **effects 2 and 7**; MIT notice retained in [codrops-LICENSE.txt](codrops-LICENSE.txt). No GSAP/Splitting dependency added.

- **A / effect 2:** characters rise from y120%, stretched vertically 2.3× and narrowed 0.7×, into native proportions. Compact ease-out and intra-word staggering replace the source's bouncing ease/long ranges.
- **B / effect 7:** characters rotate from Y -90° and -300px depth around their right edge, with reverse character staggering. Existing image fields remain behind the text.
- All seven original units participate. Local motion follows words' real viewport positions; no sentence timeline or pinning.
- First sentence starts at document y0.58 viewport. Letter entry runs across scroll 0.13–0.27, overlapping title exit: visible by 0.16, complete by 0.24 on tested desktop/phone sizes.
- Clipped paragraph ink keeps document height constant despite large transforms. Native proportional character widths, Bricolage 600 and original wording/order remain.
- Reduced motion shows settled text; no-JS displays the prose in normal flow after the opener.

These are stronger motion probes, not accepted artwork. Setting, easing and material remain open for review.

## Actual document and opener

All verse text has natural content height. No fake scroll range, active-sentence timeline, text pinning, forced dwell, wheel interception, or `scrollTo` in scroll handling. Paragraph document coordinates and total page height remain stable across the entry frames; their screen displacement follows native scrolling.

The accepted opener retains its 130svh document box and title sequence. After title exit its stage stays fixed behind the reading area. Local esbuild uses renderer/CSS/fonts from main `3b839491bf4743f05bce54b9f8a00c64de29ad08`; one visibility adaptation observes the actual stage rather than the departed opener root. This keeps ambient glimmers alive without changing title visuals or production code. Reduced motion removes letter/image movement and freezes ambient particles.

The source photo is prepared with accepted pipeline settings (rotate, 1920px, WebP quality 80; hash prefix `6f60f5b1a39bdac4`). No CDN dependency or new package. Text comes from `content/temple-of-sound/draft.tsx`, or `content/drafts/temple-of-sound.tsx` on this older branch. Source prose/order unchanged.

## Review controls

A/B links or ←/→ switch at the currently read passage and update `?layout=`. URL survives reload; no saved preference. Native scrolling keys otherwise retain their behaviour. **Zum Anfang** returns to the opener. H/× hides controls; ↔ restores them. Hidden alternative is excluded from rendering/accessibility. Review UI is outside artist prose. Reload/restart the local server after bundled client edits.

## Validation / boundary

Scoped TypeScript and Prettier. Browser-checked first-word visibility through the handoff (0, 0.16, 0.24, 0.32 viewport), constant document height/paragraph coordinates, original seven units, desktop/390px phone bounds, final-unit visibility, reduced-motion identity transforms and a real no-JS browser context. No permanent visual tests, CI polling, Worker/publication changes or deployment. Only the opener remains public.

Recovery: `6dfe338` pinned first-pair sequence; `4013e89` liked first-sentence close view; `c1d9879` rejected isolated traces; `551612d` parked glyph coupling. [Shared context](../docs/collaboration.md).
