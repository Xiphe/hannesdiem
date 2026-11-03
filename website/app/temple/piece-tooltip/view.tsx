import { ref, type Handle } from 'remix/component'
import { mountPieceTooltip } from './enhance.ts'
import { PieceSurface } from './surface.tsx'

export interface PieceTooltipProps {
  /** Unique within the document; also namespaces the material gradient. */
  id: string
  label: string
  content: string
}

/** Use inside a hydrated Remix component, together with piece-tooltip/style.css. */
export function PieceTooltip(handle: Handle<PieceTooltipProps>) {
  let root: HTMLElement
  handle.queueTask((signal) => mountPieceTooltip(root, signal))
  return () => {
    const { id, label, content } = handle.props
    return (
      <span
        mix={ref((node) => {
          root = node
        })}
      >
        <button
          type="button"
          class="piece-tooltip-trigger"
          aria-describedby={id}
          aria-expanded="false"
        >
          {label}
        </button>
        <span
          class="piece-tooltip"
          id={id}
          role="tooltip"
          popover="auto"
        >
          <PieceSurface id={id} />
          <em>{content}</em>
        </span>
      </span>
    )
  }
}
