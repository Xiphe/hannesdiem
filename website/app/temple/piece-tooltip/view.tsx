import { ref, type Handle } from 'remix/component'
import { mountPieceTooltip } from './enhance.ts'

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
          <svg
            class="piece-tooltip-piece"
            viewBox="0 0 400 180"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id={`${id}-material`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop class="piece-tooltip-top" />
                <stop
                  class="piece-tooltip-bottom"
                  offset="1"
                />
              </linearGradient>
            </defs>
            <path
              fill={`url(#${id}-material)`}
              d="M25 17C105 5 197 24 365 7Q390 5 387 29L397 141Q400 160 377 162C260 155 154 179 26 170Q7 169 10 149L3 40Q0 21 25 17Z"
            />
          </svg>
          <em>{content}</em>
        </span>
      </span>
    )
  }
}
