# Temple typography and reuse

Artist-defined rules, clarified with Hannes on 19 November 2026.
Apply these to Temple typography, masks and adaptations such as Reel openers.
Keep future clarifications here; Git preserves earlier decisions.
Implementation references describe mechanisms, not additional artistic permission.

## Verse setting

Use the existing verse hierarchy and optical line fitting from
[block-type.ts](../block-type.ts) and [style.css](../style.css).
Keep the original vertical spacing proportions when scaling to another medium.
Preserve natural glyph shapes and kerning.

The widely spaced address is permitted only as the first, uppermost line,
in Unbounded and uppercase. Ordinary connective lines retain normal spacing.
Mixed typefaces and separately fitted lines belong to the verse vocabulary.

## Chorus and masked setting

Use the chorus setting from [first-pair.tsx](../first-pair.tsx), its
`Refrain` component, and the `.refrain-phrase` rules in [style.css](../style.css).
Each intact phrase or frame uses one typeface. Use that face's existing
weight, casing, tracking and line arrangement. Keep natural word spacing;
the verse's full-width line treatment and spaced address do not carry over.

For a typeface journey, move between complete single-face settings.
Competing faces can coexist during the original glitch transitions.
The existing repertoire is Bricolage Grotesque, Germania One,
Cinzel Decorative Bold and Unbounded.

## Ink, masking and glitch

For a plain overlay, give all lines the same base ink. Moving colour material
belongs to one shared high-quality field across the setting.
Different line tints or approximated substitute textures are outside this treatment.

Temple glitch is permitted only on black, with the letterforms revealing the
image or video behind them. Reuse the original mask and transition mechanisms
in [typography.ts](../typography.ts) and [scene.ts](../scene.ts).

For Reel glitch experiments, use the opener's full typographic journey:
complete face changes with glitch transitions across the repertoire.
A mostly static setting with occasional small local disturbances does not
fulfil that brief. Time-based playback can drive the original scroll range.
Timing is an experiment choice; it is not a new website scroll specification.
Judge source material for legibility through the letters.

## Reel composition and caption handoff

The sentence may lead the image and cover the person or instrument.
A wide setting sits horizontally centred in the upper half.
A setting centred in the whole video is smaller and leaves room on the right
for controls. Check the destination UI and current safe-zone evidence.
These composition choices are for Reels; preserve the website's existing layout.

The small caption hint and downward arrow are liked as a treatment.
It may sit lower or just above the caption, clear of UI.
Let its wording continue the hook towards what the caption actually offers.
Its visual treatment is accepted; “More in the caption” remains a possible
placeholder rather than a mandatory repeated sentence.

## Review

Check the verse/chorus distinction, spacing, ink, mask background,
whole-face transitions, UI clearance and the caption handoff together.
Preserve Hannes' authored meaning and wording. Keep unselected experiments
recognizable as proposals.
