# Newsletter flows

The sidebar and standalone `/login`, Temple Watch and Circle verification all
start with email only. Each endpoint looks up the private Resend profile: a saved
name sends the existing confirmation/login link immediately; a missing or blank
name returns `nameRequired` and reveals the required name field. Validation and
delivery errors retain the second step and entered values, including native
forms without JavaScript. Changing the email resets the browser's name step.
Provider lookup errors remain retryable errors and never count as missing names.

New names travel in the existing one-use token and are written only after email
verification. Existing names are never replaced by anonymous login submissions
or returned in anonymous HTML/JSON. Existing general-login tokens without a name
remain valid, and signed-in legacy contacts can still manage their preferences.
Names supplied through `/login` fill missing profiles and keep its two existing
segments; Temple and Circle retain their separate subscription rules.

Temple's Watch action uses `newsletter: 'temple'` in the CMX fact contract and a
private `/newsletter/temple` form endpoint. Public CMX HTML contains no session or
subscription state. These flows reuse the existing Remix session, CSRF middleware,
Resend transport and Workers Durable Object; no provider SDK or parallel auth store.

The shared [identity module](../identity/README.md) owns browser startup and the
session/CSRF middleware used by these flows. Newsletter supplies the existing
storage adapter, configuration, rejection wording and diagnostic reporter.

Private browser state requests share the first response before starting further
reads, so Watch, Circle and the sidebar cannot create competing anonymous session
cookies. Startup uses the browser's Web Locks API to coordinate other tabs where
available; the shared promise still coordinates islands when locks are unavailable.
One island's cancellation does not cancel the page's bounded startup request.

Remix's CSRF rejection hook returns `X-Hdm-Csrf-Rejected` and a JSON error for
enhanced forms. Only a missing/invalid token rejection permits one replay: reload
`/login` state, verify the authenticated identity is unchanged, replace `_csrf`,
and resubmit the original fields and submitter intent. An identity change refreshes
the owning form instead. Origin rejection, unmarked 403s, provider errors, network
failures and a second rejection never trigger another submission. Native forms
retain their existing rejection responses and CSRF enforcement.

Server diagnostics use `newsletter_failure` with route path, method, stage and
the middleware's rejection reason. Confirmation delivery and verification catches
also record their stage. No form values, email addresses, names, cookies, query
strings, token values or raw errors are added to these logs. Browser network errors
remain local; this adds no client telemetry endpoint.

New Temple profiles require a name after the email lookup. Its one-hour,
one-use token stores a new trimmed name, email and Temple intent server-side.
Older general-login tokens still work.
Only confirmation adds an anonymous contact to the segment and topic in
`temple-config.ts`. Names are stored verbatim in Resend's `first_name` field,
without guessing how to split a person's name. The artist supplies the Temple
email wording in `resend.ts`; keep that text unchanged unless requested.

For an authenticated contact, the inline switch changes only the Temple topic.
Turning it off preserves segment membership, other topics and global delivery
status. Global unsubscribes always require a fresh confirmation before delivery
is restored, including for authenticated visitors. The reactivation notice is
shown inline and included in that person's email. Confirmation returns to Watch;
an original tab refreshes its private state when it regains focus. Native forms
remain available at `/newsletter/temple` without JavaScript.

The embedded form belongs to the Opening island. The standalone page registers a
separate wrapper as its client entry: Remix's `clientEntry` decorates its function,
so registering the embedded component itself would give it two hydration owners.

## Provider contract and deployment

- Segment: `38f5bf95-30c9-4aac-aeb3-db79f71baf03`.
- Topic: `305223dd-b22b-46e2-a6c7-f2366d846440`.
- [Topic defaults](https://resend.com/docs/dashboard/contacts/manage-topics): the
  Temple topic must default to **opt_out**, so an explicit subscription is needed.
  The default is immutable after topic creation. Deployment's existing read-only
  newsletter check now verifies the Temple segment and that topic configuration.
- [Contact topics](https://resend.com/docs/api-reference/contacts/update-contact-topics):
  PATCH `/contacts/{email}/topics` receives a **bare array**, matching Resend's
  official Node SDK and cURL example. The endpoint documentation's parameter
  grouping can look like a `{ topics: [...] }` wrapper; do not send that wrapper.
- Temple broadcasts must specify both the segment and topic. Topic preferences do
  not restrict broadcasts sent without a topic. Global unsubscribe takes priority.

The user declined credential access. No live topic configuration, provider write,
or email delivery was verified during this implementation. Tests use synthetic
contacts and intercepted provider requests only; deployment has not been requested.
