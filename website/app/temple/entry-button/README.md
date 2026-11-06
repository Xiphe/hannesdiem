# Temple entry buttons

The artist approved integrating the dark and light entrance treatments and the
smooth header handoff on 2026-11-06. This enhances the existing welcome, fixed
header, closing and “Back to the Manifesto” anchors. The return caption shares
the opener hint’s small, muted treatment; other controls retain their own roles.
Native wording, destinations, keyboard focus and no-JavaScript navigation stay
with those anchors. The shared glimmer sprite is the opener's existing primitive.

`mountEntryButtons(host, signal)` runs in Opening's existing Remix task. No new
CMX content shape, renderer, store or publishing path is needed. CSS supplies
the accepted resting surfaces without JavaScript. The effect follows system
appearance changes, owns its observers/events/frames through the task's abort
signal, and removes/releases every decorative canvas on disposal. It pauses
offscreen, while the document is hidden, and for hidden welcome/header actions.
Observe the existing loading gate so effects start when the page is revealed.
Reduced motion freezes traces and suppresses emitted glimmers.

| Treatment             | Dark                                        | Light                                           |
| --------------------- | ------------------------------------------- | ----------------------------------------------- |
| Base                  | Charcoal radial #25211b → #191713 → #11100e | Solid #ffffff                                   |
| Resting border        | None visible                                | 1px #f0eef1                                     |
| Cursor light          | 1px warm pearl/honey                        | 1px primary blue #32608b                        |
| Surface catch         | Gentle warm light                           | Gentle white/purple pearl                       |
| Idle traces           | Varied cool pearl, strength 0.34            | Varied purple pearl, strength 0.52              |
| Hover traces          | Whitened                                    | Brighter purple/pink #e68fdb                    |
| Glimmers              | Warm opener light                           | Teal with roughly one-third pink; no white core |
| Drift reach           | 32px                                        | 56px                                            |
| Glimmer scale/opacity | 100% / 100%                                 | 80% / 75%                                       |

Both preserve 1px trace cores, one-to-three shooting-star sources at 65–120px/s,
speed-dependent heads and independently fading deposited tails. Light strength
is 2 and emission 9/s. Pointer light responds within 110px and reaches at most 20%
before hover; emitted glimmers begin only on hover or keyboard focus. Pointer
coordinates use painted bounds, so the header morph need not resize the canvas.

The handoff stays in top-navigation-position.ts: transform the outline,
counter-scale its text, clip the extra words, and reverse from the current pose.
The full header backdrop covers the approaching manifesto hint. The renderer
never animates layout widths or adds review controls/theme overrides/storage.

The experiments were checkpointed before removal in **ca4416f**. That commit
contains `website/app/temple/button.prototype/{dark,light,light-passage}/`,
including source, settings, screenshots and the remembered 3D passage. The
passage is historical material, not part of the current button. Recover those
references from Git rather than restoring study scripts to the running page.
The old review servers are retired; review the native page on 8787 with
`sand tunnel 8787`.
