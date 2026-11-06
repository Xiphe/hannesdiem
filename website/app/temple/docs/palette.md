# Temple of Sound palette

`/temple-of-sound`; system theme. Source: `content/media/IMG_6257.JPG` + glimmers.

| Role                        | Light          | Dark           |
| --------------------------- | -------------- | -------------- |
| Background / canvas veil    | `#fffefd`      | `#000000`      |
| Foreground / fallback title | `#11120b`      | `#d2d0c8`      |
| Primary UI accent           | `#32608b`      | Per component  |
| Scroll indicator            | `#84442b`      | `#343434`      |
| Date                        | Copy cloud ink | Copy cloud ink |
| Date shadow                 | None           | None           |
| Favicon: left top           | `#b46a49`      | `#fff9df`      |
| Favicon: left bottom        | `#84442b`      | `#bdb49c`      |
| Favicon: right top          | `#645b48`      | `#f2ad78`      |
| Favicon: right bottom       | `#11120b`      | `#b46a49`      |

Current lettering material: forest, solar glimmers and mixed fog (hues4°/18°/42°, strength83%, flecks34%). The earlier `#ff8800`11% overlay is removed.

UI: `website/app/temple/style.css`, `scene.ts`, `forest.ts`.
Favicon: `website/app/temple/assets/mark.svg`; build: `website/build/assets.ts`; selection: `website/app/page.tsx`.

Palette changes: update UI, both favicon variants and this table together.

Working scene: restore system light/dark appearance for opener, poem colour clouds and refrain. Retain the artist’s pure-black dark ground. Native copy clouds use the corresponding foreground as their base. Startup remains black until assets and the first frame are ready. The original two favicon palettes remain unchanged.

Integrated-scene update,2026-10-30: the date now shares the copy’s animated colour field in both themes, without a shadow or opacity flicker. Its position and scroll exit remain. The indicator keeps its established colours. Light-mode clouds mix towards warm `#8e441c` and cool `#245989` inks, halfway blended with the original channel-shift output after the artist found the first stronger range excessive. Dark copy output is unchanged. Zero variance restores the theme’s base foreground.

Fragment button update,2026-11-01: eleven floating pieces use the copy cloud's existing warm/cool channel mapping and theme bases, shared through `copy-palette.ts`. Subtle static gradients sample that range; no additional colour animation is introduced. The previous independently generated HSL palette is superseded.

Primary UI update, 2026-11-03: the artist selects the copy’s blue for light-mode primary UI. `--temple-primary-light` is the shared source for the signup CTA, header progress and navigation hover, Circle form actions, enabled notification switch and owned-seat highlight. Use it for future light-mode primary controls; keep neutral surfaces and destructive actions distinct. The signup CTA retains its pale blue dark-mode fill; the other controls retain their existing dark-mode treatments.

Loading appearance update, 2026-11-03: the loading screen follows the visitor’s system appearance from the initial HTML, before stylesheets or JavaScript load. Light mode uses the warm paper ground and dark copy inks; dark mode retains the black ground and pale spinner/text. Appearance changes also apply while loading; the reveal timing, reduced-motion behavior and fallback remain unchanged.

## Selected light UI palette — 2026-11-03

The artist selects the [exported lab values](light-palette-2026-11-03.json), with these explicit refinements: reserve the blue-to-teal gradient for header progress; use solid secondary buttons with white text wherever an action button fits; match Visit’s background pieces to the other section pieces. Keep Release as a red ghost action and retain icon, inline-tooltip and switch semantics. This supersedes the earlier light-mode primary-action fill. No deployment is requested.

`../palette.css` is the shared source for the light UI roles. Page/loading/header use `#fffefd`; background fragments use `#f6f6f5` mixed with the paper for depth. Reading pieces, including Visit’s enhanced and fallback materials, use `#e9e7e7` → `#f3f0ec`; floating pieces use `#e3e0de` → `#e1dfdb`, with no extra edge. UI ink is `#1e2933`, dimmed text `#64707d`, and input fill/border `#fafcfc`.

Header progress alone uses `linear-gradient(25deg in srgb, #32608b, #60cbcd)`. Action buttons use `#6b6966` and white text; Release uses `#c24029`. The switch keeps its plain-English state, a solid blue on track, and `#cac8bf` / `#7f7e7a` for its off track/thumb. Solid blue also marks focus and owned seats. Dark-mode materials and the photographic lettering, animated poem ink and favicon artwork retain their existing palettes, as in the reviewed lab.

The [button inventory](buttons.md) records which controls receive the secondary treatment and which retain their existing role. The palette lab is preserved separately on `codex/temple-light-palette-lab`.

Map refinement, 2026-11-03: the artist requests darker water than land but a much lighter map overall. Give the map its own light-mode roles: neutral gray water `#c8c8c5` → `#d6d6d2` (the artist explicitly rejects a blue tint), near-white land `#f8f8f4` → `#fdfcf9`. Both enhanced and native fallback maps share these roles; Visit’s reading piece retains the common section material. The artist further darkens the water and selects the solid primary blue `#32608b` for the light-mode pin. Dark-mode map colors and camera behavior remain unchanged.

Entry-button artwork update, 2026-11-06: integrate the accepted entrance
material as an explicit exception to ordinary secondary action buttons. Light
uses a solid white base, constant 1px `#f0eef1` border, the shared primary blue
cursor light, purple/pink traces and teal/pink glimmers. Dark retains its
accepted charcoal surface and warm light. Other action roles and the reserved
header-progress gradient stay unchanged. See [entry buttons](../entry-button/README.md).
