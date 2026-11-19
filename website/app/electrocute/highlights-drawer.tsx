import { on, ref, type Handle, type RemixNode } from 'remix/component'
import { XMarkIcon } from '../heroicons.tsx'
import type { ElectroCuteHighlight } from '@hannesdiem/content-components'
import { clock, highlightPath } from './model.ts'

// CMX supplies the recording content; its Remix adapter has no drawer primitive.
// Keep the player/sidebar layout and its toggle in native Remix presentation state.
export function HighlightsDrawer(
  handle: Handle<{
    sessionId: string
    highlights: ElectroCuteHighlight[]
    position: number
    ready: boolean
    renderPlayer(toggle: RemixNode): RemixNode
    choose(highlight: ElectroCuteHighlight): void
  }>,
) {
  let open = false
  let trigger: HTMLButtonElement | undefined
  let drawer: HTMLElement | undefined

  async function close() {
    open = false
    await handle.update()
    trigger?.focus({ preventScroll: true })
  }

  return () => {
    const toggle = (
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
    )
    return (
      <div
        class="ec-player-layout"
        data-drawer-open={open ? '' : undefined}
        mix={on('keydown', (event) => {
          if (!open || event.key !== 'Escape') return
          event.preventDefault()
          event.stopPropagation()
          void close()
        })}
      >
        <div class="ec-player-main">{handle.props.renderPlayer(toggle)}</div>
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
          ]}
        >
          <div class="ec-highlights-drawer-inner">
            <button
              type="button"
              class="ec-icon-button ec-drawer-close"
              aria-label="Close highlights"
              mix={on('click', () => void close())}
            >
              <XMarkIcon />
            </button>
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
                      <span class="ec-drawer-title">{highlight.title}</span>
                      <span class="ec-drawer-meta">
                        <span
                          class="ec-drawer-time"
                          title="Start time"
                        >
                          {clock(highlight.start)}
                        </span>
                        <span
                          class="ec-drawer-duration"
                          title="Duration"
                        >
                          {clock(highlight.end - highlight.start)}
                        </span>
                        <span class="ec-drawer-person">{highlight.person}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
              {!handle.props.highlights.length && <p class="ec-drawer-empty">No highlights yet.</p>}
            </div>
          </div>
        </aside>
      </div>
    )
  }
}
