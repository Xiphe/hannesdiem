import type { Handle, RemixNode } from 'remix/component'
import { routes } from '../routes.ts'
import { externalLinkProps } from '../external-links.ts'

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
      {...externalLinkProps(handle.props.href)}
      class={handle.props.class}
      data-contact-modal={handle.props.href.startsWith('mailto:') ? '' : undefined}
      data-rmx-document={handle.props.href.startsWith('mailto:') ? '' : undefined}
      aria-haspopup={handle.props.href.startsWith('mailto:') ? 'dialog' : undefined}
    >
      {handle.props.children}
    </a>
  )
}
