import { css, type Handle, type RemixNode } from 'remix/component'
import type {
  ImageProps,
  HeroProps,
  ImageBandProps,
  ImageSource,
} from '@hannesdiem/content-components'
import { getMedia, type MediaImage } from '../media.ts'
import { SiteContent } from './context.ts'
import { type CSS, sm, md, lg } from './styles.ts'
import { largeProse, centeredProse } from './typography.ts'
function lines(text?: string): RemixNode {
  return text?.split(/\r\n|\n|\\n|<br ?\/?\>/g).map((line, index) => (
    <>
      {index ? <br /> : null}
      {line}
    </>
  ))
}
export function imageElement(
  media: Record<string, MediaImage>,
  image: ImageSource,
  options: {
    alt?: string
    sizes?: string
    priority?: boolean
    title?: string
    fill?: boolean
    style?: CSS
  } = {},
) {
  const item = getMedia(media, image)
  return (
    <img
      src={item.src}
      srcSet={item.srcSet}
      width={item.width}
      height={item.height}
      alt={options.alt ?? item.alt ?? ''}
      sizes={options.sizes}
      title={options.title}
      loading={options.priority ? 'eager' : 'lazy'}
      fetchPriority={options.priority ? 'high' : undefined}
      decoding="async"
      mix={css({
        display: 'block',
        margin: '0!important',
        objectFit: 'cover',
        ...(options.fill
          ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
          : { width: '100%', height: 'auto' }),
        ...options.style,
      })}
      style={{
        backgroundColor: item.color,
        objectPosition: `${item.focalX ?? 50}% ${item.focalY ?? 50}%`,
      }}
    />
  )
}
export function Image(handle: Handle<ImageProps>) {
  const media = handle.context.get(SiteContent).media
  return () => imageElement(media, handle.props.image, handle.props)
}

const heroStyle = css({
  position: 'relative',
  display: 'flex',
  minHeight: '80vh',
  flexDirection: 'column',
  overflow: 'hidden',
  paddingTop: '3rem',
  paddingBottom: '5rem',
})
const heroPull = css({ [sm]: { marginTop: '-3rem' }, [md]: { marginTop: '-6rem' } })
const grow = css({ flexGrow: 1 })
export function Hero(handle: Handle<HeroProps>) {
  const media = handle.context.get(SiteContent).media
  return () => {
    const { title, subtitle, image, first, pullUp, textColor } = handle.props
    const Comp = first ? 'header' : 'div',
      H1 = first ? 'h1' : 'h2',
      H2 = first ? 'h2' : 'h3'
    return (
      <Comp mix={[heroStyle, !first && pullUp && heroPull]}>
        {image
          ? imageElement(media, image, {
              fill: true,
              priority: first,
              sizes: '(max-width: 639px) 200vw, 100vw',
            })
          : null}
        <div mix={grow} />
        <div mix={css({ position: 'relative', zIndex: 10 })}>
          <div
            mix={[
              largeProse,
              centeredProse,
              css({ '--theme-fg': textColor === 'light' ? '#fff' : '#111827' }),
            ]}
          >
            <div
              mix={css({
                display: 'flex',
                flexDirection: 'column',
                textShadow:
                  textColor === 'light'
                    ? '0 0 50px black, 0 0 5px rgb(0 0 0 / 50%)'
                    : '0 0 100px rgb(255 255 255 / 50%)',
              })}
            >
              {title ? (
                <H1
                  mix={css({
                    margin: '0!important',
                    marginLeft: '-0.375rem!important',
                    fontSize: '4.5rem!important',
                    lineHeight: '1!important',
                    [sm]: { fontSize: '6rem!important' },
                  })}
                >
                  {lines(title)}
                </H1>
              ) : null}
              {subtitle ? (
                <H2
                  mix={css({
                    marginTop: '1rem!important',
                    marginBottom: '0!important',
                    fontWeight: '400!important',
                  })}
                >
                  {lines(subtitle)}
                </H2>
              ) : null}
            </div>
          </div>
        </div>
        <div mix={grow} />
      </Comp>
    )
  }
}

export function ImageBand(handle: Handle<ImageBandProps>) {
  const media = handle.context.get(SiteContent).media
  return () => {
    const { title, smallTitle, images, pullUp, breakPoint = 'sm' } = handle.props
    const breakpoint = { none: '', sm, md, lg }[breakPoint]
    const parallel = images.reduce((sum, item) => {
      const image = getMedia(media, item.image)
      return sum + image.width / image.height
    }, 0)
    const stacked = images.reduce((sum, item) => {
      const image = getMedia(media, item.image)
      return sum + (item.includeStacked === false ? 0 : image.height / image.width)
    }, 0)
    const layout = {
      display: breakPoint === 'none' ? 'flex' : 'block',
      aspectRatio: breakPoint === 'none' ? 'var(--parallel-aspect)' : 'var(--stacked-aspect)',
      ...(breakpoint
        ? { [breakpoint]: { display: 'flex', aspectRatio: 'var(--parallel-aspect)' } }
        : {}),
    }
    return (
      <div mix={pullUp && css({ [sm]: { marginTop: '-3rem' }, [md]: { marginTop: '-4rem' } })}>
        <div
          style={{ '--stacked-aspect': `1 / ${stacked}`, '--parallel-aspect': `${parallel} / 1` }}
        >
          <div mix={css({ height: 0 })}>
            <div mix={css(layout)}>
              {images.map((item) => {
                const image = getMedia(media, item.image),
                  percent = Math.round((image.width / image.height / parallel) * 10000) / 100
                return (
                  <div
                    mix={css({
                      position: 'relative',
                      width: '100%',
                      aspectRatio: `${image.width} / ${image.height}`,
                      flex: `${image.width / image.height} 1 0%`,
                      display:
                        breakPoint !== 'none' && item.includeStacked === false ? 'none' : 'block',
                      ...(breakpoint ? { [breakpoint]: { display: 'block' } } : {}),
                    })}
                  >
                    {imageElement(media, item.image, {
                      title: item.title,
                      fill: true,
                      sizes:
                        breakPoint === 'none'
                          ? `${percent}vw`
                          : `(min-width: ${({ sm: 640, md: 768, lg: 1024 } as const)[breakPoint as 'sm' | 'md' | 'lg']}px) ${percent}vw, 100vw`,
                    })}
                  </div>
                )
              })}
            </div>
          </div>
          <div
            mix={css({
              ...layout,
              pointerEvents: 'none',
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
            })}
          >
            {title || smallTitle ? (
              <h4
                mix={css({
                  textShadow: '0 0 50px black, 0 0 5px rgb(0 0 0 / 50%)',
                  marginLeft: '2rem',
                  fontSize: '3rem',
                  lineHeight: 1,
                  fontWeight: 700,
                  color: 'var(--theme-dark-fg)',
                  [sm]: { fontSize: '3.75rem' },
                  '@media (width >= 80rem)': { fontSize: '6rem' },
                })}
              >
                <span
                  mix={css({
                    background: 'color-mix(in oklab, var(--theme-dark-contrast) 80%, transparent)',
                  })}
                >
                  {title ? (
                    <span
                      mix={
                        smallTitle &&
                        css({
                          display: breakPoint === 'none' ? 'inline' : 'none',
                          ...(breakpoint ? { [breakpoint]: { display: 'inline' } } : {}),
                        })
                      }
                    >
                      {lines(title)}
                    </span>
                  ) : null}
                  {smallTitle ? (
                    <span
                      mix={
                        title &&
                        css({
                          display: breakPoint === 'none' ? 'none' : 'inline',
                          ...(breakpoint ? { [breakpoint]: { display: 'none' } } : {}),
                        })
                      }
                    >
                      {lines(smallTitle)}
                    </span>
                  ) : null}
                </span>
              </h4>
            ) : null}
          </div>
        </div>
      </div>
    )
  }
}
