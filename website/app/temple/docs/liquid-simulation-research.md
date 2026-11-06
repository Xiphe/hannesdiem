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

## Gentler coating around a selected dot

The artist accepts the SVG/centre update and asks for less liquid per dot to
form a gentler border. Reducing attraction alone was insufficient: at160,
material near the target kept accumulating during a long hold. Keep pressure,
viscosity, particle mass/count, transport, SVG reconstruction and centre floor;
change the selected-dot external field.

The preferred shell is now the actual dot radius+3px (16px instead of21px).
Measure nearby particle load with weight1 up to24px, linearly declining to0
at32px. The farther-field intake multiplier is `1/(1+(load/36)^6)`. The36-unit
value is a soft feedback budget, not a hard particle count. A local adhesive
field smoothly rises between28px and20px, retaining already-arrived material
with4× radial attraction while suppressing the central field nearby. Farther
intake eases off as coating accumulates. Releasing the dot removes this field;
free-pointer attraction preserves its prior behavior. No particle is teleported,
deleted or hidden, and no rim or neck is drawn independently of the liquid.

Same synthetic16s hold at dot2, after2s rest, attraction250 and viscosity100:
particles within35px of the dot decrease from274 before to57 after (~79%). All
661 particles remain, the new contour remains connected, and after8s release
the material returns to one central contour with centroid within0.1px of the
centre. No nonfinite positions or velocity clamps occur in this check. A local
browser target-switch trace records median3.2ms/p953.5ms JS work, with display
p9516.8ms. These remain isolated-study timings with the previously stated limits.
The solver module URL is revisioned to avoid reuse of the cached old import.
The thinner coating remains an artistic review on8796, not page integration.

## Independent collection controls — 2026-11-05

The artist requests separate live controls for dot and cursor collection.
Dot collection exposes the existing soft weighted-load budget (default36);
Cursor collection adds the same feedback to a free pointer (default180).
Both range0–300. These are relative soft budgets, not exact particle limits.
The shared Attraction control still sets force. A zero collection value removes
that target's attraction, shielding and adhesive field so material can return.
Reset liquid preserves both collection settings along with viscosity and force.
The SVG surface and display-only centre floor are unchanged.

Synthetic16s holds at budgets0,12,36,180,300 retain all661 particles and finite
state. Dot weighted loads are0,20,52.9,171.8,184.8; cursor loads are
0,17.7,51.1,203.0,237.3, respectively. Higher settings gather more material;
feedback is not an exact cap. Free-cursor pooling can engage the existing
180px/s velocity bound (up to2649 particle/substep clamps in this high-budget
hold), so these checks do not claim unconstrained dynamics at every setting.
Browser checks cover live independent values and preservation through reset.
Existing synthetic SVG contour/topology checks still pass. Review remains
on8796; no website integration or publication is requested.

## Cursor releases toward the outside — 2026-11-05

The artist requests less cursor attraction and held material farther outside.
For the free cursor, multiply both collection budget and intake gain by a
smoothstep envelope: full through radius54, fading to zero at radius145.
This also restores the central anchoring field as influence falls. Physical
dot selection keeps its independent collection budget and adhesive field.
Synthetic checks verify decreasing influence, exact released dynamics at/beyond
145, unchanged dot response, and finite state with all661 particles retained
while a loaded cursor moves outward. Its weighted load falls from197 to0 in
that replay. Browser checks confirm free-pointer falloff and outer release.
Review on8796 (`?collection=2`); no website integration requested.

## Selected material settings — 2026-11-05

The artist selects the supplied control values: viscosity61, attraction682,
dot collection63, cursor collection245 and minimum centre radius0. These are
now the study's startup defaults and survive Reset liquid. Retain the radial
free-cursor falloff and SVG density reconstruction. Zero centre radius means
no display-only disc is added; the particle surface supplies the centre.

The exact selected source, contour helper, synthetic contour checks and
settings are frozen under the study's `archive/selected-2026-11-05/` directory.
The live study is available on8796 at `?selected=1`. Browser checks confirm
all five controls/outputs, matching solver values, reset and finite simulated
state after dot selection. This records selection of the liquid treatment and
settings; it does not assert full-page integration or publication.

## Main website integration — 2026-11-05

Following the artist's request to integrate, the selected numerical material is
now hosted by the existing CMX-backed FactCircle on the practical page. The
tracked implementation is `facts/circle-fluid.ts` (DDR particle solver),
`facts/circle-surface.ts` (density-derived SVG contours) and
`facts/circle-enhance.ts` (native input and island lifecycle). It replaces the
rejected interpolated pools/connector code. The study on8796 remains available;
the main local preview is on8787 at `/temple-of-sound/share`. No deployment.

Retain the selected61/682/63/245 parameters and zero display-only centre disc.
The SVG sits behind the native central button and radio labels, keeping stable
hit areas. Its viewBox maps the study's coordinates into the existing responsive
ring; actual native dot centres/radii provide collision obstacles on resize.
The steady supplied label, membership callbacks, confirmation, name editing,
move/release, waiting list and native radio semantics remain in their existing
components. This adds no CMX contract, content index or custom hosting glue;
CMX and the existing Remix island still host this presentation.

Allocate numerical buffers only when visible with motion allowed. Advance fixed
1/120s steps, limiting catch-up to six steps per display frame. Pause offscreen,
in hidden tabs and after membership is claimed. On release, retain the actual
material and stop residual motion when calm after at least2s, with an8s ceiling.
Reduced motion uses the native static round fallback and selection feedback,
without simulating a fake liquid pose. Abort disconnects both observers, cancels
frames/ripples and restores that fallback. Selected spots can still hold the
fluid while the signup panel is dismissed.

Validation: app build and website TypeScript/format checks pass. Eight synthetic
numerical/topology checks cover conserved transport, smooth retargeting, independent
budgets, zero/outward release, holes, disconnected droplets and saddle cases.
The16 related browser cases pass across the final targeted runs: responsive/light
and dark layouts, no-JS content, native click/keyboard selection, confirmation,
claim/rename/move/release, waiting, reduced motion, settled/offscreen/hidden-tab
pause, resume and disposal. Tests now assert actual density transport rather
than the rejected requirement for a prescribed filled rim/neck. One early run
was interrupted by a concurrent dist rebuild (asset500 responses); rerunning
with the existing preview server's frozen asset copy isolated that interference.

A main-page headless spot-hold sample measured8.1ms median/9ms p95 liquid callback
work over110 callbacks. Page frame intervals were around50ms median/66.8ms p95;
with the liquid settled and paused they were also50ms/66.7ms. This is a shared,
software-rendered preview with other page animation, not a native Mac/mobile
performance guarantee. No surrounding rendering was changed to improve this
measurement. The accepted material remains subject to in-context visual review.

## Hold a chosen place and fill its interior — 2026-11-05

The artist requests that clicking a place retain its liquid, including a place
assigned through the central invitation, and asks to try fully filled seats.
Keep the actual simulation and selected61/682/63/245 settings. This reopens the
seat shape for review without withdrawing the accepted liquid method.

The failing browser regressions reproduce a signed-out seat3 and a central
assignment being retargeted to seat1 after closing signup/focus return. The
visual hold previously depended on an authenticated candidate. Add a separate
intentional-choice flag before login, preserve it through private-state refresh,
and keep the existing authenticated form/confirmation state separate. The
enhancer anchors to a confirmed place, otherwise that chosen candidate, or a
user-chosen native radio in the non-persistent fixture. Pointer leave, focus
return and hovering other places do not overwrite the hold. Clicking another
place still changes the choice. Confirmed membership keeps its fluid visible;
release removes the hold. Offscreen/hidden/reduced-motion/disposal behavior stays
bounded as before; a visible held place continues its actual material motion.

For the filled-seat experiment, remove seat collision exclusions and the radial
annular preferred shell. Seats now attract through their interiors, retaining
the local adhesion and collection feedback. There is no added display disc,
painted pool or hole removal in the contour renderer. A numerical regression
failed on the previous hollow centre and passes with actual reconstructed
density above the surface threshold at the seat centre and four interior
samples. The nine numerical/topology checks and18 related browser cases pass,
along with the app build, TypeScript and formatting checks. Main-preview SVG
hit testing also confirms liquid in the selected seat after leaving the circle.
Review this filled-seat treatment on8787 at `/temple-of-sound/share`; the
pre-integration8796 study and saved selected snapshot remain recoverable.
No deployment requested.

## Donut restored; login dismissal cancels a provisional seat — 2026-11-05

The artist prefers the earlier donut treatment and specifies that closing the
login dialog unselects the provisional seat. Restore the annular attraction
shell, physical seat contacts and responsive obstacle mapping. Keep actual
particle dynamics, selected settings and the separate pre-login visual choice.
That choice holds while login is open; closing by its button or Escape clears
it and releases the liquid. Reconcile the artwork after native focus returns,
so focus cannot immediately retarget a canceled choice. Email reactivation uses
the same cancellation rule. Closing authenticated signup retains its candidate,
and confirmed membership keeps its liquid. No server-side reservation is released
by dismissing a login request.

Synthetic coverage checks both seat and central assignment, hold while open,
close/Escape cancellation, focus return and refresh without restoring the canceled
hold. The numerical seat test now verifies an actual hollow interior and liquid
around the physical obstacle. The filled-seat experiment is withdrawn; its
source remains recoverable at59d5734. Local review stays on8787; no deployment.

## A small physical imbalance on release — 2026-11-05

The artist requests slight variance because releasing a seat always returns in
the same way. Try one small transverse velocity impulse when an active target
is released. Choose its sign and magnitude once per release (12–26 world units/s)
and weight it toward the collected end. Subtract the mean weight from every
particle's impulse so total linear momentum is unchanged. Do not move particles,
rotate the rendered outline, change target poses or add per-frame random noise.
Pressure, viscosity, contact and the central field evolve the resulting return.
Repeated release of an already released target adds nothing. Reduced motion
skips the impulse; the existing offscreen/hidden/settled/disposal limits remain.

The numerical test starts two variants from identical held particles and fixed
random samples. It verifies unchanged positions at release, conserved momentum,
different physical paths after1s, finite/conserved particles and return to the
centre after8s. All10 numerical/topology checks pass. The amount of asymmetry is
a proposal for in-context review; the real-liquid method, donuts and selected
parameters remain retained. Main preview on8787; no deployment requested.

## Release must open the two arcs at different times — 2026-11-06

The artist finds the return still too symmetric around both sides of a seat.
The previous test only checked differing particle trajectories: its sideways
impulse passed while the visible coating disappeared on both sides together.
A density-surface probe at the two lateral rim points now measures the actual
opening times. The previous version differs by0–0.1s in two controlled samples.

A temporary heterogeneous-adhesion trial changed thickness and delayed the whole
return without separating those visible opening times; withdraw that trial.
The new proposal imparts local angular velocity at the released seat, then
supports that circulation with a spatially local, smoothly decaying force for
0.7–1s. The two flanks initially move in opposite directions relative to the
central body. Random direction/strength/duration are sampled once per release,
not per frame. Both the velocity impulse and subsequent force are counterbalanced
over all particles to add no net linear impulse/force. A new target cancels the
remaining circulation. Cursor release retains its prior lateral response.
The renderer still reconstructs only actual density; no outline rotates or
moves along a prescribed pose. Pressure, viscosity, contact, drag, particle
count and held-seat collection settings stay unchanged.

The same samples now open the visible arcs at0.4/1.0s and1.2/0.6s, respectively:
0.6s apart, with the earlier side reversed. The existing180px/s guard remains;
the higher sample adds373 particle/substep clamps to the held-state baseline
in the three-second replay, while the lower adds none. Finite state, conserved
particles and eventual return to the centre pass. Twelve numerical/topology
cases pass across final targeted runs, including visible phase separation and
cancellation on retarget;20 related browser cases, app build, TypeScript and
formatting pass. Synthetic SVG frame sequences were visually inspected.
This is the next release-flow proposal for in-context review on8787, not artistic
acceptance or publication. Donuts, placement and selected settings remain retained.

## Return current website behavior to the tuning experiment — 2026-11-05

The artist requests another settings pass in the existing8796 experiment. Its
live solver still predated integration, so transplant the current website
`CircleFluid` and `DensitySurface` through a local TypeScript-to-JavaScript sync
script, without maintaining a second solver implementation. The experiment's
`sync-from-website.mjs` records source fingerprints in `website-source.json`;
its README describes recovery. Preserve the earlier selected snapshot and
archive the previous live study before replacement.

Wire actual release transitions into the study, preserving the asymmetric
angular impulse/circulation from bc1caf3 and preventing spurious release while
a free cursor moves. Add central selection and explicit Release place/Escape
so the artist can repeatedly inspect holding and return without account flows.
Match desktop visible seat diameters and derive physical radii from the DOM.
Retain the five selected controls and defaults; save values locally and export
JSON through Save settings, alongside the existing vector export. Study tuning
does not silently change website defaults.

A seeded held-seat/release replay yields bit-identical particle positions and
velocities between study and website. Synthetic contour checks and browser
checks for hold/release, live values, reset, persistence, settings export and
mobile finite state pass. This restores the current behavior for artistic
review on8796 (`sand tunnel 8796`); it does not select new settings, change the
main website, or authorize publication.

## Tune release asymmetry and seat wetting — 2026-11-06

The artist requests an asymmetry controller, then clarifies that the outer
coating should not lift off while liquid is still flowing down the seat. Add
independent Release asymmetry and Seat adhesion sliders to the8796 experiment.
Both run0–200%; asymmetry100% preserves the existing release impulse and
circulation, and0% disables that extra motion without changing cursor release.
Its ongoing force responds live. Both controls survive reset/reload and are
included in the settings JSON. Give the new controls explicit accessible labels.

Keep a single generated solver shared with the website. Add a releaseAsymmetry
multiplier (default1) and opt-in seatAdhesion (website default0, study default1).
For wetting, capture only the particles already close to the seat when it is
released. Apply local surface attraction and contact friction to that existing
material; discard a particle's wet attachment once it leaves the contact area.
Scale grip by the real incoming bridge load. Choosing a new target cancels the
old seat field. No contour is pinned, drawn or filled.

An initial all-nearby-particles field held too much material and was withdrawn.
A timed weakening trial still let the outside detach before the upper flow;
withdraw that too. The current captured-material experiment keeps the outer
density sample covered after1s where the no-grip version is already empty.
Strong grip can retain a wet coating/bridge; lower Seat adhesion or choose a
new target to release it. This is a material proposal for review, not settled
acceptance of its remaining coating or integration of grip into website defaults.

Fourteen synthetic numerical/topology cases pass, including zero-effect
equivalence, impulse scaling, live circulation disable, unchanged cursor
release, retained outer contact, conserved finite material and return after
removing grip. Browser checks cover both named sliders, real parameter updates,
reset, reload persistence, wet particles, release, export and mobile layout.
TypeScript and the application build pass. Preview remains8796 through
`sand tunnel 8796`; no publication requested.

## Make the two-flank release observable — 2026-11-06

The artist confirms that asynchronous means the two flanks of one seat, and
reports that the effect still cannot be observed. Replaying the actual study
conditions reveals the missing regression: with16px obstacles and adhesion1,
both flanks remain covered for eight seconds at asymmetry0,1 and2. The earlier
phase test used13px obstacles without wetting. Increasing circulation does not
control the requested visible separation under the live study conditions.

Keep the numerical material and contour reconstruction. Introduce opt-in
releaseSideDelay (seconds; null preserves the website's existing release). In
the experiment, withdraw the circulation-strength interpretation of Async and
set the old rotational multiplier to0. Relax contact wetting from the incoming
neck around the two flanks, giving one flank a later wetting front and loosening
the outer tip last. This changes local attraction/friction on captured real
material, never its positions or rendered outline. Vary the leading flank at
release. The bounded wetting fronts finish, releasing the coating completely.
A new target cancels them immediately. Other selected material settings remain.

Async release now displays0–2 seconds. Save/reset/reload and JSON preserve the
new releaseSideDelay; the JSON also records releaseAsymmetry0. Zero Seat adhesion
disables the delay slider and explains its dependency. Test return resets the
same solver with current controls, collects at the last seat for three physical
seconds, then releases it automatically. Its scheduling follows solver steps,
so a paused browser does not skip the collection phase. No comparison view or
new website content/hosting contract is introduced.

With three-second collection and the actual16px seat, measured visible flank
separation changes from0.2s at zero added delay to0.7s at1s and1.4s at2s in a
controlled replay. Further orientations/signs show0.7–0.9s at1s. The full browser
study also shows one dry flank and one wet flank at the2s setting, using the
actual generated density surface. Physical detachment times need not equal
the imposed wetting-front offset.

Fifteen numerical/topology cases pass, covering the real study radius/grip,
increasing visible separation, reversed leading side, no added rotation, finite
conserved material and complete return to one central contour. TypeScript and
build pass. This corrects the experiment for further artistic review on8796;
website defaults and publication remain separate.

## Normal pointer exit bypassed the seat release — 2026-11-06

The artist still cannot observe the difference and clarifies that they mean
when the mouse leaves the circle. A real pointer-path regression exposes a
separate wiring bug: seat → free-pointer band → outside releases only the
free cursor (radius0). The seat's delayed wetting never starts, or a subsequent
active pointer immediately cancels it. The Test return button skips that band,
so the previous successful demonstration did not exercise the artist's action.

The browser repro fails with releasedTargets[0], no seat wetting and no flank
delay. Add CircleFluid.setTarget to own these transitions. In the experimental
side-delay mode, leaving a seat starts its release before assigning the free
cursor. Ending that cursor preserves the seat's in-progress release. An active
free cursor or different seat no longer cancels the previous seat's bounded
wetting; returning to the same seat replaces it with collection. The study now
uses this method instead of direct target writes. Existing website defaults
and legacy direct-target behavior remain; this is not production integration.

The same continuous mouse path now records the16px seat release, retains its
wetting through the free-pointer band and shows one wet flank/one dry flank
after exit. Sixteen numerical/topology cases pass, including that transition
and complete subsequent draining; website TypeScript and application build
pass. The actual mouse regression is preserved as verify-pointer-exit.mjs in
the documented study directory, alongside verify-surface.mjs. A diagnostic
whole-silhouette frame comparison was inspected without adding another view.

This fixes an observed interaction bug. Whether the resulting motion reads as
the intended liquid remains for the artist's review on8796 (`sand tunnel 8796`).
It supersedes the earlier blanket cancellation of wetting on a new target.

## A lighter material after the corrected mouse exit — 2026-11-06

The artist responds “better” to the corrected normal pointer exit and asks
for less gooey, more liquid motion. Preserve that interaction and the current
seat grip/async tuning; reopen the material's dissipation for review. In the
8796 experiment, lower viscosity61→18 and environmental drag8→3, exposing
Damping as a live control. These are existing solver parameters; no new liquid
geometry, pressure/cohesion changes or website-default changes are introduced.

Apply the requested tuning once on the next browser load, preserving other
controls and backing up the prior saved object. A material-revision marker
keeps subsequent manual tuning intact. Reset, persistence and JSON export
include the new damping control. Archive the previous study HTML and document
recovery in its README, rather than adding a competing-view UI.

Controlled traces retain661 finite particles, settle centrally and reconstruct
one contour for both materials. The lighter trace moves more freely and its
inspected SVG frames shed thin necks earlier. The existing speed guard engages
more often in that trace; this is a material proposal, not a performance claim.
The real continuous-pointer-exit regression and contour/topology checks pass.
Browser checks verify initial18/3, migration/backup, preserved other settings,
live damping, reset/reload, JSON export and mobile layout.
Whether this feels sufficiently liquid remains for the artist's review on8796
(`sand tunnel 8796`); publication and website integration remain separate.
