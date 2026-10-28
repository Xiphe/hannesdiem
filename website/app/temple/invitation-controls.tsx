import { ref, type Handle } from 'remix/component'

/** Only dialog behaviour hydrates; authored cards/details remain static server content. */
export function InvitationControls(handle: Handle) {
  let marker: HTMLElement | undefined
  handle.queueTask((signal) => {
    const root = marker?.parentElement
    if (!root) return
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const closing = new WeakSet<HTMLDialogElement>()
    async function close(dialog: HTMLDialogElement) {
      if (closing.has(dialog)) return
      closing.add(dialog)
      dialog.dataset.closing = ''
      if (!motion.matches)
        await Promise.allSettled(
          dialog.getAnimations({ subtree: true }).map((animation) => animation.finished),
        )
      if (signal.aborted) return
      dialog.close()
      delete dialog.dataset.closing
      closing.delete(dialog)
    }
    root.addEventListener(
      'click',
      (event) => {
        const target = event.target as Element
        const trigger = target.closest<HTMLButtonElement>('[data-invitation-open]')
        if (trigger) {
          const dialog = document.getElementById(trigger.dataset.invitationOpen!)
          if (dialog instanceof HTMLDialogElement && !dialog.open) {
            event.preventDefault()
            dialog.showModal()
          }
        }
        const dialog = target.closest<HTMLDialogElement>('dialog[data-invitation-dialog]')
        if (!dialog) return
        if (target.closest('[data-invitation-close]')) {
          event.preventDefault()
          void close(dialog)
        } else if (target === dialog) {
          const rect = dialog.getBoundingClientRect()
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            void close(dialog)
        }
      },
      { signal },
    )
    for (const dialog of root.querySelectorAll<HTMLDialogElement>(
      'dialog[data-invitation-dialog]',
    )) {
      dialog.addEventListener(
        'cancel',
        (event) => {
          event.preventDefault()
          void close(dialog)
        },
        { signal },
      )
    }
    signal.addEventListener(
      'abort',
      () => {
        for (const dialog of root.querySelectorAll<HTMLDialogElement>('dialog[open]'))
          dialog.close()
      },
      { once: true },
    )
  })
  return () => (
    <span
      hidden
      mix={ref((node) => {
        marker = node
      })}
    />
  )
}
