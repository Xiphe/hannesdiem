import { css } from 'remix/component'
export type CSS = Parameters<typeof css>[0]
export const sm = '@media (width >= 40rem)'
export const md = '@media (width >= 48rem)'
export const lg = '@media (width >= 64rem)'
export const dark = '@media (prefers-color-scheme: dark)'
export const focus: CSS = {
  outlineOffset: 4,
  '&:focus-visible': { outline: '4px solid var(--theme-fg)', zIndex: 10 },
}

export const buttonBase: CSS = {
  ...focus,
  fontWeight: 700,
  display: 'inline-flex',
  gap: '0.75rem',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '0.5rem',
  textDecoration: 'none!important',
  fontSize: '1.125rem',
  lineHeight: 1.555556,
  padding: '1rem 1.5rem',
  border: '2px solid var(--theme-fg)',
  '&:disabled': { opacity: 0.5 },
}
