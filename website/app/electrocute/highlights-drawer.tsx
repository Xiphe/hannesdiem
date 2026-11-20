import { on, ref, type Handle, type RemixNode } from 'remix/component'
import type { ElectroCuteHighlight } from '@hannesdiem/content-components'
import { FeedIcon } from '../temple/feed/icon.tsx'
import { clock, highlightPath } from './model.ts'

function ActionIcon(handle: Handle<{ name: 'edit' | 'delete' }>) {
  return () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {handle.props.name === 'edit' ? (
        <path d="m16 3 5 5L8 21H3v-5ZM14 5l5 5" />
      ) : (
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
      )}
    </svg>
  )
}

// CMX supplies recording content; its Remix adapter has no player/sidebar primitive.
export function HighlightsDrawer(
  handle: Handle<{
    sessionId: string
    highlights: ElectroCuteHighlight[]
    position: number
    ready: boolean
    busy: boolean
    shareUrl?: string
    error?: string
    renderPlayer(toggle: RemixNode): RemixNode
    choose(highlight: ElectroCuteHighlight): void
    canEdit(highlight: ElectroCuteHighlight): boolean
    edit(highlight: ElectroCuteHighlight): void
    remove(highlight: ElectroCuteHighlight): void
    share(highlight: ElectroCuteHighlight): void
  }>,
) {
  let open = false
  handle.queueTask(() => {
    const sync = () => {
      open = new URL(location.href).searchParams.get('highlights') === '1'
      handle.update()
    }
    sync()
    window.addEventListener('popstate', sync, { signal: handle.signal })
  })
  return () => {
    const p = handle.props
    const toggle = (
      <button
        type="button"
        class="ec-icon-button ec-highlights-toggle"
        aria-label="Toggle highlights"
        aria-expanded={open}
        aria-controls="ec-highlight-drawer"
        title="Highlights"
        mix={on('click', () => {
          open = !open
          const url = new URL(location.href)
          if (open) url.searchParams.set('highlights', '1')
          else url.searchParams.delete('highlights')
          history.replaceState(history.state, '', url.pathname + url.search + url.hash)
          handle.update()
        })}
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
      >
        <div class="ec-player-main">{p.renderPlayer(toggle)}</div>
        <aside
          id="ec-highlight-drawer"
          class="ec-highlights-drawer"
          aria-label="Highlights"
          aria-hidden={!open}
          inert={!open}
          data-open={open ? '' : undefined}
        >
          <div class="ec-highlights-drawer-inner">
            <div class="ec-highlights-content">
              <ol class="ec-drawer-list">
                {p.highlights.map((highlight) => (
                  <li
                    key={highlight.id}
                    class="ec-drawer-row"
                    data-active={
                      p.position >= highlight.start && p.position < highlight.end ? '' : undefined
                    }
                  >
                    <a
                      class="ec-drawer-link"
                      href={highlightPath(p.sessionId, highlight.id, true)}
                      aria-current={
                        p.position >= highlight.start && p.position < highlight.end
                          ? 'true'
                          : undefined
                      }
                      mix={on('click', (event) => {
                        if (
                          !p.ready ||
                          event.button !== 0 ||
                          event.metaKey ||
                          event.ctrlKey ||
                          event.shiftKey ||
                          event.altKey
                        )
                          return
                        event.preventDefault()
                        p.choose(highlight)
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
                    <div
                      class="ec-drawer-actions"
                      role="group"
                      aria-label={`Actions for ${highlight.title}`}
                    >
                      {p.canEdit(highlight) && (
                        <>
                          <button
                            type="button"
                            class="ec-icon-button"
                            aria-label="Edit highlight"
                            title="Edit highlight"
                            disabled={p.busy || !p.ready}
                            mix={on('click', () => p.edit(highlight))}
                          >
                            <ActionIcon name="edit" />
                          </button>
                          <button
                            type="button"
                            class="ec-icon-button"
                            aria-label="Delete highlight"
                            title="Delete highlight"
                            disabled={p.busy}
                            mix={on('click', () => p.remove(highlight))}
                          >
                            <ActionIcon name="delete" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        class="ec-icon-button"
                        aria-label="Copy highlight link"
                        title="Copy highlight link"
                        mix={on('click', () => p.share(highlight))}
                      >
                        <FeedIcon name="share" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              {!p.highlights.length && <p class="ec-drawer-empty">No highlights yet.</p>}
              {p.error && (
                <p
                  class="ec-drawer-feedback"
                  role="alert"
                >
                  {p.error}
                </p>
              )}
              {p.shareUrl && (
                <input
                  class="ec-drawer-share"
                  aria-label="Highlight link"
                  readOnly
                  value={p.shareUrl}
                  mix={ref((node) => {
                    node.focus({ preventScroll: true })
                    node.select()
                  })}
                />
              )}
            </div>
          </div>
        </aside>
      </div>
    )
  }
}
