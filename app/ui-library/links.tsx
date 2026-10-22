import { css, type Handle } from 'remix/component'
import type { ButtonProps, LinkTreeProps } from '@hannesdiem/content-components'
import { SiteContent } from './context.ts'
import { imageElement } from './imagery.tsx'
import { Icon } from './icons.tsx'
import { ServiceLogo } from '../icons.tsx'
import { md, dark, focus, buttonBase } from './styles.ts'
export function Button(handle: Handle<ButtonProps>) {
  return () => (
    <a
      href={handle.props.href}
      target={handle.props.blank ? '_blank' : undefined}
      rel="noopener noreferrer"
      mix={css({
        ...buttonBase,
        background: 'var(--theme-primary)',
        color: 'var(--theme-contrast)!important',
        ...(handle.props.icon ? { paddingLeft: '1.25rem' } : {}),
        '&:hover': { background: 'color-mix(in oklab, var(--theme-primary) 90%, transparent)' },
        [dark]: { color: 'var(--theme-fg)!important' },
      })}
    >
      {handle.props.icon ? (
        <Icon
          icon={handle.props.icon}
          iconLabel={handle.props.iconLabel}
        />
      ) : null}
      {handle.props.label}
    </a>
  )
}

const linkTreeButton = css({
  ...focus,
  borderRadius: 4,
  backgroundImage: 'linear-gradient(to bottom,#010a3c,#020024)',
  color: '#fff8fb',
  '&:hover': { backgroundImage: 'linear-gradient(#020024,#020024)', color: '#ff8ce2' },
})
const linkTreeRow = css({
  margin: '1rem',
  display: 'flex',
  alignItems: 'center',
  padding: '1rem 1.25rem',
})
const linkTreeContainer = css({ width: '100%', marginInline: 'auto', maxWidth: '32rem' })
export function LinkTree(handle: Handle<LinkTreeProps>) {
  const media = handle.context.get(SiteContent).media
  return () => (
    <div>
      <div
        mix={css({
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          justifyContent: 'space-between',
        })}
      >
        <div>
          <div mix={linkTreeContainer}>
            <div
              mix={css({
                marginInline: '1rem',
                display: 'flex',
                flexDirection: 'column',
                paddingTop: '1rem',
                [md]: { flexDirection: 'row', paddingTop: '2rem', paddingBottom: '1.5rem' },
              })}
            >
              <div
                mix={css({
                  zIndex: 10,
                  width: '5rem',
                  height: '5rem',
                  flexShrink: 0,
                  overflow: 'hidden',
                  borderRadius: '50%',
                  border: '2px solid #fff8fb',
                  [md]: { marginLeft: '-2.5rem', width: '7rem', height: '7rem' },
                })}
              >
                {imageElement(media, handle.props.portrait, {
                  alt: 'Portrait of Hannes',
                  sizes: '112px',
                  priority: true,
                })}
              </div>
              <p
                mix={css({
                  marginTop: '-1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderRadius: 6,
                  border: '2px solid #093871',
                  background: '#010a3c',
                  padding: '1rem',
                  '& > strong': {
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    fontWeight: 700,
                    color: '#ffe5f2',
                  },
                  '& > span': { fontSize: '0.875rem', lineHeight: 1.428571, color: '#b591f8' },
                  [md]: { marginTop: 0, marginLeft: '-4rem', paddingLeft: '5rem' },
                })}
              >
                {handle.props.children}
              </p>
            </div>
            <ul>
              {handle.props.links.map((link) => (
                <li>
                  <a
                    href={link.href}
                    mix={[linkTreeButton, linkTreeRow]}
                  >
                    <ServiceLogo
                      name={link.icon}
                      height={40}
                      aria-hidden="true"
                      style={{ marginRight: '1rem', flexShrink: 0 }}
                    />
                    <span>
                      <h4
                        mix={css({ fontSize: '1.125rem', lineHeight: 1.555556, fontWeight: 700 })}
                      >
                        {link.title}
                      </h4>
                      <p mix={css({ fontSize: '0.875rem', lineHeight: 1.428571, opacity: 0.6 })}>
                        {link.description}
                      </p>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <h3 mix={css({ padding: '1rem', color: 'var(--theme-fg)', opacity: 0.5 })}>
              Find my music on:
            </h3>
            {handle.props.music.length ? (
              <ul
                mix={css({
                  marginInline: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
                  gap: '1rem',
                })}
              >
                {handle.props.music.map((link) => (
                  <li>
                    <a
                      href={link.href}
                      mix={[
                        linkTreeButton,
                        css({
                          display: 'flex',
                          aspectRatio: '16/9',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.5rem',
                        }),
                      ]}
                    >
                      <ServiceLogo
                        name={link.icon}
                        aria-label={link.title}
                        width="90%"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
      <div mix={linkTreeContainer}>
        <h3
          mix={css({ marginTop: '16rem', padding: '1rem', color: 'var(--theme-fg)', opacity: 0.5 })}
        >
          You found my other side 🌗
        </h3>
        {handle.props.otherLinks.map((link, index) => (
          <a
            href={link.href}
            mix={[linkTreeButton, linkTreeRow, index === 0 && css({ marginTop: 0 })]}
          >
            <ServiceLogo
              name={link.icon}
              height={40}
              aria-hidden="true"
              style={{ marginRight: '1rem', flexShrink: 0 }}
            />
            <span>
              <h4 mix={css({ fontSize: '1.125rem', lineHeight: 1.555556, fontWeight: 700 })}>
                {link.title}
              </h4>
              <p mix={css({ fontSize: '0.875rem', lineHeight: 1.428571, opacity: 0.6 })}>
                {link.description}
              </p>
            </span>
          </a>
        ))}
        <div mix={css({ height: '1rem', width: '100%' })} />
      </div>
    </div>
  )
}
