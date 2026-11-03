# Temple interest flow refinements

Artist decisions from the CTA/Share interview on 2026-11-03. Implement for local
review before deployment. These decisions supersede the historical full-circle,
owner-button and conflict behavior in [the Share handoff](temple-circle-cta-handoff.md).
The shared session and independent Watch/Circle topics from
[ADR 0005](../adr/0005-newsletter-state-on-workers.md) and
[ADR 0006](../adr/0006-local-navigation-and-private-islands.md) remain the boundary.

## Confirmed behavior

- Watch and signed-out Circle use the same closable piece, Name/Email fields,
  loading spinner and sent state. The mobile piece can occupy 90% of the viewport.
  After sending, hide the inputs and display “Awesome, please check your email to
  confirm your interest”. Circle explains “Please log in via your email to join
  us” in dimmed text and uses “Request login email” on its button. Position its
  piece close below the center button.
- The Watch email link opens a separate confirmation piece: bold “Great, this
  worked!” followed by a line break and “I'll notify you when we've created
  something new.” Center the confirmation piece in the viewport after rendering.
  Dismissal returns to an inline switch. Normal signed-in Watch shows that switch,
  without email or subscription
  success copy. Older contacts need no missing-name field to toggle updates.
- Segment membership determines returning visitors. New-interest email subject is
  “Temple of Sound: Confirm your interest” with “Confirm interest”; returning mail
  uses “Temple of Sound: Login” with “Login”. Use the contact name when available,
  otherwise greet with “Hey,”. Keep the expiry and footer. Circle confirmation
  saves the private profile without opting into either topic; only the explicit
  seat claim subscribes Circle. Existing global unsubscribe still requires fresh
  confirmation before restoring delivery.
- Circle confirmation returns to Share and resumes the chosen seat. A conflicting
  seat silently becomes another free seat. Local selection checks the dot and
  changes the center button to “welcome”, retaining its pointer even after closing
  the piece. It does not publish a reservation.
- The alias piece uses “Name or Alias”, with “this name will be visible publicly
  on this website” underneath. Trim and validate 1–20 characters on the server;
  use the same limit in the input. Prefill the contact name without overwriting
  it on rename. Preserve long saved names so the visitor chooses how to shorten
  them before claiming.
- Owners see a pulsing warm border, static under reduced motion, and no center
  button or automatically opened controls. Clicking their seat opens rename and
  release controls without email or welcome copy. Rename shares the input row and
  appears only when the name changes. Release is a reddish ghost button.
- Clicking another empty seat while signed in and holding a seat asks “change
  seat?” with “yes” / “no”. Moves retain reservation identity, alias, subscription
  and original notification; they do not notify Hannes again. Conflicting moves
  silently choose another free seat, or keep the current seat when none is free.
- A full circle offers “Join the waiting list”. After verification and explicit
  alias submission, save private interest and notify Hannes once through the
  durable outbox. Display “The circle is full. You’re on the waiting list.” Do not
  subscribe waiting visitors to Circle or automatically promote them. A later
  explicit claim removes their waiting entry.

## Review and integration

The shared local server uses port 8787 and intercepts provider calls. Its
`/__preview/email` page displays the latest simulated confirmation email; follow
that link to test the full authentication and continuation flow without sending
mail. Use any synthetic address. Production real-mail testing stays with the artist.

The artist completed Resend webhook setup and saved the Production signing
secret before these refinements. The prior deployed implementation is the
baseline; this refinement is a separate local review.

The new UI reuses the existing piece material and private-island lifecycle. No
new CMX component contract or public publication state is needed. Keep fixtures
synthetic and verify website checks with `content/` absent using a temporary copy,
so shared authored work stays available to the other agents.

## Notification switch review

The artist confirmed a setting in an inline piece with a colored slider, rather
than a filled button. Use “You are receiving notifications via email” when on and
“You will not receive notifications” when off. Change the thumb position, track
color and sentence together immediately for ordinary topic changes. Keep sentence
height stable and show no saving spinner for this setting; prevent duplicate
requests and revert with an inline error on failure. The inactive track has no
visible border; retain its keyboard focus indicator. Global email reactivation
still waits for the confirmation email before displaying the subscribed state.
