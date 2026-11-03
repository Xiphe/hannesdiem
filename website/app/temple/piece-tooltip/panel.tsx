import { on, type Handle, type RemixNode } from 'remix/component'
import { XMarkIcon } from '../../heroicons.tsx'
import { PieceSurface } from './surface.tsx'

/** Shared material and dismissal behavior for private Temple forms. */
export function PiecePanel(
  handle: Handle<{
    id: string
    label: string
    close?: () => void | Promise<void>
    children?: RemixNode
  }>,
) {
  return () => (
    <div
      class="temple-signup-expanded"
      id={`${handle.props.id}-panel`}
      role="dialog"
      aria-label={handle.props.label}
      mix={on('keydown', (event) => {
        if (event.key !== 'Escape' || !handle.props.close) return
        event.preventDefault()
        event.stopPropagation()
        void handle.props.close()
      })}
    >
      <PieceSurface id={handle.props.id} />
      {handle.props.close && (
        <button
          type="button"
          class="temple-signup-close"
          aria-label="Close signup"
          mix={on('click', () => handle.props.close?.())}
        >
          <XMarkIcon
            width={20}
            height={20}
          />
        </button>
      )}
      {handle.props.children}
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <span
      class="temple-loading-spinner"
      aria-hidden="true"
    />
  )
}
