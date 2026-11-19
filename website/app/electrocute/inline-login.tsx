import { on, ref, type Handle } from 'remix/component'
import { XMarkIcon } from '../heroicons.tsx'
import { readSessionState } from '../identity/client.ts'
import type { SessionState } from '../identity/contract.ts'
import { NewsletterForm } from '../newsletter/form.tsx'

/** Reuse the website login protocol without navigating away from playback. */
export function InlineLogin(handle: Handle<{ close(): void; authenticated(): Promise<void> }>) {
  let state: SessionState = { ready: false }
  let failed = false
  let previewInbox = false
  let panel: HTMLDivElement | undefined

  async function refresh() {
    failed = false
    handle.update()
    try {
      const response = await readSessionState('/login', handle.signal)
      if (!response.ok) throw new Error('Login unavailable')
      const value = (await response.json()) as SessionState
      if (!value.ready || !value.csrfToken) throw new Error('Login unavailable')
      if (handle.signal.aborted) return
      state = value
      previewInbox = response.headers.get('X-Hdm-Preview-Email') === '/__preview/email'
      if (state.email) {
        await handle.props.authenticated()
        return
      }
    } catch {
      if (handle.signal.aborted) return
      failed = true
    }
    await handle.update()
    panel?.querySelector<HTMLInputElement>('input[type=email]')?.focus({ preventScroll: true })
  }

  handle.queueTask(() => void refresh())

  return () => (
    <div
      class="ec-inline-login"
      role="dialog"
      aria-label="Log in to set highlights"
      mix={[
        ref((node) => {
          panel = node
        }),
        on('keydown', (event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          event.stopPropagation()
          handle.props.close()
        }),
      ]}
    >
      <div class="ec-inline-login-header">
        <h2>Log in to set highlights</h2>
        <button
          type="button"
          class="ec-icon-button"
          aria-label="Close login"
          mix={on('click', () => handle.props.close())}
        >
          <XMarkIcon />
        </button>
      </div>
      <div class="ec-inline-login-content">
        {failed ? (
          <>
            <p role="alert">Login is temporarily unavailable. Please try again.</p>
            <button
              type="button"
              mix={on('click', () => void refresh())}
            >
              Retry login
            </button>
          </>
        ) : state.ready ? (
          <NewsletterForm
            state={state}
            refresh={refresh}
          />
        ) : (
          <p role="status">Loading login…</p>
        )}
        {previewInbox && (
          <a
            href="/__preview/email"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open preview inbox
          </a>
        )}
      </div>
    </div>
  )
}
