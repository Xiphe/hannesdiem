import { on, ref, type Handle } from 'remix/component'
export { StandaloneTempleSignup } from './temple-form.tsx'
import type { NewsletterState, NewsletterResult } from './contract.ts'
import { readSessionState, submitSessionForm, SessionChangedError } from './session-client.ts'
import {
  BellIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  UserIcon,
  ArrowRightStartOnRectangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '../heroicons.tsx'

export interface NewsletterFormProps {
  state: NewsletterState
  signup?: boolean
  result?: NewsletterResult
  emailValue?: string
  nameValue?: string
}

function NewsletterIcon(
  handle: Handle<{ name: 'bell' | 'calendar' | 'email' | 'user' | 'logout' }>,
) {
  return () => {
    const Icon = {
      bell: BellIcon,
      calendar: CalendarDaysIcon,
      email: EnvelopeIcon,
      user: UserIcon,
      logout: ArrowRightStartOnRectangleIcon,
    }[handle.props.name]
    return (
      <Icon
        class="newsletter-icon"
        aria-hidden="true"
      />
    )
  }
}

function NewsletterFeedback(
  handle: Handle<{ result: NewsletterResult; remainingSeconds?: number }>,
) {
  return () => {
    const { result, remainingSeconds } = handle.props
    return (
      <div
        class={`newsletter-feedback newsletter-feedback-${result.type}`}
        role={result.type === 'error' ? 'alert' : 'status'}
      >
        {result.type === 'success' ? (
          <CheckCircleIcon
            class="newsletter-status-icon"
            aria-hidden="true"
          />
        ) : result.type === 'error' ? (
          <XCircleIcon
            class="newsletter-status-icon"
            aria-hidden="true"
          />
        ) : (
          <InformationCircleIcon
            class="newsletter-status-icon"
            aria-hidden="true"
          />
        )}
        <span>
          {result.type === 'spam_protection' && remainingSeconds !== undefined ? (
            <>
              Please wait <span class="newsletter-countdown">{remainingSeconds}s</span> before
              requesting another login token
            </>
          ) : (
            result.message
          )}
        </span>
      </div>
    )
  }
}

async function readResult(response: Response): Promise<NewsletterResult> {
  const result = (await response.json()) as NewsletterResult
  if (
    !['success', 'error', 'spam_protection'].includes(result.type) ||
    typeof result.message !== 'string'
  ) {
    throw new Error('Invalid newsletter response')
  }
  return result
}

async function readNewsletterState(signal: AbortSignal): Promise<NewsletterState> {
  const response = await readSessionState('/login', signal)
  if (!response.ok) throw new Error('Newsletter session unavailable')
  const state = (await response.json()) as NewsletterState
  if (
    !state ||
    typeof state.ready !== 'boolean' ||
    (state.email !== undefined && typeof state.email !== 'string') ||
    (state.csrfToken !== undefined && typeof state.csrfToken !== 'string') ||
    (state.ready && !state.csrfToken)
  )
    throw new Error('Invalid newsletter session')
  return state
}

function NewsletterForm(handle: Handle<NewsletterFormProps & { refresh?: () => Promise<void> }>) {
  let result = handle.props.result
  let emailValue = handle.props.emailValue ?? ''
  let nameValue = handle.props.nameValue ?? ''
  let nameRequired = result?.nameRequired ?? false
  let formElement: HTMLFormElement | undefined
  let csrfToken = handle.props.state.csrfToken ?? ''
  let pending = false
  let remainingSeconds = result?.type === 'spam_protection' ? result.remainingSeconds : 0
  let timer: ReturnType<typeof setInterval> | undefined

  function startCountdown() {
    if (timer) clearInterval(timer)
    if (remainingSeconds <= 0) return
    const deadline = Date.now() + remainingSeconds * 1000
    timer = setInterval(() => {
      remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      if (remainingSeconds === 0 && timer) clearInterval(timer)
      void handle.update()
    }, 1000)
  }
  handle.queueTask(startCountdown)
  handle.signal.addEventListener(
    'abort',
    () => {
      if (timer) clearInterval(timer)
    },
    { once: true },
  )

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (pending || remainingSeconds > 0 || !handle.props.state.ready) return
    const form = event.currentTarget as HTMLFormElement
    const body = new FormData(form)
    emailValue = String(body.get('email') ?? '')
    nameValue = String(body.get('name') ?? nameValue)
    pending = true
    void handle.update()
    try {
      result = await readResult(
        await submitSessionForm(form.action, body, handle.signal, handle.props.state.email),
      )
      nameRequired = result.nameRequired ?? (result.type === 'success' ? false : nameRequired)
      csrfToken = result.csrfToken ?? csrfToken
      remainingSeconds = result.type === 'spam_protection' ? result.remainingSeconds : 0
      startCountdown()
    } catch (error) {
      if (handle.signal.aborted) return
      result = { type: 'error', message: 'Something went wrong. Please try again.' }
      if (error instanceof SessionChangedError) {
        if (handle.props.refresh) await handle.props.refresh()
        else location.reload()
      }
    } finally {
      if (!handle.signal.aborted) {
        pending = false
        await handle.update()
        if (result?.nameRequired)
          formElement?.querySelector<HTMLInputElement>('[name="name"]')?.focus()
      }
    }
  }

  return () => {
    const { state, signup } = handle.props
    const disabled = !state.ready || pending || remainingSeconds > 0
    return (
      <form
        class="newsletter-form"
        method="post"
        action="/login"
        aria-busy={pending}
        mix={[
          on<HTMLFormElement, 'submit'>('submit', submit),
          ref((node) => {
            formElement = node
          }),
        ]}
      >
        <input
          type="hidden"
          name="_csrf"
          value={csrfToken}
        />
        {signup && !result && (
          <ul>
            <li>
              <NewsletterIcon name="bell" />
              Receive updates about new releases
            </li>
            <li>
              <NewsletterIcon name="calendar" />
              Get invited to my events and workshops
            </li>
          </ul>
        )}
        {(result?.type !== 'success' || nameRequired) && (
          <>
            <label
              class="sr-only"
              htmlFor={signup ? 'newsletter-email' : 'login-email'}
            >
              Email address
            </label>
            <div
              class="newsletter-controls"
              data-name-required={nameRequired ? '' : undefined}
            >
              <input
                id={signup ? 'newsletter-email' : 'login-email'}
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                disabled={disabled}
                defaultValue={emailValue}
                mix={on<HTMLInputElement, 'input'>('input', (event) => {
                  emailValue = event.currentTarget.value
                  if (nameRequired) {
                    nameRequired = false
                    nameValue = ''
                    result = undefined
                    void handle.update()
                  }
                })}
                placeholder={
                  signup ? 'Enter your email for updates...' : 'Enter your email address'
                }
              />
              {nameRequired && (
                <>
                  <label
                    class="sr-only"
                    htmlFor={signup ? 'newsletter-name' : 'login-name'}
                  >
                    Name
                  </label>
                  <input
                    id={signup ? 'newsletter-name' : 'login-name'}
                    name="name"
                    placeholder="Name"
                    autoComplete="name"
                    required
                    maxLength={120}
                    defaultValue={nameValue}
                    disabled={disabled}
                  />
                </>
              )}
              <button
                type="submit"
                disabled={disabled}
                aria-label={pending ? 'Sending login link' : undefined}
              >
                {pending ? (
                  <span
                    class="newsletter-spinner"
                    aria-hidden="true"
                  />
                ) : (
                  <>
                    {signup && <NewsletterIcon name="email" />}
                    {signup ? 'Signup' : 'Get Login Link'}
                  </>
                )}
              </button>
            </div>
          </>
        )}
        {result && (result.type !== 'spam_protection' || remainingSeconds > 0) && (
          <NewsletterFeedback
            result={result}
            remainingSeconds={remainingSeconds}
          />
        )}
        {!state.ready && (
          <p
            class="newsletter-feedback"
            role="status"
          >
            Newsletter signup is temporarily unavailable. Please try again later.
          </p>
        )}
      </form>
    )
  }
}

// Keep the standalone entry separate: clientEntry adds metadata to its function.
export function StandaloneNewsletterForm(handle: Handle<NewsletterFormProps>) {
  return NewsletterForm(handle)
}

export function NewsletterArea(handle: Handle<{ state: NewsletterState; lazy?: boolean }>) {
  let state = handle.props.state
  let section: HTMLElement | undefined
  let loaded = !handle.props.lazy
  let stateRequest: AbortController | undefined
  let loadError = false
  let pending = false
  let notice: NewsletterResult | undefined

  async function loadState() {
    if (stateRequest || pending || handle.signal.aborted) return
    const controller = new AbortController()
    stateRequest = controller
    loadError = false
    if (!state.ready) loaded = false
    void handle.update()
    try {
      state = await readNewsletterState(AbortSignal.any([handle.signal, controller.signal]))
      loaded = true
      loadError = !state.ready
    } catch {
      if (handle.signal.aborted || controller.signal.aborted) return
      state = { ready: false }
      loaded = true
      loadError = true
    } finally {
      if (stateRequest === controller) stateRequest = undefined
      if (!handle.signal.aborted && !controller.signal.aborted) void handle.update()
    }
  }

  handle.queueTask(() => {
    if (!handle.props.lazy) return
    const dialog = section?.closest<HTMLDialogElement>('dialog[data-navigation-dialog]')
    if (!dialog) return
    let wasOpen = false
    const opened = () => {
      const justOpened = dialog.open && !wasOpen
      wasOpen = dialog.open
      if (justOpened) void loadState()
    }
    dialog.addEventListener('navigation-open', opened, { signal: handle.signal })
    dialog.addEventListener('toggle', opened, { signal: handle.signal })
    opened()
  })

  async function logout(event: SubmitEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (pending) return
    const form = event.currentTarget as HTMLFormElement
    const body = new FormData(form)
    stateRequest?.abort()
    stateRequest = undefined
    pending = true
    void handle.update()
    try {
      notice = await readResult(
        await submitSessionForm(form.action, body, handle.signal, state.email),
      )
      if (notice.type === 'success') {
        state = { ready: false }
        state = await readNewsletterState(handle.signal)
        loaded = true
        loadError = !state.ready
      }
    } catch (error) {
      if (handle.signal.aborted) return
      loadError = !state.ready
      notice = { type: 'error', message: 'Something went wrong. Please try again.' }
      if (error instanceof SessionChangedError) {
        try {
          state = await readNewsletterState(handle.signal)
        } catch {
          state = { ready: false }
          loadError = true
        }
      }
    } finally {
      if (!handle.signal.aborted) {
        pending = false
        void handle.update()
      }
    }
  }

  return () => (
    <section
      class="newsletter-area"
      aria-label="Newsletter"
      aria-busy={!loaded || pending}
      mix={ref((node) => {
        section = node
      })}
    >
      {handle.props.lazy && (
        <noscript>
          <p>
            <a href="/login">Sign up or log in</a>
          </p>
        </noscript>
      )}
      {!loaded ? (
        <div
          class="newsletter-loading"
          role="status"
        >
          <span class="sr-only">Loading newsletter…</span>
          <div
            class="newsletter-skeleton"
            aria-hidden="true"
          >
            <span class="newsletter-skeleton-avatar" />
            <span class="newsletter-skeleton-name" />
            <span class="newsletter-skeleton-action" />
          </div>
        </div>
      ) : state.email ? (
        <>
          <p class="newsletter-user">
            <NewsletterIcon name="user" />
            <strong>{state.email}</strong>
          </p>
          <form
            method="post"
            action="/logout"
            aria-busy={pending}
            mix={on<HTMLFormElement, 'submit'>('submit', logout)}
          >
            <input
              type="hidden"
              name="_csrf"
              value={state.csrfToken ?? ''}
            />
            <button
              class="newsletter-logout"
              type="submit"
              disabled={pending}
            >
              {pending ? (
                <span
                  class="newsletter-spinner"
                  aria-hidden="true"
                />
              ) : (
                <NewsletterIcon name="logout" />
              )}
              {pending ? 'Logging out…' : 'Logout'}
            </button>
          </form>
        </>
      ) : (
        <>
          <h3>Let’s stay in touch.</h3>
          <NewsletterForm
            key={state.csrfToken ?? 'loading'}
            state={state}
            refresh={loadState}
            signup
          />
        </>
      )}
      {loadError && (
        <button
          type="button"
          disabled={Boolean(stateRequest)}
          mix={on('click', () => {
            void loadState()
          })}
        >
          Retry newsletter
        </button>
      )}
      {notice && <NewsletterFeedback result={notice} />}
    </section>
  )
}
