import { css } from 'remix/component'
import { type CSS, lg, focus } from './styles.ts'
const linkFocus: CSS = { '& :where(a)': { borderRadius: 2, ...focus } }
const hr: CSS = {
  '& hr': {
    borderColor: 'var(--theme-fg)',
    width: '16rem',
    borderWidth: 4,
    marginInline: 'auto',
    marginTop: '4rem',
  },
}
// Legacy typography metrics, rendered with Remix instead of a CSS framework.
export const proseSizes: Record<'sm' | 'base' | 'lg' | 'xl' | '2xl', CSS> = {
  sm: {
    fontSize: '0.875rem',
    lineHeight: '1.7142857',
    '& :where(p)': {
      marginTop: '1.1428571em',
      marginBottom: '1.1428571em',
    },
    '& :where(blockquote)': {
      marginTop: '1.3333333em',
      marginBottom: '1.3333333em',
      paddingInlineStart: '1.1111111em',
    },
    '& :where(h1)': {
      fontSize: '2.1428571em',
      marginTop: '0',
      marginBottom: '0.8em',
      lineHeight: '1.2',
    },
    '& :where(h2)': {
      fontSize: '1.4285714em',
      marginTop: '1.6em',
      marginBottom: '0.8em',
      lineHeight: '1.4',
    },
    '& :where(h3)': {
      fontSize: '1.2857143em',
      marginTop: '1.5555556em',
      marginBottom: '0.4444444em',
      lineHeight: '1.5555556',
    },
    '& :where(h4)': {
      marginTop: '1.4285714em',
      marginBottom: '0.5714286em',
      lineHeight: '1.4285714',
    },
    '& :where(img)': {
      marginTop: '1.7142857em',
      marginBottom: '1.7142857em',
    },
    '& :where(video)': {
      marginTop: '1.7142857em',
      marginBottom: '1.7142857em',
    },
    '& :where(ol)': {
      marginTop: '1.1428571em',
      marginBottom: '1.1428571em',
      paddingInlineStart: '1.5714286em',
    },
    '& :where(ul)': {
      marginTop: '1.1428571em',
      marginBottom: '1.1428571em',
      paddingInlineStart: '1.5714286em',
    },
    '& :where(li)': {
      marginTop: '0.2857143em',
      marginBottom: '0.2857143em',
    },
    '& :where(ol > li)': {
      paddingInlineStart: '0.4285714em',
    },
    '& :where(ul > li)': {
      paddingInlineStart: '0.4285714em',
    },
    '& > :where(ul > li p)': {
      marginTop: '0.5714286em',
      marginBottom: '0.5714286em',
    },
    '& > :where(ul > li > p:first-child)': {
      marginTop: '1.1428571em',
    },
    '& > :where(ul > li > p:last-child)': {
      marginBottom: '1.1428571em',
    },
    '& > :where(ol > li > p:first-child)': {
      marginTop: '1.1428571em',
    },
    '& > :where(ol > li > p:last-child)': {
      marginBottom: '1.1428571em',
    },
    '& :where(ul ul), & :where(ul ol), & :where(ol ul), & :where(ol ol)': {
      marginTop: '0.5714286em',
      marginBottom: '0.5714286em',
    },
    '& :where(figure)': {
      marginTop: '1.7142857em',
      marginBottom: '1.7142857em',
    },
    '& :where(figcaption)': {
      fontSize: '0.8571429em',
      lineHeight: '1.3333333',
      marginTop: '0.6666667em',
    },
  },
  base: {
    fontSize: '1rem',
    lineHeight: '1.75',
    '& :where(p)': {
      marginTop: '1.25em',
      marginBottom: '1.25em',
    },
    '& :where(blockquote)': {
      marginTop: '1.6em',
      marginBottom: '1.6em',
      paddingInlineStart: '1em',
    },
    '& :where(h1)': {
      fontSize: '2.25em',
      marginTop: '0',
      marginBottom: '0.8888889em',
      lineHeight: '1.1111111',
    },
    '& :where(h2)': {
      fontSize: '1.5em',
      marginTop: '2em',
      marginBottom: '1em',
      lineHeight: '1.3333333',
    },
    '& :where(h3)': {
      fontSize: '1.25em',
      marginTop: '1.6em',
      marginBottom: '0.6em',
      lineHeight: '1.6',
    },
    '& :where(h4)': {
      marginTop: '1.5em',
      marginBottom: '0.5em',
      lineHeight: '1.5',
    },
    '& :where(img)': {
      marginTop: '2em',
      marginBottom: '2em',
    },
    '& :where(video)': {
      marginTop: '2em',
      marginBottom: '2em',
    },
    '& :where(ol)': {
      marginTop: '1.25em',
      marginBottom: '1.25em',
      paddingInlineStart: '1.625em',
    },
    '& :where(ul)': {
      marginTop: '1.25em',
      marginBottom: '1.25em',
      paddingInlineStart: '1.625em',
    },
    '& :where(li)': {
      marginTop: '0.5em',
      marginBottom: '0.5em',
    },
    '& :where(ol > li)': {
      paddingInlineStart: '0.375em',
    },
    '& :where(ul > li)': {
      paddingInlineStart: '0.375em',
    },
    '& > :where(ul > li p)': {
      marginTop: '0.75em',
      marginBottom: '0.75em',
    },
    '& > :where(ul > li > p:first-child)': {
      marginTop: '1.25em',
    },
    '& > :where(ul > li > p:last-child)': {
      marginBottom: '1.25em',
    },
    '& > :where(ol > li > p:first-child)': {
      marginTop: '1.25em',
    },
    '& > :where(ol > li > p:last-child)': {
      marginBottom: '1.25em',
    },
    '& :where(ul ul), & :where(ul ol), & :where(ol ul), & :where(ol ol)': {
      marginTop: '0.75em',
      marginBottom: '0.75em',
    },
    '& :where(figure)': {
      marginTop: '2em',
      marginBottom: '2em',
    },
    '& :where(figcaption)': {
      fontSize: '0.875em',
      lineHeight: '1.4285714',
      marginTop: '0.8571429em',
    },
  },
  lg: {
    fontSize: '1.125rem',
    lineHeight: '1.7777778',
    '& :where(p)': {
      marginTop: '1.3333333em',
      marginBottom: '1.3333333em',
    },
    '& :where(blockquote)': {
      marginTop: '1.6666667em',
      marginBottom: '1.6666667em',
      paddingInlineStart: '1em',
    },
    '& :where(h1)': {
      fontSize: '2.6666667em',
      marginTop: '0',
      marginBottom: '0.8333333em',
      lineHeight: '1',
    },
    '& :where(h2)': {
      fontSize: '1.6666667em',
      marginTop: '1.8666667em',
      marginBottom: '1.0666667em',
      lineHeight: '1.3333333',
    },
    '& :where(h3)': {
      fontSize: '1.3333333em',
      marginTop: '1.6666667em',
      marginBottom: '0.6666667em',
      lineHeight: '1.5',
    },
    '& :where(h4)': {
      marginTop: '1.7777778em',
      marginBottom: '0.4444444em',
      lineHeight: '1.5555556',
    },
    '& :where(img)': {
      marginTop: '1.7777778em',
      marginBottom: '1.7777778em',
    },
    '& :where(video)': {
      marginTop: '1.7777778em',
      marginBottom: '1.7777778em',
    },
    '& :where(ol)': {
      marginTop: '1.3333333em',
      marginBottom: '1.3333333em',
      paddingInlineStart: '1.5555556em',
    },
    '& :where(ul)': {
      marginTop: '1.3333333em',
      marginBottom: '1.3333333em',
      paddingInlineStart: '1.5555556em',
    },
    '& :where(li)': {
      marginTop: '0.6666667em',
      marginBottom: '0.6666667em',
    },
    '& :where(ol > li)': {
      paddingInlineStart: '0.4444444em',
    },
    '& :where(ul > li)': {
      paddingInlineStart: '0.4444444em',
    },
    '& > :where(ul > li p)': {
      marginTop: '0.8888889em',
      marginBottom: '0.8888889em',
    },
    '& > :where(ul > li > p:first-child)': {
      marginTop: '1.3333333em',
    },
    '& > :where(ul > li > p:last-child)': {
      marginBottom: '1.3333333em',
    },
    '& > :where(ol > li > p:first-child)': {
      marginTop: '1.3333333em',
    },
    '& > :where(ol > li > p:last-child)': {
      marginBottom: '1.3333333em',
    },
    '& :where(ul ul), & :where(ul ol), & :where(ol ul), & :where(ol ol)': {
      marginTop: '0.8888889em',
      marginBottom: '0.8888889em',
    },
    '& :where(figure)': {
      marginTop: '1.7777778em',
      marginBottom: '1.7777778em',
    },
    '& :where(figcaption)': {
      fontSize: '0.8888889em',
      lineHeight: '1.5',
      marginTop: '1em',
    },
  },
  xl: {
    fontSize: '1.25rem',
    lineHeight: '1.8',
    '& :where(p)': {
      marginTop: '1.2em',
      marginBottom: '1.2em',
    },
    '& :where(blockquote)': {
      marginTop: '1.6em',
      marginBottom: '1.6em',
      paddingInlineStart: '1.0666667em',
    },
    '& :where(h1)': {
      fontSize: '2.8em',
      marginTop: '0',
      marginBottom: '0.8571429em',
      lineHeight: '1',
    },
    '& :where(h2)': {
      fontSize: '1.8em',
      marginTop: '1.5555556em',
      marginBottom: '0.8888889em',
      lineHeight: '1.1111111',
    },
    '& :where(h3)': {
      fontSize: '1.5em',
      marginTop: '1.6em',
      marginBottom: '0.6666667em',
      lineHeight: '1.3333333',
    },
    '& :where(h4)': {
      marginTop: '1.8em',
      marginBottom: '0.6em',
      lineHeight: '1.6',
    },
    '& :where(img)': {
      marginTop: '2em',
      marginBottom: '2em',
    },
    '& :where(video)': {
      marginTop: '2em',
      marginBottom: '2em',
    },
    '& :where(ol)': {
      marginTop: '1.2em',
      marginBottom: '1.2em',
      paddingInlineStart: '1.6em',
    },
    '& :where(ul)': {
      marginTop: '1.2em',
      marginBottom: '1.2em',
      paddingInlineStart: '1.6em',
    },
    '& :where(li)': {
      marginTop: '0.6em',
      marginBottom: '0.6em',
    },
    '& :where(ol > li)': {
      paddingInlineStart: '0.4em',
    },
    '& :where(ul > li)': {
      paddingInlineStart: '0.4em',
    },
    '& > :where(ul > li p)': {
      marginTop: '0.8em',
      marginBottom: '0.8em',
    },
    '& > :where(ul > li > p:first-child)': {
      marginTop: '1.2em',
    },
    '& > :where(ul > li > p:last-child)': {
      marginBottom: '1.2em',
    },
    '& > :where(ol > li > p:first-child)': {
      marginTop: '1.2em',
    },
    '& > :where(ol > li > p:last-child)': {
      marginBottom: '1.2em',
    },
    '& :where(ul ul), & :where(ul ol), & :where(ol ul), & :where(ol ol)': {
      marginTop: '0.8em',
      marginBottom: '0.8em',
    },
    '& :where(figure)': {
      marginTop: '2em',
      marginBottom: '2em',
    },
    '& :where(figcaption)': {
      fontSize: '0.9em',
      lineHeight: '1.5555556',
      marginTop: '1em',
    },
  },
  '2xl': {
    fontSize: '1.5rem',
    lineHeight: '1.6666667',
    '& :where(p)': {
      marginTop: '1.3333333em',
      marginBottom: '1.3333333em',
    },
    '& :where(blockquote)': {
      marginTop: '1.7777778em',
      marginBottom: '1.7777778em',
      paddingInlineStart: '1.1111111em',
    },
    '& :where(h1)': {
      fontSize: '2.6666667em',
      marginTop: '0',
      marginBottom: '0.875em',
      lineHeight: '1',
    },
    '& :where(h2)': {
      fontSize: '2em',
      marginTop: '1.5em',
      marginBottom: '0.8333333em',
      lineHeight: '1.0833333',
    },
    '& :where(h3)': {
      fontSize: '1.5em',
      marginTop: '1.5555556em',
      marginBottom: '0.6666667em',
      lineHeight: '1.2222222',
    },
    '& :where(h4)': {
      marginTop: '1.6666667em',
      marginBottom: '0.6666667em',
      lineHeight: '1.5',
    },
    '& :where(img)': {
      marginTop: '2em',
      marginBottom: '2em',
    },
    '& :where(video)': {
      marginTop: '2em',
      marginBottom: '2em',
    },
    '& :where(ol)': {
      marginTop: '1.3333333em',
      marginBottom: '1.3333333em',
      paddingInlineStart: '1.5833333em',
    },
    '& :where(ul)': {
      marginTop: '1.3333333em',
      marginBottom: '1.3333333em',
      paddingInlineStart: '1.5833333em',
    },
    '& :where(li)': {
      marginTop: '0.5em',
      marginBottom: '0.5em',
    },
    '& :where(ol > li)': {
      paddingInlineStart: '0.4166667em',
    },
    '& :where(ul > li)': {
      paddingInlineStart: '0.4166667em',
    },
    '& > :where(ul > li p)': {
      marginTop: '0.8333333em',
      marginBottom: '0.8333333em',
    },
    '& > :where(ul > li > p:first-child)': {
      marginTop: '1.3333333em',
    },
    '& > :where(ul > li > p:last-child)': {
      marginBottom: '1.3333333em',
    },
    '& > :where(ol > li > p:first-child)': {
      marginTop: '1.3333333em',
    },
    '& > :where(ol > li > p:last-child)': {
      marginBottom: '1.3333333em',
    },
    '& :where(ul ul), & :where(ul ol), & :where(ol ul), & :where(ol ol)': {
      marginTop: '0.6666667em',
      marginBottom: '0.6666667em',
    },
    '& :where(figure)': {
      marginTop: '2em',
      marginBottom: '2em',
    },
    '& :where(figcaption)': {
      fontSize: '0.8333333em',
      lineHeight: '1.6',
      marginTop: '1em',
    },
  },
}
export function mergeCss(...styles: CSS[]): CSS {
  const result: CSS = {}
  for (const style of styles)
    for (const [key, value] of Object.entries(style)) {
      const previous = result[key]
      result[key] =
        value && typeof value === 'object' && previous && typeof previous === 'object'
          ? mergeCss(previous, value)
          : value
    }
  return result
}
export const proseBase: CSS = {
  ...proseSizes.base,
  color: 'color-mix(in oklab, var(--theme-fg) 80%, transparent)',
  maxWidth: '65ch',
  fontSize: '1rem',
  lineHeight: 1.75,
  '& :where(p)': { marginBlock: '1.25em' },
  '& :where(a)': { color: 'var(--theme-fg)', fontWeight: 500, textDecoration: 'underline' },
  '& :where(strong)': { color: 'var(--theme-fg)', fontWeight: 600 },
  '& :where(h1), & :where(h2), & :where(h3), & :where(h4)': {
    color: 'var(--theme-fg)',
    fontWeight: 700,
  },
  '& :where(h1)': {
    fontSize: '2.25em',
    fontWeight: 800,
    lineHeight: 1.111111,
    marginTop: 0,
    marginBottom: '0.888889em',
  },
  '& :where(h2)': {
    fontSize: '1.5em',
    lineHeight: 1.333333,
    marginTop: '2em',
    marginBottom: '1em',
  },
  '& :where(h3)': {
    fontSize: '1.25em',
    fontWeight: 600,
    lineHeight: 1.6,
    marginTop: '1.6em',
    marginBottom: '0.6em',
  },
  '& :where(h4)': { fontWeight: 600, lineHeight: 1.5, marginTop: '1.5em', marginBottom: '0.5em' },
  '& :where(h2) + *, & :where(h3) + *, & :where(h4) + *': { marginTop: 0 },
  '& :where(blockquote)': {
    fontWeight: 500,
    fontStyle: 'italic',
    color: 'color-mix(in oklab, var(--theme-fg) 60%, transparent)',
    borderInlineStart: '0.25rem solid var(--theme-accent)',
    marginBlock: '1.6em',
    paddingInlineStart: '1em',
  },
  '& :where(ul), & :where(ol)': { marginBlock: '1.25em', paddingInlineStart: '1.625em' },
  '& :where(ul)': { listStyleType: 'disc' },
  '& :where(ol)': { listStyleType: 'decimal' },
  '& :where(li)': { marginBlock: '0.5em', paddingInlineStart: '0.375em' },
  '& :where(li)::marker': { color: 'var(--theme-accent)' },
  '& :where(ul) ul, & :where(ul) ol, & :where(ol) ul, & :where(ol) ol': { marginBlock: '0.75em' },
  '& :where(hr)': {
    borderTop: '1px solid color-mix(in oklab, var(--theme-fg) 30%, transparent)',
    marginBlock: '3em',
  },
  '& :where(img), & :where(video), & :where(figure)': { marginBlock: '2em' },
  '& :where(figcaption)': {
    color: 'color-mix(in oklab, var(--theme-fg) 60%, transparent)',
    fontSize: '0.875em',
    lineHeight: 1.428571,
    marginTop: '0.857143em',
  },
  '& :where(code)': { color: 'var(--theme-fg)', fontSize: '0.875em', fontWeight: 600 },
  '& :where(pre)': {
    overflowX: 'auto',
    padding: '0.857143em 1.142857em',
    borderRadius: 6,
    marginBlock: '1.714286em',
    background: 'var(--theme-contrast)',
  },
  '& :where(table)': {
    textAlign: 'start',
    width: '100%',
    marginBlock: '2em',
    fontSize: '0.875em',
    lineHeight: 1.714286,
    tableLayout: 'auto',
  },
  '& :where(th)': {
    color: 'var(--theme-fg)',
    fontWeight: 600,
    verticalAlign: 'bottom',
    padding: '0 0.571429em 0.571429em',
    borderBottom: '1px solid color-mix(in oklab, var(--theme-fg) 30%, transparent)',
  },
  '& :where(td)': {
    verticalAlign: 'baseline',
    padding: '0.571429em',
    borderBottom: '1px solid color-mix(in oklab, var(--theme-fg) 20%, transparent)',
  },
  '& > :first-child': { marginTop: 0 },
  '& > :last-child': { marginBottom: 0 },
  ...linkFocus,
}
export const largeProse = css(mergeCss(proseBase, { [lg]: proseSizes.xl }))
export const centeredProse = css({ marginInline: 'auto', paddingInline: '1rem' })
export const proseRules = css(hr)
