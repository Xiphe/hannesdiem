import { on, type Handle } from 'remix/component'
import { templeMessages } from '../newsletter/contract.ts'
import { PiecePanel, LoadingSpinner } from '../temple/piece-tooltip/panel.tsx'
import {
  circlePath,
  circleMessages,
  validCircleAlias,
  type CircleView,
  type CircleResult,
} from './contract.ts'

type FieldsProps = {
  state: CircleView
  spot: number
  result?: CircleResult
  pending?: boolean
  moving?: boolean
  aliasValue?: string
  onAlias?: (value: string) => void
  close?: () => void | Promise<void>
  submit?: (event: SubmitEvent) => void
}
/** The same native form serves the island and the non-JavaScript fallback. */
export function CircleFields({
  state,
  spot,
  result,
  pending,
  moving,
  aliasValue,
  onAlias,
  close,
  submit,
}: FieldsProps) {
  const loggedIn = Boolean(state.email)
  const verify = !loggedIn || (state.reactivation && !state.own)
  const full = state.places.length + (state.unavailable?.length ?? 0) >= 10 && !state.own
  const alias = aliasValue ?? state.own?.alias ?? state.name ?? ''
  const changed = alias.trim() !== state.own?.alias
  return (
    <div
      class="circle-fields"
      data-moving={moving ? '' : undefined}
    >
      {result?.confirmationPending || (state.waiting && full) ? (
        <p role="status">
          {result?.confirmationPending ? circleMessages.pending : circleMessages.full}
        </p>
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
          {moving ? (
            <>
              <p>change seat?</p>
              <div class="circle-move-actions">
                <button
                  type="button"
                  disabled={pending}
                  mix={on('click', () => close?.())}
                >
                  No
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="move"
                  disabled={pending}
                >
                  {pending && LoadingSpinner()}Yes
                </button>
              </div>
            </>
          ) : verify ? (
            <>
              <p class="circle-login-explanation">Please log in via your email to join us</p>
              {!loggedIn && (
                <>
                  <label>
                    Name
                    <input
                      name="name"
                      required
                      autoComplete="name"
                      maxLength={120}
                      disabled={pending}
                    />
                  </label>
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
                </>
              )}
              {state.reactivation && <p>{templeMessages.reactivation}</p>}
              <button
                type="submit"
                name="intent"
                value="verify"
                disabled={!state.ready || pending}
              >
                {pending && LoadingSpinner()}Request login email
              </button>
            </>
          ) : (
            <>
              <label>
                Name or Alias
                <span class="circle-rename">
                  <input
                    name="alias"
                    autoComplete="off"
                    required
                    minLength={1}
                    maxLength={20}
                    {...(onAlias ? { value: alias } : { defaultValue: alias })}
                    mix={on('input', (event) => onAlias?.(event.currentTarget.value))}
                    aria-describedby="circle-alias-disclaimer"
                    disabled={pending || state.processing}
                  />
                  {state.own && (changed || !onAlias) && (
                    <button
                      type="submit"
                      name="intent"
                      value="rename"
                      disabled={!validCircleAlias(alias) || pending || state.processing}
                    >
                      Rename
                    </button>
                  )}
                </span>
              </label>
              <p
                id="circle-alias-disclaimer"
                class="circle-disclaimer"
              >
                this name will be visible publicly on this website
              </p>
              {alias.length > 20 && <p role="status">{circleMessages.alias}</p>}
              {!state.own && (
                <button
                  type="submit"
                  name="intent"
                  value="claim"
                  disabled={
                    !state.ready ||
                    (Boolean(onAlias) && !validCircleAlias(alias)) ||
                    pending ||
                    state.processing
                  }
                >
                  {pending && LoadingSpinner()}
                  {full ? 'Join the waiting list' : 'Claim your spot'}
                </button>
              )}
              {state.own && (
                <button
                  type="submit"
                  name="intent"
                  value="release"
                  class="circle-release"
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
      {result && !result.confirmationPending && result.type === 'error' && (
        <p role="alert">{result.message}</p>
      )}
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
  let alias = handle.props.state.own?.alias ?? handle.props.state.name ?? ''
  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget as HTMLFormElement
    const body = new FormData(form, event.submitter)
    pending = true
    result = undefined
    void handle.update()
    try {
      const response = await fetch(circlePath, {
        method: 'POST',
        body,
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
      alias = handle.props.state.own?.alias ?? handle.props.state.name ?? ''
    }
    return (
      <div
        class="temple-signup circle-signup"
        data-floating=""
      >
        <PiecePanel
          id="temple-circle-signup"
          label={handle.props.moving ? 'change seat?' : 'Claim your spot'}
          close={handle.props.close}
        >
          {CircleFields({
            ...handle.props,
            result,
            pending,
            submit,
            aliasValue: alias,
            onAlias: (value) => {
              alias = value
              void handle.update()
            },
          })}
        </PiecePanel>
      </div>
    )
  }
}
