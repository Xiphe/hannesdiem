# ElectroCute archive and player

Goal and accepted scope: [ElectroCute Ziel](../../../docs/electrocute-goal.md).

The implementation covers the archive, session playback and authenticated public
highlights. The local preview uses the artist-supplied session and runs the same
identity and contribution storage as the application, isolated on this machine.
No artist background text, musical highlights or additional recordings are invented.

## Preview

```sh
npm run dev:electrocute
```

Open `/electrocute` on port 8787. This builds the authored CMX Publication and
uses the isolated preview server without provider credentials or outgoing
provider requests. The browser loads the MP4 directly from pCloud. Login emails
are simulated: request a login, open `/__preview/email`, follow its confirmation
link and return to the session tab. Focus refreshes its authenticated state.
Both stars remain visible while logged out and open the shared email login form
inside the player. The local form links to the simulated preview inbox; after
confirmation, returning to the player opens the selection at the time originally
chosen, even if playback has continued meanwhile.
Contribution and login state persist locally in `.wrangler/state/electrocute-preview`
using Miniflare’s `resourcePersistencePath`; the former `durableObjectsPersist`
option is silently ignored by the installed compatibility converter. A restart
regression exercises the actual session storage and signed cookie.
Visitor submissions remain pending because no remote model is called. The configured
artist account can save directly. `PREVIEW_PORT` can select another port. The
preview copies its own assets before serving them so other builds do not invalidate it.

For the original four synthetic sessions, generated 96-second MP4 and overlapping
test highlights and device-local drafts, run `npm run dev:electrocute -- --synthetic`.
This mode and the website tests need no authored content. The `preview` component
prop explicitly selects local drafts instead of public submissions; authored
content leaves it unset.

## Design

The existing system type and ElectroCute theme are the reference. The dark
palette uses `#020024`, `#022456`, `#ae1ee4` and `#fff8fb`; the light palette uses
`#fff8fb`, `#ffb8e4`, `#fd5ee0` and `#020024`. The site's existing gradient and
logo stay in place. Controls follow the existing feed and form language, including
rounded grouped inputs and quiet overlay surfaces. The seek bar shows tabular time
values on hover or keyboard focus, on a separate vertical level from trim controls.

The archive is a chronological list with a separate Continue entry. The session
detail keeps the video top-aligned and uncropped, with the website footer below
the viewport and the website hamburger hidden. The List Bullet toggle slides in
a right sidebar and shrinks the video and transport together. Its width is capped
at 360px and 42% of the viewport, including on narrow screens. The sidebar stays
open while playback is operated and participates in native fullscreen. Closing it
restores the player's width; reduced motion disables the resize transition.
The transport overlays the image using the existing feed icons.
The artist rejected the detached range form and requested
clipping directly inside the player, following the Twitch-style trimming interaction.

Play, the full-session seek bar and sound sit on one horizontal line. A compact
star button to the left of the clock in the seek popover sets a highlight. Its arrow points to the hovered
time even when the popover is clamped near an edge. The full range hit area above
the visible line continues tracking the pointer and accepts seek clicks right up
to the popover. Entering the popover keeps the chosen time; delayed dismissal
keeps the action reachable. Focus also opens it for keyboard and touch use.
The tooltip's star is pointer-accessible but outside the Tab order; Tab from the
main seek bar goes directly to the separate playhead star beside volume.
The timeline's duplicate highlight markers are outside that Tab sequence too;
the accompanying ordered highlight list supplies keyboard-accessible links.
As it contains a button, its accessible role is a non-modal dialog, rather than a
text-only tooltip. Escape dismisses it
and restores seek focus. Sound keeps the feed's expanding volume capsule without
an additional button hover fill. A second star immediately left of sound starts
a highlight at the current playhead, independently of the hovered time. Its slot
stays in place while editing so the transport does not shift.

The star starts a one-minute selection at the chosen time without seeking or
interrupting playback. The same popover expands to the transport row's width.
When its compact clock is visible, its shell morphs to the editor over 320ms,
with a short content crossfade and a fading point-to-trapezoid handoff. Both
the tooltip star and the separate playhead star use that visible starting shape.
Focus leaving the clock uses the existing short dismissal delay so clicking the
separate star does not hide the source popover before it can expand.
Main Play, seek and sound retain their positions. Both the full-session bar and
the upper passage bar show the same two draggable boundaries. The upper bar
zooms into the selection with a small amount of context on either side so the
ends can be extended as well as shortened. Its playhead follows the actual time
throughout the visible window, including context outside the selected bounds.
Only playback outside that window hides the thumb, with a gray track before the
window and a fully white track after it. Inside the window, the fill ends at the
thumb's centre, accounting for its inset travel. Passage seeking uses continuous
values so the thumb cannot round to steps anchored to the changing zoom window;
the separate trim handles retain source-frame keyboard steps.
Its scale stays fixed during a drag and reframes over approximately one second
after release. A new interaction interrupts that animation; reduced-motion
preferences use an immediate reframe. Lower-bar changes also reframe the upper view.
Frame rounding can place an edge just beyond the visible passage window during
a fast outward drag. That does not reframe the viewport until release; an earlier
out-of-window fallback snapped immediately and consumed the release animation.
Keyboard adjustments on either transport reframe over 250ms, including frame
steps; repeated keys continue from the current zoom instead of snapping it.

The artist selected the quiet time ruler only in the tooltip's passage transport
after trying it together with a selection grid. The grid and the ruler on the
lower full-session transport were removed. Ticks refer to absolute
recording timestamps, so reframing visibly moves the ruler while the chosen bounds
stay fixed. Tick spacing uses hysteresis to keep the same time marks through
ordinary zoom adjustments; labels are sparse and noninteractive. This makes the
change of scale visible after a drag without adding controls or saved data.

Both surfaces share the same trim component and range state. Select a boundary
and use arrows for one-second changes; Shift plus arrows adjusts one source frame
when explicit metadata provides its frame rate. Source frame rates are never
inferred from browser rendering speed. The first pCloud recording is 60 fps.
The rejected minus/plus/bracket controls, their repeat timers and decorative
connection lines are removed. Both trackers use exactly the same selection and
grip styling. The selected boundary is pink, and handles use grab/grabbing cursors
without a hover fill around the handle. Idle grips use a solid gray that occludes
the transport and selection borders; hovering either grip turns it white.
Keyboard focus and pointer-down add a subtle translucent ring around the visible
grip. In pointer mode it disappears on release, even if the grip retains focus.
The pink keyboard ring follows that grip too, leaving its larger hit area
invisible. Captured keyboard/pointer input tracks the current interaction mode
so clicking a previously keyboard-focused control clears its pink ring.
Hit areas extend 24px outward and up to 24px inward, capped
at the selection midpoint so close boundaries do not overlap. A low trapezoid
replaces the editor's tooltip arrow: its bottom matches the lower selection's
width and its sides retain the previous 45-degree angle and 5px height.

Double-click or double-tap either boundary to seek: the left goes to the start;
the right goes five seconds before the end, clamped to the start for shorter
passages. This does not start paused playback or change the selection. Desktop
fine-pointer controls use a compact row and a flatter Save; touch retains larger
targets. The taller selection stays the same on both trackers.

Space toggles video playback throughout a session page, including from focused
controls, without scrolling or also activating a native button. Repeated held
keydown events do not keep toggling. Text inputs, textareas, selects and editable
content retain Space for entry. Passage Play resumes at the current point when
paused inside the selection; when already playing, outside the selection or at
its end it restarts at the beginning. While playing, its icon and accessible
label switch to Replay / Restart passage. Passage playback and seeking activate the
selection's end stop. The main timeline still seeks throughout the recording.

Save advances to naming without persisting. The title/save/cancel form replaces
the passage controls in the same popover and focuses the title. Selection slides
left as naming enters from the right over 280ms; Back reverses that direction.
Outgoing panels are inert and hidden from accessibility while they leave, then
removed. A new stage or cancellation aborts the old motion. Reduced-motion
preferences skip these transitions. The title input keeps its borderless
appearance when focused or typed into; its caret indicates focus. A left-hand Back
icon returns to the selection, preserving title, bounds and stable ID. X or
Escape cancels either step and restores main seek focus. Failed saves retain the
naming form. The public name is never requested in the clipping UI.

Save has a consistent neutral hover in both steps. Back and X use centered SVG
icons with 44px hit targets. The collapsed clock/star popover is explicitly one
non-wrapping row with intrinsic width; measuring that width preserves its arrow
placement for long clocks and near either edge of the seek bar.

The feed remains the control reference: a circular central play button,
fullscreen in the upper right and vertical hover/focus volume treatment. Touch
devices retain sound toggling and use their system volume controls. There are no
highlight thumbnails or decorative introductory text.

## Data and navigation

`ElectroCuteArchive` is an ordinary CMX content component. Its contract contains
sessions and authored public highlights. `sessionDocument` uses CMX's document
reducer to select a session from the same Publication snapshot without mutating
the source. `/electrocute/:id` resolves through the archive document, so it needs
no separate authored page for each session.

Remix frame navigation deliberately preserves matching client entries. A
server-side `data-rmx-key` around the client boundary distinguishes the archive
and each session. This disposes the outgoing player and flushes progress when a
link changes the session. A key inside the client entry cannot replace that
outer lifecycle boundary.

Playback loads only the selected MP4. The hydrated player supplies inline playback,
seek, sound, volume and fullscreen controls; native controls remain the fallback
without JavaScript. Fullscreen includes the trim UI.
Each device stores per-session positions and the most recently heard unfinished
session. A direct highlight link takes precedence over stored progress. Missing
or unavailable device storage does not prevent playback, and an unsuccessful
draft save leaves the form open. Page-lifetime listeners use `handle.signal`:
`queueTask`'s signal ends at the next render and cannot own focus or exit listeners.

## Public contributions

`/electrocute-api/:session` is an uncached runtime island separate from CMX HTML.
It uses the existing verified session, bounded form parser, origin and CSRF
middleware. The Worker resolves the session and its duration from the current
Publication; roles, author identity and duration never come from the submitted
payload. The server-side `ELECTROCUTE_ARTIST_EMAIL` setting identifies the artist.
Public results contain only public names and highlight fields, never login emails.

`ElectroCuteState` stores individual highlights and confirmed profile aliases in
SQLite-backed Durable Object KV storage. Owners edit or withdraw their own
highlights; the artist edits or hides any highlight. Withdrawal and artist hiding
are separate reversible flags. A creator cannot reverse an artist hide, and an
artist restore respects a creator's withdrawal. IDs stay stable across edits;
revision checks prevent silent overwrites from stale editors. Text-check results
also compare that revision, so an old inference cannot undo a correction or hide.

The public-name record is independent of Circle membership and private Resend
contact names. A separate collapsed Public profile section outside the player
allows explicit confirmation or update of the name, suggesting an active Circle
alias without claiming a place or changing subscriptions. New profiles without a
chosen name display as Listener. All highlights resolve their owner's current
profile at read time: name changes apply across sessions without rewriting ranges,
titles, IDs or revisions. No public-name snapshot is written to a new highlight;
submitted names on highlight writes are ignored, including artist corrections.
Approved legacy snapshots seed a missing profile once and are removed on access;
an existing profile always wins over an old snapshot. Profile updates pass the
text check independently and retain the previous name on rejection or outage.
A dedicated account page and avatars remain outside this change.

The small agentic check uses Workers AI with
[`llama-3.3-70b-instruct-fp8-fast`](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/).
Only title and public alias are sent. It checks directed abuse, threats and illegal
solicitation, allowing artistic language and ordinary profanity. Separate strict
boolean JSON decisions for title and alias are required. Parsed JSON objects,
JSON text and completion envelopes are normalized at the provider boundary. Rejection stays editable and private; outages, timeouts
and malformed responses stay pending and retry through a Durable Object alarm.
Artist contributions and corrections publish directly. Visitor text changes are
checked again; range-only changes reuse the previous text decision.

`npm run dev` and browser tests use Wrangler's `local` environment, intentionally
without an AI binding. Its storage bindings and vars are repeated because Wrangler
does not inherit them into named environments. Production has the AI binding. No deployment was performed. The production
policy and parser were exercised against the real model with synthetic texts:
all eight final examples passed (neutral English/German, enthusiastic profanity,
directed insult, threat, illegal offer, instruction injection and abusive alias).
The smaller initial model confused alias checks and harmless profanity, which
motivated the model choice. The final requests took 0.64–0.84 seconds each.
This sample establishes basic behavior, not exhaustive moderation accuracy.
The feed expansion remains a later milestone.

CMX provides the content contract, document traversal and rendering. Its installed
UGC verifier constrains markup elements and props; its document store commits
Publication updates. Neither supplies mutable visitor ranges, shared profile state,
listening progress or semantic text moderation. The previously surfaced CMX gap
therefore remains at this runtime boundary; these features use the existing
identity machinery and a separate mutable service rather than changing Publications.

The artist supplied session XLV from 23 April 2023, named `outside to ovations`,
for the first real playback verification. It is a 47:51.1 MP4 with H.264 1280×720
video and stereo AAC at 48 kHz. Filename metadata follows
`yymmdd_electrocute_RomanNumber_session_name`; the authored entry preserves the
Roman number and supplied wording. It has no invented musical highlights.

Real-source operational QA passed in Chromium on desktop and with a 390px touch
viewport. Previews played 00:30–00:33 and 45:00–45:03 on desktop and 20:00–20:03 in
touch emulation, stopped at the requested endpoints and decoded both video and
audio without media errors. The source responded with HTTP 206; the combined
checks received about 32.5 MB rather than downloading the complete 1.63 GB file.
Physical mobile playback, Safari, subjective audio quality and endurance remain
to be checked. Cover selection remains part of the separate image work.

The synthetic suite tests Range-capable MP4 delivery, session navigation, local
progress, range editing (mouse, real browser touch events and keyboard), preview stopping,
optional-storage failures, alias
confirmation, publication states and stable links. Service and Workers runtime
checks cover authorization, CSRF/origin rejection, server-resolved duration,
concurrent moderation, retries and reversible hiding. The existing Circle and
newsletter runtime suites also pass. They never read authored content or production
media. Operational QA additionally confirmed the simulated email-login round trip,
artist rights and editor on the actual pCloud session, without saving fake highlights.

The website gate passed in an isolated copy without `content/` or a generated
Publication, retaining only the app asset manifest and CMX environment needed by
the normal website checks. The local preview and real-source artifacts are
operational evidence rather than automated content regression fixtures.
