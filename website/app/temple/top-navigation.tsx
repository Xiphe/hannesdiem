import type { Handle } from 'remix/component'
import type { OpeningProps } from './types.ts'
import { generateFragments } from './fragment-button/fragment-generator.ts'
import { LocalDate } from '../date.tsx'
import { PieceTooltip } from './piece-tooltip/view.tsx'

export function TopNavigation(handle: Handle<OpeningProps>) {
  const pieces = generateFragments('temple-navigation-separators', 6)
  return () => (
    <header class="temple-top-navigation">
      {handle.props.view === 'poem' ? (
        <div class="temple-nav-enter fact-action">
          <a
            href="/temple-of-sound/visit"
            data-rmx-document
          >
            Enter the Temple of Sound
          </a>
        </div>
      ) : (
        <>
          <a
            class="temple-nav-brand"
            data-rmx-document
            href={
              handle.props.view === 'inside' ? '/temple-of-sound' : `#temple-top-${handle.props.id}`
            }
            aria-label={handle.props.title}
          >
            <span class="temple-nav-title">
              <span class="temple-nav-title-ink">{handle.props.title.toUpperCase()}</span>
              <canvas aria-hidden="true" />
            </span>
            <div class="temple-nav-date">
              <span class="temple-nav-date-ink">
                <LocalDate
                  value={handle.props.dates.start}
                  hideDay
                  hideYear
                />
                {' & '}
                <LocalDate
                  value={handle.props.dates.end}
                  hideDay
                />
              </span>
            </div>
          </a>
          <div class="temple-nav-track">
            <nav
              class="temple-nav-items"
              aria-label={handle.props.title}
            >
              {handle.props.navigation?.map(({ label, href, verseBefore }, index) => {
                const inside = handle.props.view === 'inside'
                if (inside) verseBefore = undefined
                const target = href?.startsWith('#') ? href.slice(1) : undefined
                const destination =
                  inside && target
                    ? `/temple-of-sound/${target === 'facts' ? 'visit' : target}`
                    : href
                const piece = index > 0 && (
                  <svg
                    class="temple-nav-separator"
                    viewBox="-20 -20 40 40"
                    aria-hidden="true"
                  >
                    <path
                      d={pieces[(index - 1) % pieces.length].d}
                      transform={`rotate(${[35, 115, -30, 70, -75, 145][(index - 1) % pieces.length]}) translate(0 5)`}
                    />
                  </svg>
                )
                return (
                  <>
                    {piece &&
                      (verseBefore ? (
                        <a
                          class="temple-nav-separator-slot temple-nav-separator-link"
                          href={verseBefore.href}
                          aria-label={verseBefore.label}
                          data-nav-stop
                        >
                          {piece}
                        </a>
                      ) : (
                        <span class="temple-nav-separator-slot">{piece}</span>
                      ))}
                    {inside && !href ? (
                      <span
                        class="temple-nav-pending"
                        data-nav-stop
                        data-nav-point
                      >
                        <PieceTooltip
                          id={`${handle.props.id}-soon-${index}`}
                          label={label}
                          content="coming soon"
                        />
                      </span>
                    ) : (
                      <a
                        href={destination}
                        data-nav-target={inside ? target : undefined}
                        data-nav-point={inside ? '' : undefined}
                        aria-disabled={!href || undefined}
                        data-nav-stop
                      >
                        <span
                          class="temple-nav-item-ink"
                          data-copy-inline
                        >
                          {label}
                        </span>
                      </a>
                    )}
                  </>
                )
              })}
            </nav>
          </div>
          <div
            class="temple-nav-progress"
            aria-hidden="true"
          >
            <span />
          </div>
        </>
      )}
      <button
        class="temple-nav-logo"
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="site-navigation"
        command="show-modal"
        commandFor="site-navigation"
        data-open-navigation
      >
        <img
          src={handle.props.mark}
          alt=""
          width={18}
          height={40}
        />
      </button>
    </header>
  )
}
