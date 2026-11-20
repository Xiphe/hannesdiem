import { on, ref, type Handle } from 'remix/component'
import { EllipsisHorizontalIcon, PencilIcon, TrashIcon } from '../heroicons.tsx'

// CMX's installed adapter has no menu primitive; use the native auto popover
// for top-layer rendering, outside dismissal and one-open-menu behavior.
export function HighlightMenu(
  handle: Handle<{ id: string; busy: boolean; ready: boolean; edit(): void; remove(): void }>,
) {
  let trigger: HTMLButtonElement | undefined
  let menu: HTMLDivElement | undefined
  let focusLast = false
  const items = () => [
    ...(menu?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []),
  ]
  const close = () => {
    if (menu?.matches(':popover-open')) menu.hidePopover()
  }
  const positionAndFocus = (last = false) => {
    if (!menu || !trigger) return
    const anchor = trigger.getBoundingClientRect()
    const box = menu.getBoundingClientRect()
    menu.style.left = `${Math.max(8, Math.min(innerWidth - box.width - 8, anchor.right - box.width))}px`
    menu.style.top = `${anchor.bottom + box.height + 8 <= innerHeight ? anchor.bottom + 4 : Math.max(8, anchor.top - box.height - 4)}px`
    menu.style.visibility = 'visible'
    const buttons = items()
    buttons[last ? buttons.length - 1 : 0]?.focus({ preventScroll: true })
  }
  handle.signal.addEventListener('abort', close, { once: true })
  return () => {
    const p = handle.props
    const id = `ec-highlight-menu-${encodeURIComponent(p.id)}`
    return (
      <div class="ec-drawer-menu-control">
        <button
          type="button"
          class="ec-icon-button ec-drawer-more"
          aria-label="Highlight actions"
          aria-haspopup="menu"
          aria-expanded={menu?.matches(':popover-open') ?? false}
          aria-controls={id}
          popoverTarget={id}
          title="Highlight actions"
          disabled={p.busy}
          mix={[
            ref((node) => {
              trigger = node
            }),
            on('keydown', (event) => {
              if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
              event.preventDefault()
              focusLast = event.key === 'ArrowUp'
              if (menu?.matches(':popover-open')) positionAndFocus(focusLast)
              else trigger?.click()
            }),
          ]}
        >
          <EllipsisHorizontalIcon />
        </button>
        <div
          id={id}
          class="ec-drawer-menu"
          popover="auto"
          role="menu"
          aria-label="Highlight actions"
          mix={[
            ref((node) => {
              menu = node
            }),
            on('toggle', () => {
              const expanded = menu?.matches(':popover-open') ?? false
              trigger?.setAttribute('aria-expanded', String(expanded))
              if (expanded) positionAndFocus(focusLast)
              else if (menu) menu.style.visibility = 'hidden'
              focusLast = false
            }),
            on('keydown', (event) => {
              if (event.key === 'Escape' || event.key === 'Tab') {
                event.stopPropagation()
                close()
                trigger?.focus({ preventScroll: true })
                if (event.key === 'Escape') event.preventDefault()
                return
              }
              if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const buttons = items()
              const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? buttons.length - 1
                    : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                      buttons.length
              buttons[next]?.focus({ preventScroll: true })
            }),
          ]}
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            class="ec-menu-item"
            aria-label="Edit highlight"
            disabled={p.busy || !p.ready}
            mix={on('click', () => {
              close()
              p.edit()
            })}
          >
            <PencilIcon />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            class="ec-menu-item"
            aria-label="Delete highlight"
            disabled={p.busy}
            mix={on('click', () => {
              close()
              p.remove()
            })}
          >
            <TrashIcon />
            Delete
          </button>
        </div>
      </div>
    )
  }
}
