import { on, ref, type Handle } from 'remix/component'
import type { FactProps } from '../types.ts'
import { mountCircle } from './circle-enhance.ts'
import { circleSurface } from './circle-shape.ts'
import { CirclePanel } from '../../circle/panel.tsx'
import {
  circlePath,
  circleMessages,
  availableCircleSpot,
  type CircleView,
  type CircleResult,
} from '../../circle/contract.ts'

type CircleProps = NonNullable<FactProps['circle']> & { id: string }

export function FactCircle(handle: Handle<CircleProps>) {
  let root: HTMLFieldSetElement | undefined
  let state: CircleView = { ready: false, places: [] }
  let expanded = false
  let selected = 1
  let hasSelection = false
  let moving = false
  let feedback: CircleResult | undefined
  let refreshing = false
  const persistent = handle.props.reservation === 'temple-circle'
  async function refresh() {
    if (refreshing || handle.signal.aborted) return
    refreshing = true
    try {
      const response = await fetch(circlePath, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        mode: 'same-origin',
        signal: handle.signal,
      })
      const value = (await response.json()) as CircleView
      if (
        !response.ok ||
        !value.ready ||
        !Array.isArray(value.places) ||
        !value.places.every(
          (p) =>
            Number.isInteger(p.spot) && p.spot >= 1 && p.spot <= 10 && typeof p.alias === 'string',
        )
      )
        throw new Error('Circle state unavailable')
      state = value
      if (!hasSelection && value.selected) selected = value.selected
      const url = new URL(location.href)
      const notice = url.searchParams.get('circle')
      if (notice) {
        expanded = !state.own
        hasSelection = Boolean(state.email && !state.own && availableCircleSpot(state, selected))
        moving = false
        const wanted = Number(url.searchParams.get('spot'))
        if (Number.isInteger(wanted) && wanted >= 1 && wanted <= 10) selected = wanted
        if (notice !== 'confirmed') feedback = { type: 'error', message: circleMessages.failure }
        url.searchParams.delete('circle')
        url.searchParams.delete('spot')
        history.replaceState(history.state, '', url)
      }
      selected = availableCircleSpot(state, selected) ?? selected
    } catch {
      if (handle.signal.aborted) return
      state = { ...state, ready: false }
      feedback = { type: 'error', message: circleMessages.failure }
    } finally {
      refreshing = false
      if (!handle.signal.aborted) {
        await handle.update()
        root?.dispatchEvent(new Event('circle-selection'))
      }
    }
  }
  async function choose(spot: number) {
    if (!state.ready) return
    moving = Boolean(state.own && state.own.spot !== spot)
    selected = spot
    hasSelection = Boolean(state.email && !state.own && availableCircleSpot(state, spot))
    expanded = true
    feedback = undefined
    await handle.update()
    root?.dispatchEvent(new Event('circle-selection'))
    root?.parentElement
      ?.querySelector<HTMLElement>('.circle-fields input:not([type="hidden"]):not(:disabled)')
      ?.focus()
  }
  async function result(value: CircleResult) {
    const previous = state.own?.spot
    if (value.state) state = value.state
    selected = availableCircleSpot(state, state.selected ?? selected) ?? selected
    feedback = value
    if (value.type === 'success' && !value.confirmationPending) {
      expanded = Boolean(state.waiting)
      hasSelection = false
      moving = false
    }
    await handle.update()
    root?.dispatchEvent(new Event('circle-selection'))
    if (!previous && state.own)
      root?.dispatchEvent(new CustomEvent('circle-claimed', { detail: state.own.spot }))
    if (!expanded)
      root
        ?.querySelector<HTMLElement>(
          state.own ? `input[value="${state.own.spot}"]` : '.fact-circle-invite',
        )
        ?.focus({ preventScroll: true })
  }
  handle.queueTask(() => {
    // These listeners belong to the component, not a single render commit.
    const signal = handle.signal
    if (root)
      mountCircle(
        root,
        signal,
        persistent
          ? {
              choose: (spot) => {
                void choose(spot)
              },
              owner: () => state.own?.spot,
              selected: () => (hasSelection ? selected : undefined),
            }
          : undefined,
      )
    if (!persistent) return
    void refresh()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && root) {
        const box = root.getBoundingClientRect()
        if (box.top < innerHeight && box.bottom > 0 && (!expanded || state.processing))
          void refresh()
      }
    }, 15_000)
    window.addEventListener(
      'focus',
      () => {
        void refresh()
      },
      { signal },
    )
    window.addEventListener(
      'pageshow',
      () => {
        void refresh()
      },
      { signal },
    )
    signal.addEventListener('abort', () => clearInterval(timer), { once: true })
  })
  return () => {
    const { id, places, label, occupied = [] } = handle.props
    const inviteLabel = persistent && hasSelection ? 'Welcome' : label
    const full =
      persistent && state.places.length + (state.unavailable?.length ?? 0) >= places && !state.own
    return (
      <div class="fact-circle-area">
        <fieldset
          class="fact-circle"
          aria-label={label ?? `Circle of ${places} places`}
          data-nav-visual
          mix={ref((node) => {
            root = node
          })}
        >
          {label && (
            <button
              class="fact-circle-invite"
              type="button"
              aria-label={full ? 'Join the waiting list' : inviteLabel}
              hidden={persistent && Boolean(state.own)}
              disabled={persistent && !state.ready}
            >
              <svg
                class="fact-circle-surface"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d={circleSurface()} />
              </svg>
              <span class="fact-circle-prompt">{full ? 'Join the waiting list' : inviteLabel}</span>
            </button>
          )}
          {Array.from({ length: places }, (_, index) => {
            const place = index + 1
            const reserved = persistent ? state.places.find((p) => p.spot === place) : undefined
            const mine = state.own?.spot === place
            const held = persistent
              ? Boolean(reserved && !mine) || Boolean(state.unavailable?.includes(place))
              : occupied.includes(place)
            const angle = (index / places) * Math.PI * 2 - Math.PI / 2
            return (
              <label
                class="fact-circle-place"
                tabIndex={persistent && reserved ? 0 : undefined}
                style={{
                  left: `${50 + Math.cos(angle) * 39.375}%`,
                  top: `${50 + Math.sin(angle) * 39.375}%`,
                }}
              >
                <input
                  type="radio"
                  name={held ? `${id}-held-${place}` : `${id}-spot`}
                  value={String(place)}
                  {...(persistent
                    ? {
                        checked:
                          mine || (hasSelection && !state.own && !held && selected === place),
                      }
                    : { defaultChecked: held })}
                  disabled={held || (persistent && !state.ready)}
                  aria-label={`Spot ${place}${reserved ? `: ${reserved.alias}` : held ? ' (occupied)' : ''}`}
                />
                <span
                  class="fact-circle-dot"
                  data-own={mine ? '' : undefined}
                  data-reserved={persistent && reserved ? '' : undefined}
                  data-candidate={
                    persistent && hasSelection && !state.own && !held && selected === place
                      ? ''
                      : undefined
                  }
                  aria-hidden="true"
                />
                <span
                  class="fact-circle-ripple"
                  aria-hidden="true"
                />
                {reserved && <span class="fact-circle-name">{reserved.alias}</span>}
              </label>
            )
          })}
        </fieldset>
        {persistent && (
          <>
            <noscript>
              <a href={circlePath}>{label}</a>
            </noscript>
            {expanded && (
              <CirclePanel
                state={state}
                spot={selected}
                moving={moving}
                close={async () => {
                  expanded = false
                  moving = false
                  await handle.update()
                  root
                    ?.querySelector<HTMLInputElement>(
                      `input[value="${state.own?.spot ?? selected}"]`,
                    )
                    ?.focus({ preventScroll: true })
                  if (!state.own && !hasSelection)
                    root
                      ?.querySelector<HTMLButtonElement>('.fact-circle-invite')
                      ?.focus({ preventScroll: true })
                }}
                result={feedback}
                onResult={(value) => {
                  void result(value)
                }}
              />
            )}
            {!state.ready && feedback && (
              <>
                <p role="status">{feedback.message}</p>
                <button
                  type="button"
                  mix={on('click', () => {
                    void refresh()
                  })}
                >
                  Retry
                </button>
              </>
            )}
          </>
        )}
      </div>
    )
  }
}
