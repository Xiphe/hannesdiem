# Accepted dark Temple button

Accepted by the artist on 2026-11-05: “love it, we have your button. store it,
we need it later”. This freezes the approved dark study for later integration.
The light version remains a separate exploration. No production integration or
publication is requested here.

The frozen sources preserve the study's appearance and behavior, with portable
local imports, repository formatting and equivalent `appendChild` calls for
compatibility with the repository's DOM types.
`glimmer-sprite.ts` snapshots the existing Temple sprite so later changes to the
opener cannot silently alter the accepted material. `hover.png` is a visual
reference; the live source defines the motion. Review controls belong to the
study, not the eventual production button.

## Accepted treatment

- Charcoal radial surface, dark resting border absent, pale readable native label.
- One fine warm cursor highlight, without the extra glow/double-border strokes.
- Cursor light responds within110px, reaches at most20% strength before hover,
  then smoothly reaches full strength on hover or keyboard focus.
- Glimmers begin on hover/focus, not idle/proximity. Defaults: light2,
  glimmers9/s, drift reach32px, pointer mode.
- One to three shooting-star traces, including residual trails, at65–120px/s.
  Bright heads scale4–24px with speed; deposits fade independently and smoothly.
- Individual blue/silver/faint-lavender/warm-pearl shades, intensity0.75–1.35.
  Mouseover whitens them while retaining a slight distinction. Idle strength0.34.
- Reduced motion freezes traces and suppresses particles; native link and focus
  remain usable. Offscreen and hidden-document rendering pauses.

## Review and later integration

Start the shared page preview on8787, then from the repository root:

```sh
node website/app/temple/button.prototype/dark/server.mjs
```

Default review port8793; override with `BUTTON_STUDY_PORT` if already running.
On the user's computer: `sand tunnel 8793`, then open http://localhost:8793/.
The server decorates the existing CMX page; it creates no alternate content index.

Future integration should extract the renderer into the existing Opening task
lifecycle, omit review controls, keep native actions and accept the task's abort
signal. Preserve this snapshot as the visual/motion reference. Synthetic fixtures
must remain the basis for assertions; `hover.png` is only for human visual review.
