import { clientEntry, css, type Handle } from 'remix/component'
import type {
  InvitationGridProps,
  InvitationCardProps,
  InvitationDetailsProps,
} from '@hannesdiem/content-components'
import assets from '../../../.generated/assets.json' with { type: 'json' }
import { XMarkIcon } from '../heroicons.tsx'
import { InvitationControls as Controls } from './invitation-controls.tsx'

const InvitationControls = clientEntry(assets.templeInvitations + '#InvitationControls', Controls)

// Continue the approved forest-derived palette/type; these are concrete invitations,
// not a continuation of the parked poem animation. Titles remain artist-authored.
const grid = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 'clamp(1rem, 2vw, 2rem)',
  maxWidth: '86rem',
  marginInline: 'auto',
  padding: 'clamp(1.25rem, 4vw, 4rem)',
  fontFamily: 'Bricolage, sans-serif',
  fontSize: 'clamp(1rem, 1.25vw, 1.2rem)',
  lineHeight: 1.55,
  '@media (max-width: 46rem)': { gridTemplateColumns: 'minmax(0, 1fr)' },
})
const card = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '1.5rem',
  padding: 'clamp(1.5rem, 3vw, 3rem)',
  minHeight: '20rem',
  background:
    'light-dark(color-mix(in srgb, #645b48 9%, #f7ecdf), color-mix(in srgb, #b46a49 10%, #030503))',
  borderRadius: '1.2rem',
  '& h2': {
    margin: 0,
    fontWeight: 600,
    fontSize: 'clamp(1.75rem, 3vw, 3rem)',
    lineHeight: 1.12,
    letterSpacing: '-.025em',
    textWrap: 'balance',
  },
  '& p': { margin: 0, maxWidth: '60ch' },
  '& > button': { marginTop: 'auto' },
  '&:first-of-type': { gridColumn: '1 / -1', minHeight: '21rem' },
})
const action = css({
  font: 'inherit',
  color: 'inherit',
  background: 'transparent',
  cursor: 'pointer',
  border: '1px solid currentColor',
  borderRadius: '2rem',
  padding: '.7em 1.2em',
  '&:hover': { background: 'light-dark(#11120b, #d2d0c8)', color: 'light-dark(#f7ecdf, #030503)' },
  '&:focus-visible': { outline: '3px solid currentColor', outlineOffset: '4px' },
})
const dialogStyle = css({
  colorScheme: 'light dark',
  color: 'light-dark(#11120b, #d2d0c8)',
  background: 'light-dark(#f7ecdf, #030503)',
  border: 0,
  borderRadius: '1.2rem',
  padding: 0,
  width: 'min(44rem, calc(100% - 2rem))',
  maxHeight: 'calc(100svh - 3rem)',
  fontFamily: 'Bricolage, sans-serif',
  fontSize: 'clamp(1rem, 1.25vw, 1.15rem)',
  lineHeight: 1.65,
  '&::backdrop': { background: 'light-dark(#11120b88, #f7ecdf33)', backdropFilter: 'blur(8px)' },
  '& [data-invitation-panel]': {
    position: 'relative',
    padding: 'clamp(1.5rem, 5vw, 3rem)',
    animation: 'invitation-in 180ms ease-out',
  },
  '& h2': {
    fontSize: 'clamp(1.6rem, 3vw, 2.5rem)',
    fontWeight: 600,
    lineHeight: 1.15,
    margin: '0 2rem 1.5rem 0',
  },
  '& p': { marginBlock: '0 1em' },
  '& a': { color: 'inherit', textUnderlineOffset: '.2em' },
  '& nav ul': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '.75rem',
    padding: 0,
    margin: 0,
    listStyle: 'none',
  },
  '& nav a': {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    padding: '.5em 1em',
    border: '1px solid currentColor',
    borderRadius: '2rem',
    textDecoration: 'none',
  },
  '& nav a:focus-visible': { outline: '3px solid currentColor', outlineOffset: '3px' },
  '& [data-invitation-close]': {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    width: '2.5rem',
    height: '2.5rem',
    padding: '.5rem',
    border: 0,
    borderRadius: '50%',
    color: 'inherit',
    background: 'transparent',
    cursor: 'pointer',
  },
  '& [data-invitation-close] svg': { display: 'block', width: '100%', height: '100%' },
  '& [data-invitation-close]:focus-visible': {
    outline: '3px solid currentColor',
    outlineOffset: '2px',
  },
  '&[data-closing] [data-invitation-panel]': { animation: 'invitation-out 150ms ease-in forwards' },
  '@keyframes invitation-in': {
    from: { opacity: 0, transform: 'translateY(12px)' },
    to: { opacity: 1, transform: 'none' },
  },
  '@keyframes invitation-out': { to: { opacity: 0, transform: 'translateY(8px)' } },
  '@media (prefers-reduced-motion: reduce)': { '& [data-invitation-panel]': { animation: 'none' } },
})

export function InvitationGrid(handle: Handle<InvitationGridProps>) {
  return () => (
    <section mix={grid}>
      {handle.props.children}
      <InvitationControls />
    </section>
  )
}
export function InvitationCard(handle: Handle<InvitationCardProps>) {
  return () => {
    const { id, title, action: target, children } = handle.props
    return (
      <article
        id={id}
        mix={card}
      >
        <h2>{title}</h2>
        {children}
        <button
          type="button"
          command="show-modal"
          commandFor={target.target}
          data-invitation-open={target.target}
          mix={action}
        >
          {target.label}
        </button>
      </article>
    )
  }
}
export function InvitationDetails(handle: Handle<InvitationDetailsProps>) {
  return () => {
    const { id, title, children } = handle.props
    return (
      <dialog
        id={id}
        data-invitation-dialog
        aria-labelledby={`${id}-title`}
        mix={dialogStyle}
      >
        <div data-invitation-panel>
          <form method="dialog">
            <button
              type="submit"
              data-invitation-close
              aria-label="Close"
            >
              <XMarkIcon />
            </button>
          </form>
          <h2 id={`${id}-title`}>{title}</h2>
          {children}
        </div>
      </dialog>
    )
  }
}
