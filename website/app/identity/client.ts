import { csrfRejectionHeader, type SessionState } from './contract.ts'

// Shared by the browser's private islands; public CMX HTML remains anonymous.
let startup: Promise<void> | undefined

function fetchState(path: string, signal: AbortSignal) {
  return fetch(path, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    mode: 'same-origin',
    signal,
  })
}

/** Let the first state response establish the cookie before other islands read it. */
export async function readSessionState(path: string, signal: AbortSignal): Promise<Response> {
  signal.throwIfAborted()
  if (startup) {
    await startup
    signal.throwIfAborted()
    return fetchState(path, signal)
  }
  // Startup belongs to the page, so one disposed island cannot abort everybody's
  // cookie creation. Bound the shared request and honor each caller afterward.
  const timeout = AbortSignal.timeout(10_000)
  const request = globalThis.navigator?.locks
    ? navigator.locks.request('hannesdiem-session-startup', { signal: timeout }, () =>
        fetchState(path, timeout),
      )
    : fetchState(path, timeout)
  startup = request
    .then((response) => {
      if (!response.ok) throw new Error('Session startup unavailable')
    })
    .catch((error) => {
      startup = undefined
      throw error
    })
  await startup
  signal.throwIfAborted()
  return request
}

export class SessionChangedError extends Error {}

/** Replay only a token rejection issued before the server ran the form action. */
export async function submitSessionForm(
  path: string,
  body: FormData,
  signal: AbortSignal,
  identity: string | undefined,
): Promise<Response> {
  const send = () =>
    fetch(path, {
      method: 'POST',
      body,
      signal,
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      mode: 'same-origin',
    })
  const response = await send()
  const reason = response.headers.get(csrfRejectionHeader)
  if (response.status !== 403 || !['missing-token', 'invalid-token'].includes(reason ?? ''))
    return response
  await response.body?.cancel()
  const refreshed = await readSessionState('/login', signal)
  if (!refreshed.ok) throw new Error('Session refresh unavailable')
  const state = (await refreshed.json()) as SessionState
  if (
    !state.ready ||
    typeof state.csrfToken !== 'string' ||
    !state.csrfToken ||
    (state.email !== undefined && typeof state.email !== 'string')
  )
    throw new Error('Invalid refreshed session')
  // A delayed unsubscribe, seat claim or release must not act as another user.
  if (state.email !== identity) throw new SessionChangedError()
  body.set('_csrf', state.csrfToken)
  return send()
}
