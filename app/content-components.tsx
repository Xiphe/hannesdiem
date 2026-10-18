import { css, clientEntry, type Handle, type RemixNode } from 'remix/component'
import type {
  ImageProps, PageProps, HeroProps, TextBlockProps, ImageBandProps,
  TwoColumnTextProps, ProseProps, ButtonProps, IconProps, IconListProps,
  TimetableProps, ReleaseProps, SongProps, LinkTreeProps,
} from '@hannesdiem/content-components'
import { getMedia } from './media.ts'
import { ServiceLogo } from './icons.tsx'
import { LocalDate as DateComponent } from './date.tsx'
import assets from '../.generated/assets.json' with { type: 'json' }

const LocalDate = clientEntry(`${assets.date}#LocalDate`, DateComponent)

type CSS = Parameters<typeof css>[0]
const sm = '@media (width >= 40rem)', md = '@media (width >= 48rem)', lg = '@media (width >= 64rem)'
const dark = '@media (prefers-color-scheme: dark)'
const focus: CSS = { outlineOffset: 4, '&:focus-visible': { outline: '4px solid var(--theme-fg)', zIndex: 10 } }
const linkFocus: CSS = { '& :where(a)': { borderRadius: 2, ...focus } }
const hr: CSS = { '& hr': { borderColor: 'var(--theme-fg)', width: '16rem', borderWidth: 4, marginInline: 'auto', marginTop: '4rem' } }
// Legacy typography metrics, rendered with Remix instead of a CSS framework.
const proseSizes: Record<'sm' | 'base' | 'lg' | 'xl' | '2xl', CSS> = {
  "sm": {
    "fontSize": "0.875rem",
    "lineHeight": "1.7142857",
    "& :where(p)": {
      "marginTop": "1.1428571em",
      "marginBottom": "1.1428571em"
    },
    "& :where(blockquote)": {
      "marginTop": "1.3333333em",
      "marginBottom": "1.3333333em",
      "paddingInlineStart": "1.1111111em"
    },
    "& :where(h1)": {
      "fontSize": "2.1428571em",
      "marginTop": "0",
      "marginBottom": "0.8em",
      "lineHeight": "1.2"
    },
    "& :where(h2)": {
      "fontSize": "1.4285714em",
      "marginTop": "1.6em",
      "marginBottom": "0.8em",
      "lineHeight": "1.4"
    },
    "& :where(h3)": {
      "fontSize": "1.2857143em",
      "marginTop": "1.5555556em",
      "marginBottom": "0.4444444em",
      "lineHeight": "1.5555556"
    },
    "& :where(h4)": {
      "marginTop": "1.4285714em",
      "marginBottom": "0.5714286em",
      "lineHeight": "1.4285714"
    },
    "& :where(img)": {
      "marginTop": "1.7142857em",
      "marginBottom": "1.7142857em"
    },
    "& :where(video)": {
      "marginTop": "1.7142857em",
      "marginBottom": "1.7142857em"
    },
    "& :where(ol)": {
      "marginTop": "1.1428571em",
      "marginBottom": "1.1428571em",
      "paddingInlineStart": "1.5714286em"
    },
    "& :where(ul)": {
      "marginTop": "1.1428571em",
      "marginBottom": "1.1428571em",
      "paddingInlineStart": "1.5714286em"
    },
    "& :where(li)": {
      "marginTop": "0.2857143em",
      "marginBottom": "0.2857143em"
    },
    "& :where(ol > li)": {
      "paddingInlineStart": "0.4285714em"
    },
    "& :where(ul > li)": {
      "paddingInlineStart": "0.4285714em"
    },
    "& > :where(ul > li p)": {
      "marginTop": "0.5714286em",
      "marginBottom": "0.5714286em"
    },
    "& > :where(ul > li > p:first-child)": {
      "marginTop": "1.1428571em"
    },
    "& > :where(ul > li > p:last-child)": {
      "marginBottom": "1.1428571em"
    },
    "& > :where(ol > li > p:first-child)": {
      "marginTop": "1.1428571em"
    },
    "& > :where(ol > li > p:last-child)": {
      "marginBottom": "1.1428571em"
    },
    "& :where(ul ul), & :where(ul ol), & :where(ol ul), & :where(ol ol)": {
      "marginTop": "0.5714286em",
      "marginBottom": "0.5714286em"
    },
    "& :where(figure)": {
      "marginTop": "1.7142857em",
      "marginBottom": "1.7142857em"
    },
    "& :where(figcaption)": {
      "fontSize": "0.8571429em",
      "lineHeight": "1.3333333",
      "marginTop": "0.6666667em"
    }
  },
  "base": {
    "fontSize": "1rem",
    "lineHeight": "1.75",
    "& :where(p)": {
      "marginTop": "1.25em",
      "marginBottom": "1.25em"
    },
    "& :where(blockquote)": {
      "marginTop": "1.6em",
      "marginBottom": "1.6em",
      "paddingInlineStart": "1em"
    },
    "& :where(h1)": {
      "fontSize": "2.25em",
      "marginTop": "0",
      "marginBottom": "0.8888889em",
      "lineHeight": "1.1111111"
    },
    "& :where(h2)": {
      "fontSize": "1.5em",
      "marginTop": "2em",
      "marginBottom": "1em",
      "lineHeight": "1.3333333"
    },
    "& :where(h3)": {
      "fontSize": "1.25em",
      "marginTop": "1.6em",
      "marginBottom": "0.6em",
      "lineHeight": "1.6"
    },
    "& :where(h4)": {
      "marginTop": "1.5em",
      "marginBottom": "0.5em",
      "lineHeight": "1.5"
    },
    "& :where(img)": {
      "marginTop": "2em",
      "marginBottom": "2em"
    },
    "& :where(video)": {
      "marginTop": "2em",
      "marginBottom": "2em"
    },
    "& :where(ol)": {
      "marginTop": "1.25em",
      "marginBottom": "1.25em",
      "paddingInlineStart": "1.625em"
    },
    "& :where(ul)": {
      "marginTop": "1.25em",
      "marginBottom": "1.25em",
      "paddingInlineStart": "1.625em"
    },
    "& :where(li)": {
      "marginTop": "0.5em",
      "marginBottom": "0.5em"
    },
    "& :where(ol > li)": {
      "paddingInlineStart": "0.375em"
    },
    "& :where(ul > li)": {
      "paddingInlineStart": "0.375em"
    },
    "& > :where(ul > li p)": {
      "marginTop": "0.75em",
      "marginBottom": "0.75em"
    },
    "& > :where(ul > li > p:first-child)": {
      "marginTop": "1.25em"
    },
    "& > :where(ul > li > p:last-child)": {
      "marginBottom": "1.25em"
    },
    "& > :where(ol > li > p:first-child)": {
      "marginTop": "1.25em"
    },
    "& > :where(ol > li > p:last-child)": {
      "marginBottom": "1.25em"
    },
    "& :where(ul ul), & :where(ul ol), & :where(ol ul), & :where(ol ol)": {
      "marginTop": "0.75em",
      "marginBottom": "0.75em"
    },
    "& :where(figure)": {
      "marginTop": "2em",
      "marginBottom": "2em"
    },
    "& :where(figcaption)": {
      "fontSize": "0.875em",
      "lineHeight": "1.4285714",
      "marginTop": "0.8571429em"
    }
  },
  "lg": {
    "fontSize": "1.125rem",
    "lineHeight": "1.7777778",
    "& :where(p)": {
      "marginTop": "1.3333333em",
      "marginBottom": "1.3333333em"
    },
    "& :where(blockquote)": {
      "marginTop": "1.6666667em",
      "marginBottom": "1.6666667em",
      "paddingInlineStart": "1em"
    },
    "& :where(h1)": {
      "fontSize": "2.6666667em",
      "marginTop": "0",
      "marginBottom": "0.8333333em",
      "lineHeight": "1"
    },
    "& :where(h2)": {
      "fontSize": "1.6666667em",
      "marginTop": "1.8666667em",
      "marginBottom": "1.0666667em",
      "lineHeight": "1.3333333"
    },
    "& :where(h3)": {
      "fontSize": "1.3333333em",
      "marginTop": "1.6666667em",
      "marginBottom": "0.6666667em",
      "lineHeight": "1.5"
    },
    "& :where(h4)": {
      "marginTop": "1.7777778em",
      "marginBottom": "0.4444444em",
      "lineHeight": "1.5555556"
    },
    "& :where(img)": {
      "marginTop": "1.7777778em",
      "marginBottom": "1.7777778em"
    },
    "& :where(video)": {
      "marginTop": "1.7777778em",
      "marginBottom": "1.7777778em"
    },
    "& :where(ol)": {
      "marginTop": "1.3333333em",
      "marginBottom": "1.3333333em",
      "paddingInlineStart": "1.5555556em"
    },
    "& :where(ul)": {
      "marginTop": "1.3333333em",
      "marginBottom": "1.3333333em",
      "paddingInlineStart": "1.5555556em"
    },
    "& :where(li)": {
      "marginTop": "0.6666667em",
      "marginBottom": "0.6666667em"
    },
    "& :where(ol > li)": {
      "paddingInlineStart": "0.4444444em"
    },
    "& :where(ul > li)": {
      "paddingInlineStart": "0.4444444em"
    },
    "& > :where(ul > li p)": {
      "marginTop": "0.8888889em",
      "marginBottom": "0.8888889em"
    },
    "& > :where(ul > li > p:first-child)": {
      "marginTop": "1.3333333em"
    },
    "& > :where(ul > li > p:last-child)": {
      "marginBottom": "1.3333333em"
    },
    "& > :where(ol > li > p:first-child)": {
      "marginTop": "1.3333333em"
    },
    "& > :where(ol > li > p:last-child)": {
      "marginBottom": "1.3333333em"
    },
    "& :where(ul ul), & :where(ul ol), & :where(ol ul), & :where(ol ol)": {
      "marginTop": "0.8888889em",
      "marginBottom": "0.8888889em"
    },
    "& :where(figure)": {
      "marginTop": "1.7777778em",
      "marginBottom": "1.7777778em"
    },
    "& :where(figcaption)": {
      "fontSize": "0.8888889em",
      "lineHeight": "1.5",
      "marginTop": "1em"
    }
  },
  "xl": {
    "fontSize": "1.25rem",
    "lineHeight": "1.8",
    "& :where(p)": {
      "marginTop": "1.2em",
      "marginBottom": "1.2em"
    },
    "& :where(blockquote)": {
      "marginTop": "1.6em",
      "marginBottom": "1.6em",
      "paddingInlineStart": "1.0666667em"
    },
    "& :where(h1)": {
      "fontSize": "2.8em",
      "marginTop": "0",
      "marginBottom": "0.8571429em",
      "lineHeight": "1"
    },
    "& :where(h2)": {
      "fontSize": "1.8em",
      "marginTop": "1.5555556em",
      "marginBottom": "0.8888889em",
      "lineHeight": "1.1111111"
    },
    "& :where(h3)": {
      "fontSize": "1.5em",
      "marginTop": "1.6em",
      "marginBottom": "0.6666667em",
      "lineHeight": "1.3333333"
    },
    "& :where(h4)": {
      "marginTop": "1.8em",
      "marginBottom": "0.6em",
      "lineHeight": "1.6"
    },
    "& :where(img)": {
      "marginTop": "2em",
      "marginBottom": "2em"
    },
    "& :where(video)": {
      "marginTop": "2em",
      "marginBottom": "2em"
    },
    "& :where(ol)": {
      "marginTop": "1.2em",
      "marginBottom": "1.2em",
      "paddingInlineStart": "1.6em"
    },
    "& :where(ul)": {
      "marginTop": "1.2em",
      "marginBottom": "1.2em",
      "paddingInlineStart": "1.6em"
    },
    "& :where(li)": {
      "marginTop": "0.6em",
      "marginBottom": "0.6em"
    },
    "& :where(ol > li)": {
      "paddingInlineStart": "0.4em"
    },
    "& :where(ul > li)": {
      "paddingInlineStart": "0.4em"
    },
    "& > :where(ul > li p)": {
      "marginTop": "0.8em",
      "marginBottom": "0.8em"
    },
    "& > :where(ul > li > p:first-child)": {
      "marginTop": "1.2em"
    },
    "& > :where(ul > li > p:last-child)": {
      "marginBottom": "1.2em"
    },
    "& > :where(ol > li > p:first-child)": {
      "marginTop": "1.2em"
    },
    "& > :where(ol > li > p:last-child)": {
      "marginBottom": "1.2em"
    },
    "& :where(ul ul), & :where(ul ol), & :where(ol ul), & :where(ol ol)": {
      "marginTop": "0.8em",
      "marginBottom": "0.8em"
    },
    "& :where(figure)": {
      "marginTop": "2em",
      "marginBottom": "2em"
    },
    "& :where(figcaption)": {
      "fontSize": "0.9em",
      "lineHeight": "1.5555556",
      "marginTop": "1em"
    }
  },
  "2xl": {
    "fontSize": "1.5rem",
    "lineHeight": "1.6666667",
    "& :where(p)": {
      "marginTop": "1.3333333em",
      "marginBottom": "1.3333333em"
    },
    "& :where(blockquote)": {
      "marginTop": "1.7777778em",
      "marginBottom": "1.7777778em",
      "paddingInlineStart": "1.1111111em"
    },
    "& :where(h1)": {
      "fontSize": "2.6666667em",
      "marginTop": "0",
      "marginBottom": "0.875em",
      "lineHeight": "1"
    },
    "& :where(h2)": {
      "fontSize": "2em",
      "marginTop": "1.5em",
      "marginBottom": "0.8333333em",
      "lineHeight": "1.0833333"
    },
    "& :where(h3)": {
      "fontSize": "1.5em",
      "marginTop": "1.5555556em",
      "marginBottom": "0.6666667em",
      "lineHeight": "1.2222222"
    },
    "& :where(h4)": {
      "marginTop": "1.6666667em",
      "marginBottom": "0.6666667em",
      "lineHeight": "1.5"
    },
    "& :where(img)": {
      "marginTop": "2em",
      "marginBottom": "2em"
    },
    "& :where(video)": {
      "marginTop": "2em",
      "marginBottom": "2em"
    },
    "& :where(ol)": {
      "marginTop": "1.3333333em",
      "marginBottom": "1.3333333em",
      "paddingInlineStart": "1.5833333em"
    },
    "& :where(ul)": {
      "marginTop": "1.3333333em",
      "marginBottom": "1.3333333em",
      "paddingInlineStart": "1.5833333em"
    },
    "& :where(li)": {
      "marginTop": "0.5em",
      "marginBottom": "0.5em"
    },
    "& :where(ol > li)": {
      "paddingInlineStart": "0.4166667em"
    },
    "& :where(ul > li)": {
      "paddingInlineStart": "0.4166667em"
    },
    "& > :where(ul > li p)": {
      "marginTop": "0.8333333em",
      "marginBottom": "0.8333333em"
    },
    "& > :where(ul > li > p:first-child)": {
      "marginTop": "1.3333333em"
    },
    "& > :where(ul > li > p:last-child)": {
      "marginBottom": "1.3333333em"
    },
    "& > :where(ol > li > p:first-child)": {
      "marginTop": "1.3333333em"
    },
    "& > :where(ol > li > p:last-child)": {
      "marginBottom": "1.3333333em"
    },
    "& :where(ul ul), & :where(ul ol), & :where(ol ul), & :where(ol ol)": {
      "marginTop": "0.6666667em",
      "marginBottom": "0.6666667em"
    },
    "& :where(figure)": {
      "marginTop": "2em",
      "marginBottom": "2em"
    },
    "& :where(figcaption)": {
      "fontSize": "0.8333333em",
      "lineHeight": "1.6",
      "marginTop": "1em"
    }
  }
}
function mergeCss(...styles: CSS[]): CSS {
  const result: CSS = {}
  for (const style of styles) for (const [key, value] of Object.entries(style)) {
    const previous = result[key]
    result[key] = value && typeof value === 'object' && previous && typeof previous === 'object'
      ? mergeCss(previous, value) : value
  }
  return result
}
const proseBase: CSS = {
  ...proseSizes.base,
  color: 'color-mix(in oklab, var(--theme-fg) 80%, transparent)', maxWidth: '65ch', fontSize: '1rem', lineHeight: 1.75,
  '& :where(p)': { marginBlock: '1.25em' },
  '& :where(a)': { color: 'var(--theme-fg)', fontWeight: 500, textDecoration: 'underline' },
  '& :where(strong)': { color: 'var(--theme-fg)', fontWeight: 600 },
  '& :where(h1), & :where(h2), & :where(h3), & :where(h4)': { color: 'var(--theme-fg)', fontWeight: 700 },
  '& :where(h1)': { fontSize: '2.25em', fontWeight: 800, lineHeight: 1.111111, marginTop: 0, marginBottom: '0.888889em' },
  '& :where(h2)': { fontSize: '1.5em', lineHeight: 1.333333, marginTop: '2em', marginBottom: '1em' },
  '& :where(h3)': { fontSize: '1.25em', fontWeight: 600, lineHeight: 1.6, marginTop: '1.6em', marginBottom: '0.6em' },
  '& :where(h4)': { fontWeight: 600, lineHeight: 1.5, marginTop: '1.5em', marginBottom: '0.5em' },
  '& :where(h2) + *, & :where(h3) + *, & :where(h4) + *': { marginTop: 0 },
  '& :where(blockquote)': { fontWeight: 500, fontStyle: 'italic', color: 'color-mix(in oklab, var(--theme-fg) 60%, transparent)', borderInlineStart: '0.25rem solid var(--theme-accent)', marginBlock: '1.6em', paddingInlineStart: '1em' },
  '& :where(ul), & :where(ol)': { marginBlock: '1.25em', paddingInlineStart: '1.625em' },
  '& :where(ul)': { listStyleType: 'disc' }, '& :where(ol)': { listStyleType: 'decimal' },
  '& :where(li)': { marginBlock: '0.5em', paddingInlineStart: '0.375em' },
  '& :where(li)::marker': { color: 'var(--theme-accent)' },
  '& :where(ul) ul, & :where(ul) ol, & :where(ol) ul, & :where(ol) ol': { marginBlock: '0.75em' },
  '& :where(hr)': { borderTop: '1px solid color-mix(in oklab, var(--theme-fg) 30%, transparent)', marginBlock: '3em' },
  '& :where(img), & :where(video), & :where(figure)': { marginBlock: '2em' },
  '& :where(figcaption)': { color: 'color-mix(in oklab, var(--theme-fg) 60%, transparent)', fontSize: '0.875em', lineHeight: 1.428571, marginTop: '0.857143em' },
  '& :where(code)': { color: 'var(--theme-fg)', fontSize: '0.875em', fontWeight: 600 },
  '& :where(pre)': { overflowX: 'auto', padding: '0.857143em 1.142857em', borderRadius: 6, marginBlock: '1.714286em', background: 'var(--theme-contrast)' },
  '& :where(table)': { textAlign: 'start', width: '100%', marginBlock: '2em', fontSize: '0.875em', lineHeight: 1.714286, tableLayout: 'auto' },
  '& :where(th)': { color: 'var(--theme-fg)', fontWeight: 600, verticalAlign: 'bottom', padding: '0 0.571429em 0.571429em', borderBottom: '1px solid color-mix(in oklab, var(--theme-fg) 30%, transparent)' },
  '& :where(td)': { verticalAlign: 'baseline', padding: '0.571429em', borderBottom: '1px solid color-mix(in oklab, var(--theme-fg) 20%, transparent)' },
  '& > :first-child': { marginTop: 0 }, '& > :last-child': { marginBottom: 0 },
  ...linkFocus,
}
const prose = css(proseBase)
const largeProse = css(mergeCss(proseBase, { [lg]: proseSizes.xl }))
const centeredProse = css({ marginInline: 'auto', paddingInline: '1rem' })
const proseRules = css(hr)

function lines(text?: string): RemixNode {
  return text?.split(/\r\n|\n|\\n|<br ?\/?\>/g).map((line, index) => <>{index ? <br /> : null}{line}</>)
}
function imageElement(image: string, options: { alt?: string; sizes?: string; priority?: boolean; title?: string; fill?: boolean; style?: CSS } = {}) {
  const item = getMedia(image)
  return <img src={item.src} srcSet={item.srcSet} width={item.width} height={item.height}
    alt={options.alt ?? item.alt ?? ''} sizes={options.sizes} title={options.title}
    loading={options.priority ? 'eager' : 'lazy'} fetchPriority={options.priority ? 'high' : undefined} decoding="async"
    mix={css({ display: 'block', margin: '0!important', objectFit: 'cover',
      ...(options.fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } : { width: '100%', height: 'auto' }),
      ...options.style })}
    style={{ backgroundColor: item.color, objectPosition: `${item.focalX ?? 50}% ${item.focalY ?? 50}%` }} />
}
export function Image(handle: Handle<ImageProps>) {
  return () => imageElement(handle.props.image, handle.props)
}
export function Page(handle: Handle<PageProps>) {
  return () => <div mix={css({ paddingBottom: '6rem', paddingTop: handle.props.firstIsHero ? 0 : '6rem' })}>{handle.props.children}</div>
}
const heroStyle = css({ position: 'relative', display: 'flex', minHeight: '80vh', flexDirection: 'column', overflow: 'hidden', paddingTop: '3rem', paddingBottom: '5rem' })
const heroPull = css({ [sm]: { marginTop: '-3rem' }, [md]: { marginTop: '-6rem' } })
const grow = css({ flexGrow: 1 })
export function Hero(handle: Handle<HeroProps>) {
  return () => {
    const { title, subtitle, image, first, pullUp, textColor } = handle.props
    const Comp = first ? 'header' : 'div', H1 = first ? 'h1' : 'h2', H2 = first ? 'h2' : 'h3'
    return <Comp mix={[heroStyle, !first && pullUp && heroPull]}>
      {image ? imageElement(image, { fill: true, priority: first, sizes: '(max-width: 639px) 200vw, 100vw' }) : null}
      <div mix={grow} />
      <div mix={css({ position: 'relative', zIndex: 10 })}>
        <div mix={[largeProse, centeredProse, css({ '--theme-fg': textColor === 'light' ? '#fff' : '#111827' })]}>
          <div mix={css({ display: 'flex', flexDirection: 'column', textShadow: textColor === 'light' ? '0 0 50px black, 0 0 5px rgb(0 0 0 / 50%)' : '0 0 100px rgb(255 255 255 / 50%)' })}>
            {title ? <H1 mix={css({ margin: '0!important', marginLeft: '-0.375rem!important', fontSize: '4.5rem!important', lineHeight: '1!important', [sm]: { fontSize: '6rem!important' } })}>{lines(title)}</H1> : null}
            {subtitle ? <H2 mix={css({ marginTop: '1rem!important', marginBottom: '0!important', fontWeight: '400!important' })}>{lines(subtitle)}</H2> : null}
          </div>
        </div>
      </div>
      <div mix={grow} />
    </Comp>
  }
}
const textBox = css({ background: 'var(--theme-contrast)', marginInline: 'auto', padding: '2rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)', position: 'relative', zIndex: 10,
  '& > :is(h1,h2,h3,h4):first-child': { background: 'var(--theme-accent)', color: 'var(--theme-fg)', padding: '1.5rem', marginTop: '-2rem', marginInline: '-2rem', marginBottom: '1rem', [md]: { translate: '-2rem -2rem', marginBottom: '-1rem' } },
  [sm]: { marginBottom: '2rem' },
})
export function TextBlock(handle: Handle<TextBlockProps>) {
  return () => {
    const { title, portrait, pullUp = true, bigOnLg = true, as: Comp = 'section', children } = handle.props
    return <>
      {portrait ? <div mix={css({ position: 'relative', zIndex: 20, marginInline: 'auto', marginBottom: '-1.5rem', maxWidth: '24rem', paddingInline: '2rem', [md]: { marginBottom: '0.5rem' } })}>
        <div mix={css({ borderRadius: '50%', overflow: 'hidden' })}>{imageElement(portrait, { sizes: '320px' })}</div>
      </div> : null}
      <Comp mix={[bigOnLg ? largeProse : prose, textBox, pullUp && !portrait && css({ [sm]: { marginTop: '-0.5rem' }, [md]: { marginTop: '-2rem' } })]}>
        {title ? <h2>{title}</h2> : null}{children}
      </Comp>
    </>
  }
}
export function TwoColumnText(handle: Handle<TwoColumnTextProps>) {
  return () => <section>
    {handle.props.headline ? <h2 mix={css({ marginBlock: '2rem', textAlign: 'center', fontSize: '3.75rem', lineHeight: 1, fontWeight: 700, [md]: { marginBlock: '4rem' } })}>{handle.props.headline}</h2> : null}
    <div mix={css({ marginInline: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4rem 2rem', [lg]: { flexDirection: 'row', gap: '5rem', paddingInline: '6rem' } })}>{handle.props.children}</div>
  </section>
}
export function Prose(handle: Handle<ProseProps>) {
  return () => {
    const sizes = {
      small: mergeCss(proseBase, proseSizes.sm, { [lg]: proseSizes.base }),
      medium: mergeCss(proseBase, { [lg]: proseSizes.lg }),
      large: mergeCss(proseBase, proseSizes.lg, { [lg]: proseSizes.xl }),
      xl: mergeCss(proseBase, proseSizes.xl, { [lg]: proseSizes['2xl'] }),
    }
    return <section mix={[css(handle.props.bigOnLg ? mergeCss(sizes[handle.props.textSize ?? 'medium'], { [lg]: proseSizes.xl }) : sizes[handle.props.textSize ?? 'medium']), centeredProse, proseRules]}>{handle.props.children}</section>
  }
}
export function ImageBand(handle: Handle<ImageBandProps>) {
  return () => {
    const { title, smallTitle, images, pullUp, breakPoint = 'sm' } = handle.props
    const breakpoint = { none: '', sm, md, lg }[breakPoint]
    const parallel = images.reduce((sum, item) => { const image = getMedia(item.image); return sum + image.width / image.height }, 0)
    const stacked = images.reduce((sum, item) => { const image = getMedia(item.image); return sum + (item.includeStacked === false ? 0 : image.height / image.width) }, 0)
    const layout = { display: breakPoint === 'none' ? 'flex' : 'block', aspectRatio: breakPoint === 'none' ? 'var(--parallel-aspect)' : 'var(--stacked-aspect)', ...(breakpoint ? { [breakpoint]: { display: 'flex', aspectRatio: 'var(--parallel-aspect)' } } : {}) }
    return <div mix={pullUp && css({ [sm]: { marginTop: '-3rem' }, [md]: { marginTop: '-4rem' } })}>
      <div style={{ '--stacked-aspect': `1 / ${stacked}`, '--parallel-aspect': `${parallel} / 1` }}>
        <div mix={css({ height: 0 })}><div mix={css(layout)}>
          {images.map(item => {
            const image = getMedia(item.image), percent = Math.round(image.width / image.height / parallel * 10000) / 100
            return <div mix={css({ position: 'relative', width: '100%', aspectRatio: `${image.width} / ${image.height}`, flex: `${image.width / image.height} 1 0%`,
              display: breakPoint !== 'none' && item.includeStacked === false ? 'none' : 'block', ...(breakpoint ? { [breakpoint]: { display: 'block' } } : {}) })}>
              {imageElement(item.image, { title: item.title, fill: true, sizes: breakPoint === 'none' ? `${percent}vw` : `(min-width: ${({ sm: 640, md: 768, lg: 1024 } as const)[breakPoint as 'sm' | 'md' | 'lg']}px) ${percent}vw, 100vw` })}
            </div>
          })}
        </div></div>
        <div mix={css({ ...layout, pointerEvents: 'none', position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center' })}>
          {title || smallTitle ? <h4 mix={css({ textShadow: '0 0 50px black, 0 0 5px rgb(0 0 0 / 50%)', marginLeft: '2rem', fontSize: '3rem', lineHeight: 1, fontWeight: 700, color: 'var(--theme-dark-fg)', [sm]: { fontSize: '3.75rem' }, '@media (width >= 80rem)': { fontSize: '6rem' } })}>
            <span mix={css({ background: 'color-mix(in oklab, var(--theme-dark-contrast) 80%, transparent)' })}>
              {title ? <span mix={smallTitle && css({ display: breakPoint === 'none' ? 'inline' : 'none', ...(breakpoint ? { [breakpoint]: { display: 'inline' } } : {}) })}>{lines(title)}</span> : null}
              {smallTitle ? <span mix={title && css({ display: breakPoint === 'none' ? 'none' : 'inline', ...(breakpoint ? { [breakpoint]: { display: 'none' } } : {}) })}>{lines(smallTitle)}</span> : null}
            </span>
          </h4> : null}
        </div>
      </div>
    </div>
  }
}

const buttonBase: CSS = { ...focus, fontWeight: 700, display: 'inline-flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', textDecoration: 'none!important', fontSize: '1.125rem', lineHeight: 1.555556, padding: '1rem 1.5rem', border: '2px solid var(--theme-fg)', '&:disabled': { opacity: 0.5 } }
export function Button(handle: Handle<ButtonProps>) {
  return () => <a href={handle.props.href} target={handle.props.blank ? '_blank' : undefined} rel="noopener noreferrer" mix={css({ ...buttonBase, background: 'var(--theme-primary)', color: 'var(--theme-contrast)!important', ...(handle.props.icon ? { paddingLeft: '1.25rem' } : {}), '&:hover': { background: 'color-mix(in oklab, var(--theme-primary) 90%, transparent)' }, [dark]: { color: 'var(--theme-fg)!important' } })}>
    {handle.props.icon ? <Icon icon={handle.props.icon} iconLabel={handle.props.iconLabel} /> : null}{handle.props.label}
  </a>
}

// Heroicons SVG paths: https://github.com/tailwindlabs/heroicons (MIT).
const iconPaths: Record<string, { attrs: Record<string, string>; paths: Record<string, string>[] }> = {
  "ArrowRightIcon:solid": {
    "attrs": {
      "viewBox": "0 0 24 24",
      "fill": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "fillRule": "evenodd",
        "d": "M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z",
        "clipRule": "evenodd"
      }
    ]
  },
  "CursorArrowRaysIcon:solid": {
    "attrs": {
      "viewBox": "0 0 24 24",
      "fill": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "fillRule": "evenodd",
        "d": "M12 1.5a.75.75 0 0 1 .75.75V4.5a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 12 1.5ZM5.636 4.136a.75.75 0 0 1 1.06 0l1.592 1.591a.75.75 0 0 1-1.061 1.06l-1.591-1.59a.75.75 0 0 1 0-1.061Zm12.728 0a.75.75 0 0 1 0 1.06l-1.591 1.592a.75.75 0 0 1-1.06-1.061l1.59-1.591a.75.75 0 0 1 1.061 0Zm-6.816 4.496a.75.75 0 0 1 .82.311l5.228 7.917a.75.75 0 0 1-.777 1.148l-2.097-.43 1.045 3.9a.75.75 0 0 1-1.45.388l-1.044-3.899-1.601 1.42a.75.75 0 0 1-1.247-.606l.569-9.47a.75.75 0 0 1 .554-.68ZM3 10.5a.75.75 0 0 1 .75-.75H6a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10.5Zm14.25 0a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H18a.75.75 0 0 1-.75-.75Zm-8.962 3.712a.75.75 0 0 1 0 1.061l-1.591 1.591a.75.75 0 1 1-1.061-1.06l1.591-1.592a.75.75 0 0 1 1.06 0Z",
        "clipRule": "evenodd"
      }
    ]
  },
  "FireIcon:solid": {
    "attrs": {
      "viewBox": "0 0 24 24",
      "fill": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "fillRule": "evenodd",
        "d": "M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z",
        "clipRule": "evenodd"
      }
    ]
  },
  "MusicalNoteIcon:solid": {
    "attrs": {
      "viewBox": "0 0 24 24",
      "fill": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "fillRule": "evenodd",
        "d": "M19.952 1.651a.75.75 0 0 1 .298.599V16.303a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.403-4.909l2.311-.66a1.5 1.5 0 0 0 1.088-1.442V6.994l-9 2.572v9.737a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.402-4.909l2.31-.66a1.5 1.5 0 0 0 1.088-1.442V5.25a.75.75 0 0 1 .544-.721l10.5-3a.75.75 0 0 1 .658.122Z",
        "clipRule": "evenodd"
      }
    ]
  },
  "SparklesIcon:solid": {
    "attrs": {
      "viewBox": "0 0 24 24",
      "fill": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "fillRule": "evenodd",
        "d": "M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z",
        "clipRule": "evenodd"
      }
    ]
  },
  "UserGroupIcon:solid": {
    "attrs": {
      "viewBox": "0 0 24 24",
      "fill": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "fillRule": "evenodd",
        "d": "M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z",
        "clipRule": "evenodd"
      },
      {
        "d": "M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z"
      }
    ]
  },
  "SunIcon:solid": {
    "attrs": {
      "viewBox": "0 0 24 24",
      "fill": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "d": "M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z"
      }
    ]
  },
  "MoonIcon:solid": {
    "attrs": {
      "viewBox": "0 0 24 24",
      "fill": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "fillRule": "evenodd",
        "d": "M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z",
        "clipRule": "evenodd"
      }
    ]
  },
  "DocumentTextIcon:solid": {
    "attrs": {
      "viewBox": "0 0 24 24",
      "fill": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "fillRule": "evenodd",
        "d": "M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z",
        "clipRule": "evenodd"
      },
      {
        "d": "M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z"
      }
    ]
  },
  "ArrowRightIcon:outline": {
    "attrs": {
      "fill": "none",
      "viewBox": "0 0 24 24",
      "strokeWidth": "1.5",
      "stroke": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "d": "M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
      }
    ]
  },
  "CursorArrowRaysIcon:outline": {
    "attrs": {
      "fill": "none",
      "viewBox": "0 0 24 24",
      "strokeWidth": "1.5",
      "stroke": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "d": "M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
      }
    ]
  },
  "FireIcon:outline": {
    "attrs": {
      "fill": "none",
      "viewBox": "0 0 24 24",
      "strokeWidth": "1.5",
      "stroke": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "d": "M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
      },
      {
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "d": "M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"
      }
    ]
  },
  "MusicalNoteIcon:outline": {
    "attrs": {
      "fill": "none",
      "viewBox": "0 0 24 24",
      "strokeWidth": "1.5",
      "stroke": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "d": "m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
      }
    ]
  },
  "SparklesIcon:outline": {
    "attrs": {
      "fill": "none",
      "viewBox": "0 0 24 24",
      "strokeWidth": "1.5",
      "stroke": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "d": "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
      }
    ]
  },
  "UserGroupIcon:outline": {
    "attrs": {
      "fill": "none",
      "viewBox": "0 0 24 24",
      "strokeWidth": "1.5",
      "stroke": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "d": "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
      }
    ]
  },
  "SunIcon:outline": {
    "attrs": {
      "fill": "none",
      "viewBox": "0 0 24 24",
      "strokeWidth": "1.5",
      "stroke": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "d": "M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
      }
    ]
  },
  "MoonIcon:outline": {
    "attrs": {
      "fill": "none",
      "viewBox": "0 0 24 24",
      "strokeWidth": "1.5",
      "stroke": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "d": "M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
      }
    ]
  },
  "DocumentTextIcon:outline": {
    "attrs": {
      "fill": "none",
      "viewBox": "0 0 24 24",
      "strokeWidth": "1.5",
      "stroke": "currentColor",
      "aria-hidden": "true",
      "data-slot": "icon"
    },
    "paths": [
      {
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "d": "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      }
    ]
  }
}

export function Icon(handle: Handle<IconProps>) {
  return () => {
    const { icon, iconLabel, iconVariant = 'solid', iconSize = '1.5rem' } = handle.props
    const data = iconPaths[`${icon}:${iconVariant}`]
    if (!data) throw new Error(`Unsupported content icon: ${icon}`)
    return <svg {...data.attrs} role={iconLabel ? 'img' : undefined} aria-label={iconLabel} aria-hidden={iconLabel ? undefined : true} mix={css({ width: iconSize, height: iconSize, display: 'inline-block', flexShrink: 0 })}>
      {data.paths.map(path => <path {...path} />)}
    </svg>
  }
}
export function IconList(handle: Handle<IconListProps>) {
  return () => <ul mix={css({ listStyle: 'none!important', padding: '0!important' })}>
    {handle.props.list.map(item => <li mix={css({ margin: '0!important', display: 'flex', padding: '0!important' })}>
      <span mix={css({ display: 'inline-flex', margin: '0.5rem', marginTop: '0.25rem', flexShrink: 0, [lg]: { marginTop: '0.5rem' } })}><Icon icon={item.icon} iconLabel={item.iconLabel} iconSize="1.2em" /></span>{item.text}
    </li>)}
  </ul>
}
export function Timetable(handle: Handle<TimetableProps>) {
  return () => <div mix={css({ display: 'flex', gap: '1rem' })}>
    <div mix={css({ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' })}>
      <Icon icon="SunIcon" iconSize="2rem" />
      <div mix={css({ width: 1, flexGrow: 1, background: 'currentColor' })} />
      <span mix={css({ marginBottom: '0.25rem', [lg]: { marginBottom: '0.5rem' } })}><Icon icon="MoonIcon" iconSize="1.5rem" /></span>
    </div>
    <ul mix={css({ listStyle: 'none!important', padding: '0!important', margin: '0.125rem!important', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem', [lg]: { marginTop: '0!important' }, '& li': { padding: '0!important', margin: '0!important' }, '& p': { margin: 0 } })}>
      {handle.props.list.map(item => <li mix={css({ gridColumn: 'span 2 / span 2', display: 'grid', gridTemplateColumns: 'subgrid' })}>
        <div mix={css({ width: 'fit-content', flexShrink: 1, justifySelf: 'end', whiteSpace: 'nowrap' })}>{item.time}:</div><div>{item.title}</div>
      </li>)}
    </ul>
  </div>
}
function durationLabel(seconds: number, iso = false) {
  const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds - hours * 3600) / 60), remainder = seconds - hours * 3600 - minutes * 60
  if (iso) return `PT${hours}H${minutes}M${remainder}S`
  return [...(hours > 0 ? [String(hours).padStart(2, '0')] : []), String(minutes).padStart(2, '0'), String(remainder).padStart(2, '0')].join(':')
}
const shopNames: Record<string, string> = { spotify: 'Spotify', deezer: 'Deezer', applemusic: 'Apple Music', tidal: 'Tidal', amazonmusic: 'Amazon Music', youtubemusic: 'YouTube Music', pandora: 'Pandora', anghami: 'Anghami', awa: 'Awa', qobuz: 'Qobuz', soundcloud: 'SoundCloud' }
const softButton = css({ ...buttonBase, background: 'color-mix(in oklab, var(--theme-bg-to) 50%, transparent)', borderColor: 'color-mix(in oklab, var(--theme-fg) 70%, transparent)', color: 'var(--theme-fg)', '&:hover': { background: 'var(--theme-bg-to)' } })
const srOnly = css({ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 })
export function Release(handle: Handle<ReleaseProps>) {
  return () => {
    const release = handle.props
    const released = new Date(release.releaseDate ?? 0).getTime() <= Date.now()
    const shops = Object.keys(shopNames).flatMap(type => release.shops?.[type] ? [{ type, url: release.shops[type]! }] : [])
    return <div mix={css({ width: '100%', marginInline: 'auto', maxWidth: '80rem', paddingBottom: '2rem' })}>
      <div mix={css({ marginBottom: '1rem', gap: '1.5rem', [sm]: { padding: '1.5rem' }, [md]: { display: 'flex' }, [lg]: { gap: '4rem' } })}>
        {release.cover ? <div mix={css({ width: '100%', flexShrink: 0, [md]: { width: '50%' } })}>
          <div mix={css({ position: 'sticky', top: '1.5rem', overflow: 'hidden', [sm]: { borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 50%), 0 2px 4px -2px rgb(0 0 0 / 50%)' } })}>
            {imageElement(release.cover, { priority: true, sizes: '(max-width: 768px) 100vw, 50vw' })}
          </div>
        </div> : null}
        <div mix={css({ display: 'flex', width: '100%', flexDirection: 'column-reverse', gap: '3rem', padding: '1.5rem', [sm]: { paddingInline: 0 }, [md]: { flexDirection: 'column', paddingTop: 0 } })}>
          <div mix={[largeProse, proseRules]}>
            <h1 mix={release.subtitle && css({ marginBottom: '0!important' })}>{release.artist ? `${release.artist} - ` : null}{release.title}</h1>
            {release.subtitle ? <h2 mix={css({ marginTop: '0.5rem!important', fontSize: '1.875rem!important', lineHeight: '2.25rem!important', fontWeight: '400!important' })}>{release.subtitle}</h2> : null}
            <p>
              {release.releaseDate ? <><span mix={css({ opacity: 0.6 })}>{released ? 'Released' : 'Release'}: </span><LocalDate value={release.releaseDate} hideDay={release.hideReleaseDay} /><br /></> : null}
              {release.genres?.length ? <><span mix={css({ opacity: 0.6 })}>Genre{release.genres.length > 1 ? 's' : ''}: </span>{release.genres.join(', ')}<br /></> : null}
              {release.languages?.length ? <><span mix={css({ opacity: 0.6 })}>Language{release.languages.length > 1 ? 's' : ''}: </span>{release.languages.map(language => ({ english: 'English', german: 'German' }[language] ?? language)).join(', ')}</> : null}
            </p>
            {release.tracks.length ? <><h3>Tracklist</h3>
              <div role="table" mix={css({ display: 'table', width: '100%' })}>
                <div role="rowgroup" mix={srOnly}><div role="row"><span role="columnheader">Song Nr.</span><span role="columnheader">Title</span><span role="columnheader">Lyrics</span><span role="columnheader">Duration</span></div></div>
                <div role="rowgroup" mix={css({ display: 'table-row-group' })}>
                  {release.tracks.map((track, index) => <div role="row" mix={css({ display: 'table-row', background: `color-mix(in oklab, var(--theme-accent) ${index % 2 === 0 ? 10 : 20}%, transparent)` })}>
                    <span role="cell" mix={css({ display: 'table-cell', paddingBlock: '0.5rem', paddingLeft: '1rem', fontWeight: 200, fontStyle: 'italic', opacity: 0.4 })}>{index + 1}. </span>
                    <span role="cell" mix={css({ display: 'table-cell' })}>{track.title}{track.addition ? <span mix={css({ fontWeight: 400, opacity: 0.6 })}> {track.addition}</span> : null}</span>
                    <span role="cell" mix={css({ display: 'table-cell' })}>{track.song ? <a data-rmx-target="overlay" href={'/m/' + track.song.slug.replace(/^\//, '')} title={`Details and Lyrics for "${track.title}"`} mix={css({ ...focus, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', fontSize: '1rem', color: 'color-mix(in oklab, var(--theme-fg) 70%, transparent)', border: '1px solid color-mix(in oklab, var(--theme-fg) 30%, transparent)', background: 'color-mix(in oklab, var(--theme-fg) 5%, transparent)', padding: '0.25rem 0.5rem', textDecoration: 'none', '&:hover': { background: 'color-mix(in oklab, var(--theme-fg) 20%, transparent)' } })}><Icon icon="DocumentTextIcon" iconSize="1rem" />Lyrics</a> : null}</span>
                    <span role="cell" mix={css({ display: 'table-cell' })}>{track.duration ? <time dateTime={durationLabel(track.duration, true)} mix={css({ marginBottom: '0!important', fontWeight: 200, fontStyle: 'italic', opacity: 0.4 })}>{durationLabel(track.duration)}</time> : null}</span>
                  </div>)}
                </div>
              </div>
            </> : null}
          </div>
        </div>
      </div>
      {released && shops.length ? <div mix={css({ marginBottom: '3rem', paddingInline: '1.5rem', '@media (width >= 80rem)': { paddingInline: 0 } })}>
        <div mix={[largeProse, proseRules]}><h3>Stream now on</h3></div>
        <div mix={css({ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '1rem', [md]: { gridTemplateColumns: 'repeat(5,minmax(0,1fr))' } })}>
          {shops.map(shop => <a href={shop.url} target="_blank" rel="noreferrer noopener" mix={softButton}><ServiceLogo name={shop.type} role="img" aria-label={shopNames[shop.type]} style={{ height: '100vh', maxHeight: 'var(--shop-logo-height,2.25rem)', maxWidth: '100%' }} /></a>)}
        </div>
      </div> : null}
      <div mix={[largeProse, proseRules, css({ paddingInline: '1.5rem' })]}>
        {release.children}
        {release.contributors?.length ? <><h3 mix={css({ marginTop: '6rem!important' })}>Contributors</h3><p>{release.contributors.map(contributor => <>
          <strong title={contributor.description}>{contributor.link ? <a href={contributor.link} target="_blank" rel="noopener" mix={css({ ...focus, borderRadius: '0.375rem' })}>{['Hannes Diem', 'Hannes Diercks'].includes(contributor.name.trim()) ? 'My humble self' : contributor.name}</a> : ['Hannes Diem', 'Hannes Diercks'].includes(contributor.name.trim()) ? 'My humble self' : contributor.name}</strong>: {contributor.roles.join(', ')}<br />
        </>)}</p></> : null}
      </div>
    </div>
  }
}
export function Song(handle: Handle<SongProps>) {
  return () => {
    const song = handle.props
    return <article mix={[largeProse, css({ marginInline: 'auto', padding: '3rem 1.5rem 4rem', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 25%)', fontFamily: 'ui-serif,Georgia,Cambria,"Times New Roman",Times,serif', color: 'var(--letter-fg,#010a3c)', background: 'var(--letter-bg,#fff7ed)', position: 'relative', clipPath: 'polygon(24px 0,100% 0,100% 100%,0 100%,0 29px)', '& :where(h1,h2,h3,h4,strong,a,code)': { color: 'var(--letter-heading,#111827)', [dark]: { color: 'var(--letter-heading,#fff)' } }, [sm]: { paddingInline: '3rem', marginBlock: '4rem' }, [dark]: { color: 'var(--letter-fg,#fefce8)', background: 'var(--letter-bg,#030712)' } })]}>
      <p mix={css({ fontFamily: 'Fuggles,display', marginBlock: '0!important', textAlign: 'center', fontSize: '2.25rem', lineHeight: 1.111111, color: 'color-mix(in oklab, var(--theme-fg) 80%, transparent)' })}>
        {song.authors?.map((author, index) => <>{author.link && author.name !== 'Hannes Diem' ? <a href={author.link} title={author.description} target="_blank" rel="noopener" mix={css({ ...focus, borderRadius: '0.375rem', textDecoration: 'none' })}>{author.name}</a> : <span title={author.description}>{author.name}</span>}{index < song.authors!.length - 1 ? ', ' : null}</>)}
        {song.authors?.length ? ' - ' : null}
        {song.creationDate ? <LocalDate value={song.creationDate} hideDay={song.hideCreationDay} /> : null}
      </p>
      <h1 mix={css({ marginBlock: '0.5rem!important', textAlign: 'center' })}>{song.title}</h1>
      {song.subtitle ? <h3 mix={css({ marginTop: '0.5rem!important', textAlign: 'center', fontWeight: 300, fontStyle: 'italic', color: 'color-mix(in oklab, var(--theme-fg) 60%, transparent)' })}>{song.subtitle}</h3> : null}
      <div mix={css({ marginTop: '2.5rem!important', textAlign: 'left' })}>{song.children}</div>
      <div mix={css({ position: 'absolute', top: -1.5, left: -1.5, width: 24, height: 31, rotate: '6deg', background: 'var(--theme-contrast)', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 5%)', [dark]: { background: 'color-mix(in oklab, var(--theme-fg) 10%, transparent)' } })} />
    </article>
  }
}
const linkTreeButton = css({ ...focus, borderRadius: 4, backgroundImage: 'linear-gradient(to bottom,#010a3c,#020024)', color: '#fff8fb', '&:hover': { backgroundImage: 'linear-gradient(#020024,#020024)', color: '#ff8ce2' } })
const linkTreeRow = css({ margin: '1rem', display: 'flex', alignItems: 'center', padding: '1rem 1.25rem' })
const linkTreeContainer = css({ width: '100%', marginInline: 'auto', maxWidth: '32rem' })
export function LinkTree(handle: Handle<LinkTreeProps>) {
  return () => <div>
    <div mix={css({ display: 'flex', minHeight: '100vh', flexDirection: 'column', justifyContent: 'space-between' })}><div><div mix={linkTreeContainer}>
      <div mix={css({ marginInline: '1rem', display: 'flex', flexDirection: 'column', paddingTop: '1rem', [md]: { flexDirection: 'row', paddingTop: '2rem', paddingBottom: '1.5rem' } })}>
        <div mix={css({ zIndex: 10, width: '5rem', height: '5rem', flexShrink: 0, overflow: 'hidden', borderRadius: '50%', border: '2px solid #fff8fb', [md]: { marginLeft: '-2.5rem', width: '7rem', height: '7rem' } })}>{imageElement(handle.props.portrait, { alt: 'Portrait of Hannes', sizes: '112px', priority: true })}</div>
        <p mix={css({ marginTop: '-1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: 6, border: '2px solid #093871', background: '#010a3c', padding: '1rem', '& > strong': { fontSize: '1rem', lineHeight: 1.5, fontWeight: 700, color: '#ffe5f2' }, '& > span': { fontSize: '0.875rem', lineHeight: 1.428571, color: '#b591f8' }, [md]: { marginTop: 0, marginLeft: '-4rem', paddingLeft: '5rem' } })}>{handle.props.children}</p>
      </div>
      <ul>{handle.props.links.map(link => <li><a href={link.href} mix={[linkTreeButton, linkTreeRow]}><ServiceLogo name={link.icon} height={40} aria-hidden="true" style={{ marginRight: '1rem', flexShrink: 0 }} /><span><h4 mix={css({ fontSize: '1.125rem', lineHeight: 1.555556, fontWeight: 700 })}>{link.title}</h4><p mix={css({ fontSize: '0.875rem', lineHeight: 1.428571, opacity: 0.6 })}>{link.description}</p></span></a></li>)}</ul>
      <h3 mix={css({ padding: '1rem', color: 'var(--theme-fg)', opacity: 0.5 })}>Find my music on:</h3>
      {handle.props.music.length ? <ul mix={css({ marginInline: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '1rem' })}>{handle.props.music.map(link => <li><a href={link.href} mix={[linkTreeButton, css({ display: 'flex', aspectRatio: '16/9', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' })]}><ServiceLogo name={link.icon} aria-label={link.title} width="90%" /></a></li>)}</ul> : null}
    </div></div></div>
    <div mix={linkTreeContainer}>
      <h3 mix={css({ marginTop: '16rem', padding: '1rem', color: 'var(--theme-fg)', opacity: 0.5 })}>You found my other side 🌗</h3>
      {handle.props.otherLinks.map((link, index) => <a href={link.href} mix={[linkTreeButton, linkTreeRow, index === 0 && css({ marginTop: 0 })]}><ServiceLogo name={link.icon} height={40} aria-hidden="true" style={{ marginRight: '1rem', flexShrink: 0 }} /><span><h4 mix={css({ fontSize: '1.125rem', lineHeight: 1.555556, fontWeight: 700 })}>{link.title}</h4><p mix={css({ fontSize: '0.875rem', lineHeight: 1.428571, opacity: 0.6 })}>{link.description}</p></span></a>)}
      <div mix={css({ height: '1rem', width: '100%' })} />
    </div>
  </div>
}
