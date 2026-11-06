# Fragment ground

The live background sculpture and travelling traces belong here. Seeded shape
generation lives in `contracts/temple/fragments.ts`, shared with navigation,
location material and content share-image preparation. Runtime placement and
animation remain website responsibilities.

`mountFragmentGround` in `ground.ts` owns construction, layout observation and
abort cleanup. The host supplies the Temple stage and measured refrain elements;
bridge and final-verse markup supply the remaining reading gaps.

- `ground-motion.ts` derives the gaps and native depth timelines.
- `ground-pieces.ts` assembles the seeded shapes around those gaps.
- `ground-viewport.ts` attaches nearby pieces within bounded paint surfaces.
- `ground-signal.ts` owns visible outline traces; `trace-outline.ts` follows the
  actual rounded contour.
- `material.ts` retains each host's seeded shapes for placement and synthetic
  fixtures. `style.css` owns their theme and motion presentation.

Keep paint surfaces bounded to the viewport. The earlier document-length planes
were replaced after iOS WebContent memory termination; the accepted geometry,
reading gaps and native scroll behavior remain. See the
[artwork decisions](../docs/collaboration.md).

The unused fragment action and its border/burst behavior were deliberately
retired in `2342138`. Git history preserves that artwork independently of the live
ground; access to shared geometry requires no button implementation.

Synthetic geometry tests live under `website/tests/fragment-*.test.ts`.
The bounded-ground browser checks are in `website/tests/fragment-ground.spec.ts`;
trace, spacing and glyph regressions are discovered by the regular browser suite
in Chromium and WebKit. Standalone synthetic diagnostics remain available:

```sh
node website/app/temple/debug/ground-spacing.ts
node website/app/temple/debug/trace-rim.ts
```
