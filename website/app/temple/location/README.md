# Location invitation

The artist accepted the location study and requested cleanup/integration with main on 2026-11-01. Its purpose is to introduce the place and invite an in-person visit after the opener. The accepted prototype is recoverable at `b8e61ec` on `codex/temple-facts-accepted-study`; it is an archive, not a second runtime.

## Ownership

- `PoemLocation` is optional typed CMX input. The authored wording, venue coordinates, contact link and room image belong to `content/pages/temple-of-sound/index.tsx`. `poem.tsx` resolves the image through the regular immutable media pipeline. No content module enters the browser bundle.
- `view.tsx` renders native text, a contact link and the map before JavaScript. The heading is ordinary Cinzel Decorative with native wrapping: no fitted-width helper, cloud treatment or headline variants.
- `enhance.ts` owns only material fitting, gentle native vertical parallax and the map camera. The Opening task cancels its observers, listeners and animations on navigation or startup failure. Layout sampling runs on resize; scroll updates just the camera and pin scale once per frame. Reduced motion freezes the map at its wide initial view.
- The map zoom uses the visible contour’s viewport progress, preserving geographic context before approaching the venue. Geography and pointer share coordinates; the camera zooms around the venue so its pin remains in the right lobe. Pin links use Apple Maps on Apple devices, Google Maps on Android and OpenStreetMap otherwise; native rendering defaults to OpenStreetMap.
- `europe.svg` is an immutable external SVG, keeping geography out of JavaScript. [Source and projection](GEOGRAPHY.md). The material contour is borderless and rounded, extends off the left edge and sits about70px before the reading column on desktop.
- Photo, plain headline and body share the reading column. On small screens the visible map begins16px into the section, followed closely by the photo. The centred CTA remains inside the text material, with the accepted extra separation from the prose. The first verse starts after this section with its own breathing room.

## Checks

`website/tests/temple-location.test.ts` covers coordinate and platform link selection. `tests/location.spec.ts` covers the native document, responsive camera anchoring, CTA placement and task disposal using synthetic CMX input. These checks do not assert against authored prose or media.
