import { on, type Handle } from 'remix/component'
import { templeMessages } from '../newsletter/contract.ts'
import { circlePath, circleMessages, type CircleView, type CircleResult } from './contract.ts'

type FieldsProps = {
  state: CircleView
  spot: number
  result?: CircleResult
  pending?: boolean
  submit?: (event: SubmitEvent) => void
}
/** Shared native form: account email is private; alias is an explicit public choice. */
export function CircleFields({ state, spot, result, pending, submit }: FieldsProps) {
  const loggedIn = Boolean(state.email)
  const full = state.places.length + (state.unavailable?.length ?? 0) >= 10 && !state.own
  const verify = !loggedIn || (state.reactivation && !state.own)
  return (
    <div class="circle-fields">
      {full ? (
        <p role="status">{circleMessages.full}</p>
      ) : (
        <form
          method="post"
          action={circlePath}
          aria-busy={pending}
          mix={submit ? on<HTMLFormElement, 'submit'>('submit', submit) : undefined}
        >
          <input
            type="hidden"
            name="_csrf"
            value={state.csrfToken ?? ''}
          />
          <input
            type="hidden"
            name="spot"
            value={spot}
          />
          {loggedIn && <p class="circle-private-email">{state.email}</p>}
          {verify ? (
            <>
              {!loggedIn && (
                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    maxLength={254}
                    disabled={pending}
                  />
                </label>
              )}
              {state.reactivation && <p>{templeMessages.reactivation}</p>}
              <button
                type="submit"
                name="intent"
                value="verify"
                disabled={!state.ready || pending}
              >
                Get Login Link
              </button>
            </>
          ) : (
            <>
              <label>
                Public name or alias
                <input
                  name="alias"
                  autoComplete="off"
                  required
                  maxLength={120}
                  defaultValue={state.own?.alias ?? ''}
                  disabled={pending || state.processing}
                />
              </label>
              <button
                type="submit"
                name="intent"
                value={state.own ? 'rename' : 'claim'}
                disabled={!state.ready || pending || state.processing}
              >
                {state.own ? 'Save' : 'Claim your spot'}
              </button>
              {state.own && (
                <button
                  type="submit"
                  name="intent"
                  value="release"
                  formNoValidate
                  disabled={pending || state.processing}
                >
                  Release my spot
                </button>
              )}
            </>
          )}
        </form>
      )}
      {result && <p role={result.type === 'error' ? 'alert' : 'status'}>{result.message}</p>}
    </div>
  )
}

export interface CirclePanelProps extends FieldsProps {
  onResult?: (value: CircleResult) => void
}
export function CirclePanel(handle: Handle<CirclePanelProps>) {
  let pending = false
  let result = handle.props.result
  let identity = handle.props.state.email
  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (pending) return
    pending = true
    result = undefined
    void handle.update()
    try {
      const form = event.currentTarget as HTMLFormElement
      const response = await fetch(circlePath, {
        method: 'POST',
        body: new FormData(form, event.submitter),
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        mode: 'same-origin',
        signal: handle.signal,
      })
      const value = (await response.json()) as CircleResult
      if (!['success', 'error'].includes(value.type) || typeof value.message !== 'string')
        throw new Error('Invalid circle response')
      result = value
      handle.props.onResult?.(value)
    } catch {
      if (handle.signal.aborted) return
      result = { type: 'error', message: circleMessages.failure }
    } finally {
      if (!handle.signal.aborted) {
        pending = false
        void handle.update()
      }
    }
  }
  return () => {
    if (identity !== handle.props.state.email) {
      identity = handle.props.state.email
      result = handle.props.result
    }
    return CircleFields({ ...handle.props, result, pending, submit })
  }
}
