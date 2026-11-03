import { on, ref, type Handle } from 'remix/component'
import { NotificationSwitch } from './notification-switch.tsx'
import { PiecePanel, LoadingSpinner } from '../temple/piece-tooltip/panel.tsx'
import {
  templeMessages,
  templeNewsletterPath,
  type TempleNewsletterState,
  type TempleNewsletterResult,
} from './contract.ts'

export interface TempleSignupProps {
  id?: string
  label?: string
  expanded?: boolean
  floating?: boolean
  state?: TempleNewsletterState
  result?: TempleNewsletterResult
  nameValue?: string
  emailValue?: string
}

// Give the standalone page its own hydration boundary; the embedded form belongs
// to Opening's island and must not be registered as a second client entry.
export function StandaloneTempleSignup(handle: Handle<TempleSignupProps>) {
  return () => (
    <TempleSignup
      {...handle.props}
      floating={false}
    />
  )
}

/** Public HTML stays anonymous; this component loads private state separately. */
export function TempleSignup(handle: Handle<TempleSignupProps>) {
  let state = handle.props.state ?? { ready: false }
  let expanded = handle.props.expanded ?? false
  let confirmed = false
  let result = handle.props.result
  let awaitingConfirmation = result?.confirmationPending ?? false
  let name = handle.props.nameValue ?? state.name ?? ''
  let email = handle.props.emailValue ?? state.email ?? ''
  let pending = false
  let optimisticSubscription: boolean | undefined
  let cooldown =
    result?.type === 'spam_protection'
      ? result.remainingSeconds
      : result?.confirmationPending
        ? 120
        : 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let request: AbortController | undefined
  let root: HTMLDivElement | undefined

  function scheduleRetry(seconds: number) {
    clearTimeout(retryTimer)
    cooldown = seconds
    retryTimer = setTimeout(() => {
      cooldown = 0
      void handle.update()
    }, seconds * 1000)
  }

  async function refresh() {
    if (pending || handle.signal.aborted) return
    request?.abort()
    const controller = new AbortController()
    request = controller
    let centerConfirmation = false
    try {
      const response = await fetch(templeNewsletterPath, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        mode: 'same-origin',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('Subscription state unavailable')
      const value = (await response.json()) as TempleNewsletterState
      if (
        !value.ready ||
        typeof value.csrfToken !== 'string' ||
        (value.email !== undefined && typeof value.email !== 'string')
      )
        throw new Error('Invalid subscription state')
      state = value
      if (value.name) name = value.name
      if (value.email) {
        email = value.email
      }
      if (value.email && value.subscribed && !value.unsubscribed && awaitingConfirmation) {
        result = undefined
        awaitingConfirmation = false
        expanded = false
        clearTimeout(retryTimer)
        cooldown = 0
      }
      const url = new URL(location.href)
      const notice = url.searchParams.get('newsletter')
      if (notice) {
        expanded = true

        if (notice === 'confirmed' && value.email && value.subscribed && !value.unsubscribed) {
          confirmed = true
          centerConfirmation = true
        } else if (notice !== 'confirmed')
          result = {
            type: 'error',
            message:
              notice === 'invalid_token'
                ? 'The confirmation link has expired or is invalid. Please try again.'
                : templeMessages.failure,
          }
        url.searchParams.delete('newsletter')
        history.replaceState(history.state, '', url)
      }
    } catch {
      if (controller.signal.aborted) return
      state = { ready: false }
      result = { type: 'error', message: templeMessages.failure }
    } finally {
      if (request === controller) request = undefined
      if (!handle.signal.aborted) {
        await handle.update()
        if (centerConfirmation) {
          await document.fonts.ready
          if (!handle.signal.aborted)
            root?.querySelector<HTMLElement>('[role="dialog"]')?.scrollIntoView({
              block: 'center',
              behavior: 'instant',
            })
        }
      }
    }
  }

  handle.queueTask(() => {
    if (!handle.props.state) void refresh()
    if (cooldown) scheduleRetry(cooldown)
    window.addEventListener(
      'focus',
      () => {
        void refresh()
      },
      { signal: handle.signal },
    )
    window.addEventListener(
      'pageshow',
      (event) => {
        if (event.persisted) void refresh()
      },
      { signal: handle.signal },
    )
    handle.signal.addEventListener(
      'abort',
      () => {
        request?.abort()
        clearTimeout(retryTimer)
      },
      { once: true },
    )
  })

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (pending || cooldown || !state.ready) return
    request?.abort()
    const form = event.currentTarget as HTMLFormElement
    const body = new FormData(form, event.submitter)
    name = String(body.get('name') ?? name)
    email = String(body.get('email') ?? email)
    pending = true
    result = undefined
    if (state.email && !state.unsubscribed)
      optimisticSubscription = body.get('intent') === 'subscribe'
    void handle.update()
    try {
      const response = await fetch(templeNewsletterPath, {
        method: 'POST',
        body,
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        mode: 'same-origin',
        signal: handle.signal,
      })
      const value = (await response.json()) as TempleNewsletterResult
      if (
        !['success', 'error', 'spam_protection'].includes(value.type) ||
        typeof value.message !== 'string'
      )
        throw new Error('Invalid signup response')
      result = value
      awaitingConfirmation = value.confirmationPending ?? false
      if (awaitingConfirmation) expanded = true
      if (value.csrfToken) state = { ...state, csrfToken: value.csrfToken }
      if (value.state) state = value.state
      if (value.type === 'spam_protection') scheduleRetry(value.remainingSeconds)
      else if (value.type === 'success' && !value.state) scheduleRetry(120)
    } catch {
      if (handle.signal.aborted) return
      result = { type: 'error', message: templeMessages.failure }
    } finally {
      if (!handle.signal.aborted) {
        pending = false
        optimisticSubscription = undefined
        void handle.update()
      }
    }
  }

  async function close() {
    name = root?.querySelector<HTMLInputElement>('input[name="name"]')?.value ?? name
    email = root?.querySelector<HTMLInputElement>('input[name="email"]')?.value ?? email
    confirmed = false
    expanded = false
    await handle.update()
    root?.querySelector<HTMLElement>('a, input[role="switch"]')?.focus({ preventScroll: true })
  }

  return () => {
    const subscribed = optimisticSubscription ?? Boolean(state.subscribed && !state.unsubscribed)
    const disabled = !state.ready || pending || cooldown > 0
    const floating = handle.props.floating !== false
    const inline = Boolean(state.email && !awaitingConfirmation && !confirmed && !expanded)
    const panelId = `${handle.props.id ?? 'temple-newsletter-signup'}-panel`
    return (
      <div
        class="temple-signup"
        aria-busy={pending}
        data-floating={floating ? '' : undefined}
        mix={ref((node) => {
          root = node
        })}
      >
        {inline && (
          <form
            method="post"
            action={templeNewsletterPath}
            mix={on<HTMLFormElement, 'submit'>('submit', submit)}
          >
            <input
              type="hidden"
              name="_csrf"
              value={state.csrfToken ?? ''}
            />
            <NotificationSwitch
              checked={subscribed}
              disabled={disabled}
              pending={pending}
            />
            {state.unsubscribed && (
              <p class="temple-signup-reactivation">{templeMessages.reactivation}</p>
            )}
            {result?.type === 'error' && <p role="alert">{result.message}</p>}
          </form>
        )}
        {!inline && (floating || !expanded) && (
          <a
            key="trigger"
            href={templeNewsletterPath}
            aria-expanded={expanded}
            aria-controls={expanded ? panelId : undefined}
            aria-hidden={expanded ? true : undefined}
            tabIndex={expanded ? -1 : undefined}
            mix={on('click', async (event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return
              event.preventDefault()
              expanded = true
              await handle.update()
              root
                ?.querySelector<HTMLInputElement>('input:not([type="hidden"]):not(:disabled)')
                ?.focus()
            })}
          >
            {handle.props.label ?? 'get notified'}
          </a>
        )}
        {expanded && (
          <PiecePanel
            id={handle.props.id ?? 'temple-newsletter-signup'}
            label="Temple of Sound updates"
            close={close}
          >
            {!awaitingConfirmation && !confirmed && (
              <form
                method="post"
                action={templeNewsletterPath}
                mix={on<HTMLFormElement, 'submit'>('submit', submit)}
              >
                <input
                  type="hidden"
                  name="_csrf"
                  value={state.csrfToken ?? ''}
                />
                {!state.email && (
                  <label>
                    Name
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={120}
                      defaultValue={name}
                      disabled={!state.ready || pending}
                    />
                  </label>
                )}
                {!state.email && (
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      defaultValue={email}
                      disabled={!state.ready || pending}
                    />
                  </label>
                )}
                {state.unsubscribed && (
                  <p class="temple-signup-reactivation">{templeMessages.reactivation}</p>
                )}
                {state.email ? (
                  <NotificationSwitch
                    checked={subscribed}
                    disabled={disabled}
                    pending={pending}
                  />
                ) : (
                  <button
                    type="submit"
                    name="intent"
                    value="subscribe"
                    disabled={disabled}
                  >
                    {pending && LoadingSpinner()}
                    {handle.props.label ?? 'get notified'}
                  </button>
                )}
              </form>
            )}
            {confirmed && (
              <p
                class="temple-signup-feedback"
                role="status"
              >
                <strong>{templeMessages.confirmed}</strong>
                <br />
                {templeMessages.confirmedDetail}
              </p>
            )}
            {!confirmed && result && (
              <p
                class="temple-signup-feedback"
                role={result.type === 'error' ? 'alert' : 'status'}
              >
                {result.message}
              </p>
            )}
            {!state.ready && !request && (
              <button
                type="button"
                mix={on('click', () => {
                  void refresh()
                })}
              >
                Retry
              </button>
            )}
          </PiecePanel>
        )}
      </div>
    )
  }
}
