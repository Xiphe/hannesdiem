import { on, ref, type Handle } from 'remix/component'
import { XMarkIcon } from '../heroicons.tsx'
import type { ElectroCuteHighlight } from '@hannesdiem/content-components'
import { clock, highlightPath } from './model.ts'

// CMX supplies the recording content; its Remix adapter has no drawer primitive.
// Keep this non-modal player overlay in native Remix presentation state.
export function HighlightsDrawer(
  handle: Handle<{
    sessionId: string
    highlights: ElectroCuteHighlight[]
    position: number
    ready: boolean
    choose(highlight: ElectroCuteHighlight): void
  }>,
) {
  let open = false
  let trigger: HTMLButtonElement | undefined
  let drawer: HTMLElement | undefined

  async function close(restoreFocus = true) {
    open = false
    await handle.update()
    if (restoreFocus) trigger?.focus({ preventScroll: true })
  }

  handle.queueTask(() => {
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (
          open &&
          event.target instanceof Node &&
          !drawer?.contains(event.target) &&
          !trigger?.contains(event.target)
        )
          void close(false)
      },
      { signal: handle.signal },
    )
  })

  return () => (
    <>
      <button
        type="button"
        class="ec-icon-button ec-highlights-toggle"
        aria-label="Show highlights"
        aria-expanded={open}
        aria-controls="ec-highlight-drawer"
        title="Highlights"
        mix={[
          ref((node) => {
            trigger = node
          }),
          on('click', async () => {
            if (open) return close()
            open = true
            await handle.update()
            drawer?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
          }),
        ]}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M9 6h12M9 12h12M9 18h12" />
          <path
            d="M3 6h.01M3 12h.01M3 18h.01"
            strokeWidth="3"
          />
        </svg>
      </button>
      <aside
        id="ec-highlight-drawer"
        class="ec-highlights-drawer"
        aria-label="Highlights"
        aria-hidden={!open}
        inert={!open}
        data-open={open ? '' : undefined}
        mix={[
          ref((node) => {
            drawer = node
          }),
          on('keydown', (event) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            event.stopPropagation()
            void close()
          }),
        ]}
      >
        <div class="ec-highlights-header">
          <h2>
            Highlights <span class="ec-drawer-count">{handle.props.highlights.length}</span>
          </h2>
          <button
            type="button"
            class="ec-icon-button"
            aria-label="Close highlights"
            mix={on('click', () => void close())}
          >
            <XMarkIcon />
          </button>
        </div>
        <div class="ec-highlights-content">
          <ol class="ec-drawer-list">
            {handle.props.highlights.map((highlight) => (
              <li key={highlight.id}>
                <a
                  class="ec-drawer-link"
                  href={highlightPath(handle.props.sessionId, highlight.id)}
                  aria-current={
                    handle.props.position >= highlight.start &&
                    handle.props.position < highlight.end
                      ? 'true'
                      : undefined
                  }
                  mix={on('click', (event) => {
                    if (
                      !handle.props.ready ||
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return
                    event.preventDefault()
                    handle.props.choose(highlight)
                  })}
                >
                  <span class="ec-drawer-time">{clock(highlight.start)}</span>
                  <span class="ec-drawer-description">
                    <span class="ec-drawer-title">{highlight.title}</span>
                    <span class="ec-drawer-person">{highlight.person}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
          {!handle.props.highlights.length && <p class="ec-drawer-empty">No highlights yet.</p>}
        </div>
      </aside>
    </>
  )
}
