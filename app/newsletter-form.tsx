import { on, type Handle } from 'remix/component'
import type { NewsletterState } from './newsletter.ts'
import type { NewsletterResult } from './newsletter-contract.ts'
import { BellIcon, CalendarDaysIcon, EnvelopeIcon, UserIcon, ArrowRightStartOnRectangleIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon } from './heroicons.tsx'

export interface NewsletterFormProps {
  state: NewsletterState
  signup?: boolean
  result?: NewsletterResult
  emailValue?: string
}

function NewsletterIcon(handle: Handle<{ name: 'bell' | 'calendar' | 'email' | 'user' | 'logout' }>) {
  return () => {
    const Icon = { bell: BellIcon, calendar: CalendarDaysIcon, email: EnvelopeIcon, user: UserIcon, logout: ArrowRightStartOnRectangleIcon }[handle.props.name]
    return <Icon class="newsletter-icon" aria-hidden="true" />
  }
}

function NewsletterFeedback(handle: Handle<{ result: NewsletterResult; remainingSeconds?: number }>) {
  return () => {
    const { result, remainingSeconds } = handle.props
    return <div class={`newsletter-feedback newsletter-feedback-${result.type}`} role={result.type === 'error' ? 'alert' : 'status'}>
      {result.type === 'success' ? <CheckCircleIcon class="newsletter-status-icon" aria-hidden="true" />
        : result.type === 'error' ? <XCircleIcon class="newsletter-status-icon" aria-hidden="true" />
        : <InformationCircleIcon class="newsletter-status-icon" aria-hidden="true" />}
      <span>{result.type === 'spam_protection' && remainingSeconds !== undefined
        ? <>Please wait <span class="newsletter-countdown">{remainingSeconds}s</span> before requesting another login token</>
        : result.message}</span>
    </div>
  }
}

async function readResult(response: Response): Promise<NewsletterResult> {
  const result = await response.json() as NewsletterResult
  if (!['success', 'error', 'spam_protection'].includes(result.type) || typeof result.message !== 'string') {
    throw new Error('Invalid newsletter response')
  }
  return result
}

function NewsletterForm(handle: Handle<NewsletterFormProps>) {
  let result = handle.props.result
  let emailValue = handle.props.emailValue ?? ''
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
  handle.signal.addEventListener('abort', () => { if (timer) clearInterval(timer) }, { once: true })

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (pending || remainingSeconds > 0 || !handle.props.state.ready) return
    const form = event.currentTarget as HTMLFormElement
    const body = new FormData(form)
    emailValue = String(body.get('email') ?? '')
    pending = true
    void handle.update()
    try {
      result = await readResult(await fetch(form.action, {
        method: 'POST', body, headers: { Accept: 'application/json' },
        mode: 'same-origin', credentials: 'same-origin', signal: handle.signal,
      }))
      csrfToken = result.csrfToken ?? csrfToken
      remainingSeconds = result.type === 'spam_protection' ? result.remainingSeconds : 0
      startCountdown()
    } catch {
      if (handle.signal.aborted) return
      result = { type: 'error', message: 'Something went wrong. Please try again.' }
    } finally {
      if (!handle.signal.aborted) { pending = false; void handle.update() }
    }
  }

  return () => {
    const { state, signup } = handle.props
    const disabled = !state.ready || pending || remainingSeconds > 0
    return <form class="newsletter-form" method="post" action="/login" aria-busy={pending} mix={on<HTMLFormElement, 'submit'>('submit', submit)}>
      <input type="hidden" name="_csrf" value={csrfToken} />
      {signup && !result && <ul>
        <li><NewsletterIcon name="bell" />Receive updates about new releases</li>
        <li><NewsletterIcon name="calendar" />Get invited to my events and workshops</li>
      </ul>}
      {result?.type !== 'success' && <>
        <label class="sr-only" htmlFor={signup ? 'newsletter-email' : 'login-email'}>Email address</label>
        <div class="newsletter-controls">
          <input id={signup ? 'newsletter-email' : 'login-email'} name="email" type="email"
            autoComplete="email" maxLength={254} required disabled={disabled} defaultValue={emailValue}
            placeholder={signup ? 'Enter your email for updates...' : 'Enter your email address'} />
          <button type="submit" disabled={disabled} aria-label={pending ? 'Sending login link' : undefined}>
            {pending ? <span class="newsletter-spinner" aria-hidden="true" /> : <>
              {signup && <NewsletterIcon name="email" />}
              {signup ? 'Signup' : 'Get Login Link'}
            </>}
          </button>
        </div>
      </>}
      {result && (result.type !== 'spam_protection' || remainingSeconds > 0) && <NewsletterFeedback result={result} remainingSeconds={remainingSeconds} />}
      {!state.ready && <p class="newsletter-feedback" role="status">Newsletter signup is temporarily unavailable. Please try again later.</p>}
    </form>
  }
}

// Keep the standalone entry separate: clientEntry adds metadata to its function.
export function StandaloneNewsletterForm(handle: Handle<NewsletterFormProps>) {
  return NewsletterForm(handle)
}

export function NewsletterArea(handle: Handle<{ state: NewsletterState }>) {
  let state = handle.props.state
  let pending = false
  let notice: NewsletterResult | undefined

  async function logout(event: SubmitEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (pending) return
    const form = event.currentTarget as HTMLFormElement
    const body = new FormData(form)
    pending = true
    void handle.update()
    try {
      notice = await readResult(await fetch(form.action, {
        method: 'POST', body, headers: { Accept: 'application/json' },
        mode: 'same-origin', credentials: 'same-origin', signal: handle.signal,
      }))
      if (notice.type === 'success') {
        state = { ready: false }
        const response = await fetch('/login', {
          headers: { Accept: 'application/json' }, mode: 'same-origin', credentials: 'same-origin', signal: handle.signal,
        })
        if (!response.ok) throw new Error('Newsletter session unavailable')
        state = await response.json() as NewsletterState
      }
    } catch {
      if (handle.signal.aborted) return
      notice = { type: 'error', message: 'Something went wrong. Please try again.' }
    } finally {
      if (!handle.signal.aborted) { pending = false; void handle.update() }
    }
  }

  return () => <section class="newsletter-area" aria-label="Newsletter">
    {state.email ? <>
      <p class="newsletter-user"><NewsletterIcon name="user" /><strong>{state.email}</strong></p>
      <form method="post" action="/logout" aria-busy={pending} mix={on<HTMLFormElement, 'submit'>('submit', logout)}>
        <input type="hidden" name="_csrf" value={state.csrfToken ?? ''} />
        <button class="newsletter-logout" type="submit" disabled={pending}>
          {pending ? <span class="newsletter-spinner" aria-hidden="true" /> : <NewsletterIcon name="logout" />}
          {pending ? 'Logging out…' : 'Logout'}
        </button>
      </form>
    </> : <>
      <h3>Let’s stay in touch.</h3>
      <NewsletterForm state={state} signup />
    </>}
    {notice && <NewsletterFeedback result={notice} />}
  </section>
}
