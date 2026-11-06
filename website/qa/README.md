# Separate deployment from QA

Deployments run formatting, types, the app build, fast synthetic tests, CMS
compatibility, and HTTP health checks. Browser QA is a separate responsibility.

## Running-site QA

Against the existing dev server, without rebuilding or replacing it:

```sh
npm run test:qa -- --url http://127.0.0.1:8787
```

Against production:

```sh
npm run test:qa -- --url https://hannesdiem.de
```

Install the browser once with `npx playwright install --with-deps --only-shell
chromium`. QA checks desktop/mobile rendering, navigation, Temple hydration,
same-origin code/style/font loading, displayed images, and 404 handling. It uses
application structure and behavior, not authored wording or fixed media fixtures.
It requires a running instance with published content. Local dev can use its
injected content source; QA does not require the production Durable Object's
`/_cmx/status` readiness signal.

Add `--auth` to prove real email delivery, magic-link login, session persistence,
and logout. Without it, the reported scope is explicitly anonymous. Authentication
is never silently skipped when requested. No Circle claims, subscription toggles,
or provider-failure scenarios run against production. General login itself creates
or updates a real contact and adds its newsletter segment memberships.

One inbox runs one authenticated QA at a time across all targets. Use the deploy
skill's local coordination file and active chats to avoid duplicate runs. Email
links are matched to the recipient, request time, and target origin. Traces,
screenshots, and video are disabled for running-site QA so real tokens and sessions
stay out of artifacts.

### Gmail access

Use a dedicated Gmail account with OAuth permission
`https://www.googleapis.com/auth/gmail.readonly`. This permits reading mail, not
sending or changing it; Google grants it for the whole mailbox, not one label or
sender. The runner makes only read requests to Gmail and never marks or deletes
messages. A Google account password, production Resend key, or Cloudflare token is
not needed by QA.

Create a Google Cloud OAuth client with the Gmail API enabled and authorize only
that scope with offline access. Keep the OAuth app out of Google's **Testing**
publishing state for ongoing use: those refresh tokens otherwise expire after
seven days. See Google's [desktop OAuth flow](https://developers.google.com/identity/protocols/oauth2/native-app),
[Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), and
[refresh token expiry](https://developers.google.com/identity/protocols/oauth2/#expiration).

Store a **single-line JSON object** in gopass at
`projects/hannesdiem/qa/gmail`, with these fields:

```json
{
  "email": "dedicated-inbox@example.test",
  "name": "Website QA",
  "client_id": "<OAuth client ID>",
  "client_secret": "<OAuth client secret>",
  "refresh_token": "<refresh token for gmail.readonly>"
}
```

Run without printing or copying credentials into shell arguments:

```sh
QA_GMAIL_GOPASS_ENTRY=projects/hannesdiem/qa/gmail npm run test:qa -- --url https://hannesdiem.de --auth
```

CI reads the same JSON from the Production environment secret
`QA_GMAIL_CREDENTIALS`. Local authenticated testing also requires the dev Worker
to have its newsletter session secret, Resend configuration, and state binding
configured. Its emails point back to that local origin and are opened by the test
browser on the same machine.

## Synthetic regression suite

```sh
npm run test:synthetic
```

This runs content tests, every website Node test, and the complete fixture browser
suite. It covers controlled content, errors, edge states, timings, subscriptions,
and reservations independently of authored content. Run `npm run build:app` first.
Its server uses port **8790**, leaving shared dev port 8787 alone; override with
`PLAYWRIGHT_PORT` if necessary. Browser concurrency is capped at two workers to
limit contention in the shared workspace. The website suite alone remains runnable with
`content/` absent via `npm run test:website`.

Node tests requiring browsers, runtime processes, or lengthy simulations have the
suffix `.slow.test.ts`; `npm run test:fast` excludes them. All Node tests remain in
the complete website suite.

## CI

The **Tests** workflow is manual and independent of deployment. Select `qa` and a
URL (default: Production `SITE_URL`), optionally enabling real login, or select
`synthetic`. A CI runner must be able to reach the target; a local server needs a
reachable URL or a runner on its machine. Running-site QA does not deploy anything.
