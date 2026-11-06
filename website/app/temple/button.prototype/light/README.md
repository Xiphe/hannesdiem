# Current light Temple button

Saved on2026-11-06 after the artist says “ok, lets leave it like this”. Keep
this as the current light version. Exploration is parked; no production
integration or publication is requested. The accepted dark version remains
separate in ../dark; the earlier3D passage remains in ../light-passage.

The frozen source preserves the live8795 study, with portable imports and
equivalent appendChild calls for repository DOM types. The glimmer primitive
is copied so future opener changes cannot silently alter this reference.
settings.json records defaults; idle.png and hover.png are visual references
from the existing CMX page, not test fixtures. The live source defines motion.

Current treatment:

- Plain white base; constant1px #f0eef1 border and native dark label.
- 1px primary-blue cursor light, within110px; pre-hover strength capped at20%.
- Gentle white/purple-pearl surface catch.
- 1px varied purple-pearl traces; brighter purple/pink on hover/focus.
- One to three shooting-star traces at65–120px/s, with speed-dependent heads
  and smooth deposited tails.
- Smaller, lighter teal glimmers with about one-third pink; no white centres.
  Hover/focus only;9/s, drift reach56px, size80%, opacity75%.
- Reduced motion freezes traces/suppresses particles. Native link and visible
  keyboard focus remain; offscreen/hidden rendering pauses.
- Study-only background picker/hex controls, persistent custom colours and
  Reset to white. The saved baseline is white; reset if local preferences differ.

Recovery: with the existing CMX page preview on8787 and8795 free, run from the
repository root:

```sh
node website/app/temple/button.prototype/light/server.mjs
```

On the user’s machine: `sand tunnel 8795`, then open http://localhost:8795/.
BUTTON_STUDY_PORT can override the review port. The server decorates the native
CMX page without an alternate content index. While the existing8795 study is
running, use it directly instead of starting a second server on that port.

Prior synthetic checks cover native bounds/navigation, keyboard focus, reduced
motion, mobile controls, background validation/persistence/reset, plain-white
idle/hover/press and the constant pale border. Frozen sources compile with
TypeScript/esbuild; no new artwork changes accompany this save. Future
integration should use the page’s artwork lifecycle, retain native actions,
remove review controls/storage, and keep synthetic fixtures as assertion data.

2026-11-06 functional follow-up: the native header now morphs its painted
outline with transforms while keeping layout/canvas dimensions fixed. Refresh
pointer geometry on pointer input and normalize it to the painted bounds so
the light stays under the cursor during and after that morph. The saved
material/colours/settings are unchanged.
