import type { Handle } from 'remix/component'
import type { OpeningProps } from './types.ts'

export function TopNavigation(handle: Handle<OpeningProps>) {
  return () => (
    <header class="temple-top-navigation">
      <a
        class="temple-nav-title"
        href={`#temple-top-${handle.props.id}`}
      >
        <span class="temple-nav-title-ink">{handle.props.title}</span>
        <canvas aria-hidden="true" />
      </a>
      <nav
        class="temple-nav-items"
        aria-label={handle.props.title}
      >
        {handle.props.navigation?.map(({ label, href }) => (
          <a
            href={href}
            aria-disabled={!href || undefined}
          >
            {label}
          </a>
        ))}
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
