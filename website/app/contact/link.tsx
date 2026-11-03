import type { Handle, RemixNode } from 'remix/component'
import { routes } from '../routes.ts'

export function contactHref(email: string) {
  if (!email.startsWith('mailto:')) return email
  return `${routes.contact.href()}?email=${encodeURIComponent(email)}`
}

export function ContactLink(
  handle: Handle<{ href: string; children?: RemixNode; class?: string }>,
) {
  return () => (
    <a
      href={contactHref(handle.props.href)}
      class={handle.props.class}
      data-rmx-target={handle.props.href.startsWith('mailto:') ? 'overlay' : undefined}
      data-rmx-reset-scroll={handle.props.href.startsWith('mailto:') ? 'false' : undefined}
      aria-haspopup={handle.props.href.startsWith('mailto:') ? 'dialog' : undefined}
    >
      {handle.props.children}
    </a>
  )
}
