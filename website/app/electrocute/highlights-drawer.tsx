import { on, ref, type Handle, type RemixNode } from 'remix/component'
import type { ElectroCuteHighlight } from '@hannesdiem/content-components'
import { ShareIcon, ListBulletIcon } from '../heroicons.tsx'
import { HighlightMenu } from './highlight-menu.tsx'
import { clock, highlightPath } from './model.ts'

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
  let drawer: HTMLElement | undefined
  const closeMenus = () => {
    drawer
      ?.querySelectorAll<HTMLElement>('[popover]:popover-open')
      .forEach((menu) => menu.hidePopover())
  }
  handle.queueTask(() => {
    const sync = () => {
      open = new URL(location.href).searchParams.get('highlights') === '1'
      if (!open) closeMenus()
      handle.update()
    }
    sync()
    window.addEventListener('popstate', sync, { signal: handle.signal })
    window.addEventListener('resize', closeMenus, { signal: handle.signal })
    // Dismiss on scrolling gestures, not focus-induced scrolls while opening.
    for (const event of ['wheel', 'touchmove'])
      window.addEventListener(event, closeMenus, {
        capture: true,
        passive: true,
        signal: handle.signal,
      })
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
          if (!open) closeMenus()
          const url = new URL(location.href)
          if (open) url.searchParams.set('highlights', '1')
          else url.searchParams.delete('highlights')
          history.replaceState(history.state, '', url.pathname + url.search + url.hash)
          handle.update()
        })}
      >
        <ListBulletIcon />
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
          mix={ref((node) => {
            drawer = node
          })}
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
                    </a>
                    <span
                      class="ec-drawer-duration"
                      title="Duration"
                    >
                      {clock(highlight.end - highlight.start)}
                    </span>
                    <div class="ec-drawer-actions">
                      <button
                        type="button"
                        class="ec-icon-button ec-drawer-share-action"
                        aria-label="Copy highlight link"
                        title="Copy highlight link"
                        mix={on('click', () => p.share(highlight))}
                      >
                        <ShareIcon />
                      </button>
                      {p.canEdit(highlight) && (
                        <HighlightMenu
                          id={highlight.id}
                          ready={p.ready}
                          busy={p.busy}
                          edit={() => p.edit(highlight)}
                          remove={() => p.remove(highlight)}
                        />
                      )}
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
