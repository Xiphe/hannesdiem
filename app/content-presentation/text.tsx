import { css, type Handle } from 'remix/component'
import type {
  PageProps,
  TextBlockProps,
  TwoColumnTextProps,
  ProseProps,
  IconListProps,
  TimetableProps,
} from '@hannesdiem/content-components'
import { SiteContent } from './context.ts'
import { imageElement } from './imagery.tsx'
import { Icon } from './icons.tsx'
import { type CSS, sm, md, lg } from './styles.ts'
import { proseBase, proseSizes, mergeCss, centeredProse, proseRules } from './typography.ts'
export function Page(handle: Handle<PageProps>) {
  return () => (
    <div mix={css({ paddingBottom: '6rem', paddingTop: handle.props.firstIsHero ? 0 : '6rem' })}>
      {handle.props.children}
    </div>
  )
}

const textBox: CSS = {
  background: 'var(--theme-contrast)',
  marginInline: 'auto',
  padding: '2rem',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)',
  position: 'relative',
  zIndex: 10,
  '& > :is(h1,h2,h3,h4):first-child': {
    background: 'var(--theme-accent)',
    color: 'var(--theme-fg)',
    padding: '1.5rem',
    marginTop: '-2rem',
    marginInline: '-2rem',
    marginBottom: '1rem',
    [md]: { translate: '-2rem -2rem', marginBottom: '-1rem' },
  },
  [sm]: { marginBottom: '2rem' },
}
// Keep heading offsets and prose resets in one cascade layer.
const textBlock = css(mergeCss(proseBase, textBox))
const largeTextBlock = css(mergeCss(proseBase, { [lg]: proseSizes.xl }, textBox))
export function TextBlock(handle: Handle<TextBlockProps>) {
  const media = handle.context.get(SiteContent).media
  return () => {
    const {
      title,
      portrait,
      pullUp = true,
      bigOnLg = true,
      as: Comp = 'section',
      children,
    } = handle.props
    return (
      <>
        {portrait ? (
          <div
            mix={css({
              position: 'relative',
              zIndex: 20,
              marginInline: 'auto',
              marginBottom: '-1.5rem',
              maxWidth: '24rem',
              paddingInline: '2rem',
              [md]: { marginBottom: '0.5rem' },
            })}
          >
            <div mix={css({ borderRadius: '50%', overflow: 'hidden' })}>
              {imageElement(media, portrait, { sizes: '320px' })}
            </div>
          </div>
        ) : null}
        <Comp
          mix={[
            bigOnLg ? largeTextBlock : textBlock,
            pullUp &&
              !portrait &&
              css({ [sm]: { marginTop: '-0.5rem' }, [md]: { marginTop: '-2rem' } }),
          ]}
        >
          {title ? <h2>{title}</h2> : null}
          {children}
        </Comp>
      </>
    )
  }
}
export function TwoColumnText(handle: Handle<TwoColumnTextProps>) {
  return () => (
    <section>
      {handle.props.headline ? (
        <h2
          mix={css({
            marginBlock: '2rem',
            textAlign: 'center',
            fontSize: '3.75rem',
            lineHeight: 1,
            fontWeight: 700,
            [md]: { marginBlock: '4rem' },
          })}
        >
          {handle.props.headline}
        </h2>
      ) : null}
      <div
        mix={css({
          marginInline: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '4rem 2rem',
          [lg]: { flexDirection: 'row', gap: '5rem', paddingInline: '6rem' },
        })}
      >
        {handle.props.children}
      </div>
    </section>
  )
}
export function Prose(handle: Handle<ProseProps>) {
  return () => {
    const sizes = {
      small: mergeCss(proseBase, proseSizes.sm, { [lg]: proseSizes.base }),
      medium: mergeCss(proseBase, { [lg]: proseSizes.lg }),
      large: mergeCss(proseBase, proseSizes.lg, { [lg]: proseSizes.xl }),
      xl: mergeCss(proseBase, proseSizes.xl, { [lg]: proseSizes['2xl'] }),
    }
    return (
      <section
        mix={[
          css(
            handle.props.bigOnLg
              ? mergeCss(sizes[handle.props.textSize ?? 'medium'], { [lg]: proseSizes.xl })
              : sizes[handle.props.textSize ?? 'medium'],
          ),
          centeredProse,
          proseRules,
        ]}
      >
        {handle.props.children}
      </section>
    )
  }
}

export function IconList(handle: Handle<IconListProps>) {
  return () => (
    <ul mix={css({ listStyle: 'none!important', padding: '0!important' })}>
      {handle.props.list.map((item) => (
        <li mix={css({ margin: '0!important', display: 'flex', padding: '0!important' })}>
          <span
            mix={css({
              display: 'inline-flex',
              margin: '0.5rem',
              marginTop: '0.25rem',
              flexShrink: 0,
              [lg]: { marginTop: '0.5rem' },
            })}
          >
            <Icon
              icon={item.icon}
              iconLabel={item.iconLabel}
              iconSize="1.2em"
            />
          </span>
          {item.text}
        </li>
      ))}
    </ul>
  )
}
export function Timetable(handle: Handle<TimetableProps>) {
  return () => (
    <div mix={css({ display: 'flex', gap: '1rem' })}>
      <div
        mix={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        })}
      >
        <Icon
          icon="SunIcon"
          iconSize="2rem"
        />
        <div mix={css({ width: 1, flexGrow: 1, background: 'currentColor' })} />
        <span mix={css({ marginBottom: '0.25rem', [lg]: { marginBottom: '0.5rem' } })}>
          <Icon
            icon="MoonIcon"
            iconSize="1.5rem"
          />
        </span>
      </div>
      <ul
        mix={css({
          listStyle: 'none!important',
          padding: '0!important',
          margin: '0.125rem!important',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '0.5rem',
          [lg]: { marginTop: '0!important' },
          '& li': { padding: '0!important', margin: '0!important' },
          '& p': { margin: 0 },
        })}
      >
        {handle.props.list.map((item) => (
          <li
            mix={css({
              gridColumn: 'span 2 / span 2',
              display: 'grid',
              gridTemplateColumns: 'subgrid',
            })}
          >
            <div
              mix={css({
                width: 'fit-content',
                flexShrink: 1,
                justifySelf: 'end',
                whiteSpace: 'nowrap',
              })}
            >
              {item.time}:
            </div>
            <div>{item.title}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
