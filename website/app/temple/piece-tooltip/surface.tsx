import type { Handle } from 'remix/component'

/** Shared tooltip/panel material, independent of positioning and interaction. */
export function PieceSurface(handle: Handle<{ id: string }>) {
  return () => {
    const material = `${handle.props.id}-material`
    return (
      <svg
        class="piece-tooltip-piece"
        viewBox="0 0 400 180"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={material}
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
          fill={`url(#${material})`}
          d="M25 17C105 5 197 24 365 7Q390 5 387 29L397 141Q400 160 377 162C260 155 154 179 26 170Q7 169 10 149L3 40Q0 21 25 17Z"
        />
      </svg>
    )
  }
}
