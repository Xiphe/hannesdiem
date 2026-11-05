# Actual liquid simulation for the Circle

Research: 2026-11-05. Scope: a local experiment, not an accepted visual treatment
or production integration. The artist requires actual liquid dynamics rather
than animated outline poses. The desired material moves slowly, reaches toward
a chosen surrounding place, and can wrap it with a concave connecting neck.

## Recommendation

Start with a CPU **2D particle fluid using Clavet's double-density relaxation
(DDR)**, pairwise viscosity and a reconstructed particle-density surface. Keep
the native label and controls above it. At this size the simplest credible
experiment is approximately 600–1000 simulated particles, spatial neighbors,
fixed substeps and a visible particle/debug mode. This is an engineering
recommendation, not measured evidence of acceptable performance on the artist's
Mac. It must earn integration through visual review and measured frame costs.

DDR is an actual numerical particle-fluid method: pressure responds to local
density; opposing near-pressure prevents collapse; their interaction permits
cohesive sheets, drops and filaments. It is a graphics approximation, not a
validated quantitative honey model. Its cohesion is emergent from its pressure
construction rather than a separately calibrated physical surface-tension law.
[Clavet, Beaudoin and Poulin, 2005](https://diglib.eg.org/items/7cad7994-b781-40ce-ad04-0bf61dc94279).

## Numerical recipe

The following reproduces Algorithms 1, 2 and 5; `h` is neighbor support radius,
`dt` the fixed substep, `n` the unit vector from particle i to j. All particles
have equal mass. Skip self pairs and guard coincident positions.
[Paper, algorithms and equations](https://diglib.eg.org/server/api/core/bitstreams/fbe12062-dca1-427c-ba8a-ec78222cec40/content).

```text
external acceleration: vi += dt * ai
viscosity, each unordered neighbor pair i<j with r<h:
  w = 1-r/h
  u = dot(vi-vj,n)
  if u>0:
    I = dt*w*(sigma*u + beta*u*u)
    vi -= I*n/2; vj += I*n/2
save old positions; predict xi += dt*vi
rebuild neighbors at predicted positions
DDR, each i with every neighbor j (not only i<j):
  rho = sum(w*w)
  rhoNear = sum(w*w*w)
  P = k*(rho-rho0)
  Pnear = kNear*rhoNear
  for each neighbor:
    D = dt*dt*(P*w + Pnear*w*w)*n
    xj += D/2; accumulate xi correction -= D/2
  apply accumulated xi correction
project collisions
vi = (xi-oldXi)/dt
```

Allow negative `P`: clamping all pressure to nonnegative values removes the
attractive part. Use strong **linear** viscosity `sigma` for thick fluid;
quadratic `beta` primarily damps rapid approaches. Omit elastic/rest-length
springs initially; those introduce a different material behavior. The original
method updates pairs sequentially.
[Paper, sections 4–5](https://diglib.eg.org/server/api/core/bitstreams/fbe12062-dca1-427c-ba8a-ec78222cec40/content).

A primary JavaScript implementation is Grant Kot's
[`sim_5.js`](https://github.com/kotsoft/particle_based_viscoelastic_fluid/blob/main/sim_5.js).
It supplies spatial hashing, DDR and viscosity, and documents deviations from the
paper. Its demonstration uses pixel positions and `dt=1`; copying stiffness
values into a seconds-based `dt=1/120` solver makes pressure displacement 14400
times smaller. It also clamps extreme inward speeds and pressure. Treat such
clamps as numerical safeguards to inspect, not physical honey properties.
[Implementation notes](https://github.com/kotsoft/particle_based_viscoelastic_fluid#sim_5js).

### Initial scale and tuning hypotheses

These are proposed starting points, not settings established by the papers:

- Hexagonal spacing 4px, `h=10px`, approximately 600 particles gives a resting
  patch radius near 51px before density relaxation. The synthetic infinite
  lattice has 18 neighbors, density 2.96616 and near-density 1.51791. These
  figures come from summing the kernels over that lattice, not website content.
- Use fixed `dt=1/120s`, two substeps per 60Hz display frame, with bounded catchup.
  Rebuild a cell list of width `h` at current positions for viscosity and again
  at predicted positions for density. In 2D inspect nine cells. Reuse numeric
  buffers. A finite widget can use a direct cell array rather than hash collisions.
- Calibrate `rho0`, `k` and `kNear` together on an unforced patch. Setting `rho0`
  to the raw initial density alone does not account for positive near-pressure.
  Begin by measuring settled area and density, then tune density relaxation;
  do not prescribe the outline. If using effective displacement strengths,
  record both `k*dt²` and fixed `dt` to avoid ambiguous units.
- For viscosity exploration, `dt*sigma` around 0.05–0.25 is a reasonable sweep,
  not a measured optimum. Limit a pair's radial impulse magnitude to its inward
  relative speed so damping cannot reverse the pair's approach. Verify that
  kinetic energy decreases without external input. Increase substeps when
  stability or displacement bounds demand it.
- Spatial-neighbor lists must remain valid under corrections. Either rebuild
  during additional relaxation passes or conservatively include a search skin.
  An empty/stale neighbor grid silently disables viscosity or cohesion.

## Interaction forces, not a prescribed silhouette

The source of movement must be forces applied to particles. A weak central
potential can retain the body; a bounded, local attraction near the pointer or
selected place can draw part of it outward. A circular collision/adhesion field
at a place can let fluid accumulate outside it. These are proposed interaction
conditions: an anchored body and attractive UI targets do not occur spontaneously
in an isolated honey drop. State those conditions honestly. Keep label layout
independent of physics, without pinning each fluid particle to a target pose.

Do not guarantee a connecting bridge by drawing one. Its formation, narrowing,
breakup and recovery should follow simulated particles. A bridge needs several
particle spacings across its width; a 3px neck cannot be resolved by 4px particle
spacing. If the required neck is thinner, increase particle resolution or accept
that the physical outcome may detach. Evaluate that outcome with the artist.

Reconstruct a density isocontour from **actual particle positions**, for example
on a roughly 140×140 scalar grid with marching squares and interpolation; expose
raw particles beside/over it for debugging. Contour smoothing must not manufacture
a neck across an empty gap. This grid/resolution is a proposal to benchmark.

## Alternatives

| Method                                       | Strength                                                                                            | Cost or mismatch for this study                                                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CPU DDR/SPH family                           | Direct material transport and free surface; compact 2D implementation; cohesive filaments           | Approximate compressibility and timestep-dependent parameters; high viscosity needs stability checks                                                               |
| CPU Position Based Fluids (PBF)              | Iterative density constraints and regularization handle larger steps; GPU-friendly Jacobi structure | More density/gradient passes and parameter handling; its artificial-pressure surface tension remains coupled to anti-clustering                                    |
| CPU PIC/FLIP                                 | Grid pressure solve with particle transport; permissive browser implementation available            | Extra particle/grid transfer and pressure iterations; the available teaching example lacks viscous diffusion and surface tension needed for a suspended honey drop |
| GPU stable fluids with dye                   | Regular grids map efficiently to texture passes                                                     | Dye advection alone does not provide an air/liquid boundary, cohesive drop or bridge                                                                               |
| GPU free-surface level set or particle fluid | Real free surface and scalable computation                                                          | More setup, pressure/free-surface boundary handling, viscosity/cohesion and device fallback work than justified before this small study passes review              |

PBF solves per-particle density constraints iteratively and applies XSPH viscosity
after reconstructing velocity. Its paper reports CUDA results on GTX680,
including 128k particles with two substeps and three iterations; this is **not**
evidence of JavaScript browser timings. The authors explicitly describe the
surface-tension-like effect as an artifact of the artificial-pressure term.
[PBF paper, algorithms, results and limitations](https://matthias-research.github.io/pages/publications/pbf_sig_preprint.pdf).

Müller's browser FLIP source uses typed-array particle/grid state, PIC/FLIP
velocity transfer and a grid incompressibility solve (50 pressure iterations in
its scene setup). It is a useful real-fluid reference, but the source has no
viscosity or surface-tension stage. Lowering the FLIP ratio increases numerical
damping; that alone is not a calibrated viscous model.
[Ten Minute Physics, episode 18 source](https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/18-flip.html).

NVIDIA's GPU treatment distinguishes water's free surface from smoke/dye and
introduces a level set, liquid-only pressure handling and surface tracking.
Therefore a colorful “WebGL fluid” dye demo is not a sufficient substitute for
this widget. The chapter also explains bandwidth costs across many shader
passes and failure from insufficient pressure convergence.
[GPU Gems 3, chapter 30, sections 30.2.7–30.2.10](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-30-real-time-simulation-and-rendering-3d-fluids).

## Performance evidence and acceptance gate

No browser benchmark was run as part of this research. Published large GPU demos
and old paper timings must not be presented as evidence that this page meets
its budget. Particle count alone is insufficient: density iterations, neighbor
counts, scalar-field rasterization and DPR can dominate.

For the prototype, measure separate physics, surface extraction and render
costs for 500, 750, 1000 and 1500 particles using a fixed synthetic pointer trace.
Report median/p95, warmup, browser, hardware and renderer. Test CPU throttling and
moving between opposite targets. Aim for a small bounded fraction of the 16.7ms
frame, proposing p95 below 4ms for this widget before page integration. Pause
hidden/offscreen; bound catchup after pauses; retain a static circle for reduced
motion or inability to run. This budget is a proposed gate, not an achieved one.

Acceptance requires material redistribution, continuous old-stretch retraction,
viscosity that changes motion, density recovery, and no hidden shape presets.
The artist judges whether actual simulated behavior warrants keeping the effect.

## Reuse and licensing

- Grant Kot's source is **MIT**, copyright 2024 Grant Kot, with a retained
  Matthias Müller 2022 notice for its hash function. Preserve the full notices
  when adapting substantial code.
  [License](https://github.com/kotsoft/particle_based_viscoelastic_fluid/blob/main/LICENSE).
- Müller's episode18 HTML embeds the **MIT** license and its 2022 copyright.
  Preserve that embedded notice when adapting its implementation.
  [Original source](https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/18-flip.html).
- The papers establish algorithm provenance; they do not by themselves license
  arbitrary third-party implementations. This research found no reason to import
  a complete rendering/framework stack for a small 2D experiment.

## Isolated numerical experiment and measurements

A real DDR study now runs outside the website at
`/home/agent/.codex/visualizations/2026/11/05/01a1ab84-2fb6-7963-bebc-561fb210c982/liquid-simulation/`.
Its README records recovery, solver parameters, external fields and limitations.
Run `python3 -m http.server 8796 --bind 0.0.0.0` there; review through
`sand tunnel 8796`, then `http://localhost:8796`. This is an independent
implementation of the paper's equations, with no copied third-party solver or
new website dependency. The shared page has not been changed by this study.

The current study uses661 particles at4px hex spacing, h10px, fixed120Hz steps,
k3600, kNear7200, rho0=4.8, linear viscosity100 and quadratic0.03. Central
attraction and a localized pointer/annular target field are external interaction
conditions. Circle obstacles represent the dots. Environmental drag is8/s and
a180px/s speed bound limits large steps. The normal benchmark below triggered
no speed clamps. A240×240 density field with7px compact support reconstructs
the surface. Raw-particle view exposes the actual mass; no bridge is drawn or
guaranteed. The central label stays DOM text and can become uncovered as liquid
redistributes. The moving material remains an artistic experiment.

Measured in local headless Chromium155, Apple ARM Linux VM,10 visible CPUs,
360px canvas displayed over a220px-diameter ring. After2s warmup, synthetic
attraction targets changed2→7→0→5 every1.8s. Statistics cover the last360 frames:

| Metric                             | Median |    p95 |
| ---------------------------------- | -----: | -----: |
| Physics plus density rendering CPU |  3.2ms |  3.5ms |
| Physics CPU                        |  2.8ms |  3.0ms |
| Display frame interval             | 16.7ms | 16.7ms |

There were two physics substeps per display frame. This meets the proposed4ms
isolated-widget CPU gate in this run; it does not establish whole-page, native
Mac, Safari, mobile, higher-resolution or other-device performance.

A separate3s run with4× DevTools CPU throttling captured167 frames: widget CPU
median12.2ms/p9522.3ms, display interval median16.7ms/p9533.3ms, mean2.18
physics substeps per frame. Slower devices still need an explicit budget and
static fallback; do not silently promise this simulation everywhere.

With pressure, external fields and environmental drag disabled, a controlled
shear initial condition retained661 particles and conserved its centroid within
1e-12px. Ten steps reduced mean squared speed from262.337 to262.328 at linear
viscosity0 (quadratic0.03 remained), and to247.091 at linear viscosity100.
That is evidence of actual pairwise viscous dissipation, not an aesthetic verdict
or calibrated honey validation. Artist review of the real motion is the next gate.

## Accepted material response; SVG contour and centre floor

The artist says “love it” to the actual liquid study, then requests sharper
edges, ideally a vector version, and a centre that stays covered even when
simulated material moves away. Acceptance retains the material direction;
rendering and website integration remain under review.

The same8796 study now uses `surface.js` to derive live SVG paths from the
actual particle-density field. It samples241×241 vertices at1.5px spacing,
retaining7px compact support and the previous isovalue1. Shared grid-edge
intersections form closed marching-squares loops; bilinear saddle decisions
preserve connectivity at this resolution. Short quadratic segments round grid
corners using the measured contour as their control polygon. Even-odd filling
retains holes. There is no bitmap or blur filter in the displayed liquid or its
SVG snapshot. Sub-grid topology remains limited by the density resolution.

The artist's suggested overlay is a separate, opaque SVG centre disc, default
radius50px with a0–64px control. It does not alter the solver, add particles or
force liquid into a central pose. Raw-particle mode hides the SVG, including that
visual cover. **Save SVG** exports the centre disc and current liquid silhouette
as standalone geometry; it excludes the DOM text and dot controls. The accepted
solver source is unchanged, SHA256
`a048ecb1f72a9baceedf2d03100aa077ce62335fec374b7998c32f7e7323a39a`.

Synthetic verification (`node verify-surface.mjs` in the study directory) covers
circular contour accuracy, annulus holes, separated and diagonal droplets,
closed graph connectivity, both saddle orientations at high/low density and an
empty field. Native SVG hit tests preserve the ring hole. Browser review checks
text-range coverage by the centre disc, radius adjustment, actual particle-mode
visibility, mobile overflow and a downloaded SVG containing no raster elements.

A repeated360-frame target-switch trace on the same machine measured JS work
median3.3ms/p953.4ms, physics median2.9ms/p953.0ms and density/contour/DOM update
median0.4ms/p950.5ms. Display interval p95 remained16.7ms, with two physics steps
per frame. Timings exclude deferred SVG paint/compositing. An earlier run on the
shared machine had total p957.7ms and physics p956.6ms; performance varies with
load. These observations do not establish native Mac or whole-page budgets.
No additional production code, dependencies or CMX contracts are introduced.
