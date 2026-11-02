import type { Handle } from 'remix/component'
import type { OpeningProps } from './types.ts'
import { generateFragments } from './fragment-button/fragment-generator.ts'

export function TopNavigation(handle: Handle<OpeningProps>) {
  const pieces = generateFragments('temple-navigation-separators', 6)
  const date = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', timeZone: 'UTC' })
  const format = (value: string) => date.format(new Date(value + 'T12:00:00Z'))
  return () => (
    <header class="temple-top-navigation">
      <div class="temple-nav-brand">
        <a
          class="temple-nav-title"
          href={`#temple-top-${handle.props.id}`}
          aria-label={handle.props.title}
        >
          <span class="temple-nav-title-ink">{handle.props.title.toUpperCase()}</span>
          <canvas aria-hidden="true" />
        </a>
        <div class="temple-nav-date">
          <time dateTime={handle.props.dates.start}>{format(handle.props.dates.start)}</time>
          {' – '}
          <time dateTime={handle.props.dates.end}>
            {format(handle.props.dates.end)}, {handle.props.dates.end.slice(0, 4)}
          </time>
        </div>
      </div>
      <nav
        class="temple-nav-items"
        aria-label={handle.props.title}
      >
        {handle.props.navigation?.map(({ label, href, verseBefore }, index) => {
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
              <a
                href={href}
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
            </>
          )
        })}
        <div
          class="temple-nav-progress"
          aria-hidden="true"
        >
          <span />
        </div>
      </nav>
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
