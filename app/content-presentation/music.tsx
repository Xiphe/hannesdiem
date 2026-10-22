import { css, clientEntry, type Handle } from 'remix/component'
import type { ReleaseProps, SongProps } from '@hannesdiem/content-components'
import { getMedia } from '../media.ts'
import { SiteContent } from './context.ts'
import { imageElement } from './imagery.tsx'
import { Icon } from './icons.tsx'
import { ServiceLogo } from '../icons.tsx'
import { LocalDate as DateComponent } from '../date.tsx'
import assets from '../../.generated/assets.json' with { type: 'json' }
import { sm, md, lg, dark, focus, buttonBase } from './styles.ts'
import { largeProse, proseRules } from './typography.ts'

const LocalDate = clientEntry(`${assets.date}#LocalDate`, DateComponent)
function durationLabel(seconds: number, iso = false) {
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds - hours * 3600) / 60),
    remainder = seconds - hours * 3600 - minutes * 60
  if (iso) return `PT${hours}H${minutes}M${remainder}S`
  return [
    ...(hours > 0 ? [String(hours).padStart(2, '0')] : []),
    String(minutes).padStart(2, '0'),
    String(remainder).padStart(2, '0'),
  ].join(':')
}
const shopNames: Record<string, string> = {
  spotify: 'Spotify',
  deezer: 'Deezer',
  applemusic: 'Apple Music',
  tidal: 'Tidal',
  amazonmusic: 'Amazon Music',
  youtubemusic: 'YouTube Music',
  pandora: 'Pandora',
  anghami: 'Anghami',
  awa: 'Awa',
  qobuz: 'Qobuz',
  soundcloud: 'SoundCloud',
}
const softButton = css({
  ...buttonBase,
  background: 'color-mix(in oklab, var(--theme-bg-to) 50%, transparent)',
  borderColor: 'color-mix(in oklab, var(--theme-fg) 70%, transparent)',
  color: 'var(--theme-fg)',
  '&:hover': { background: 'var(--theme-bg-to)' },
})
const srOnly = css({
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
})
const lyricsLabelQuery = '@container release-details (width >= 440px)'

export function Release(handle: Handle<ReleaseProps>) {
  const media = handle.context.get(SiteContent).media
  return () => {
    const release = handle.props
    const tracks = release.tracks.map((track) => ({
      ...track,
      title: track.title ?? track.song!.title,
    }))
    const cover = release.cover ? getMedia(media, release.cover) : undefined
    const released = new Date(release.releaseDate ?? 0).getTime() <= Date.now()
    const shops = Object.keys(shopNames).flatMap((type) =>
      release.shops?.[type] ? [{ type, url: release.shops[type]! }] : [],
    )
    return (
      <div
        mix={css({ width: '100%', marginInline: 'auto', maxWidth: '80rem', paddingBottom: '2rem' })}
      >
        <div
          mix={css({
            marginBottom: '1rem',
            gap: '1.5rem',
            [sm]: { padding: '1.5rem' },
            [md]: { display: 'flex', minHeight: cover ? '100dvh' : undefined },
            [lg]: { gap: '4rem' },
          })}
        >
          {release.cover && cover ? (
            <div
              mix={css({
                width: '100%',
                flexShrink: 0,
                [md]: { width: '50%', containerType: 'inline-size' },
              })}
            >
              <div
                mix={css({
                  position: 'sticky',
                  top: '1.5rem',
                  overflow: 'hidden',
                  [sm]: {
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 50%), 0 2px 4px -2px rgb(0 0 0 / 50%)',
                  },
                  [md]: {
                    '--cover-height': `min(${(cover.height / cover.width) * 100}cqw, calc(100dvh - 3rem))`,
                    top: 'calc((100dvh - var(--cover-height)) / 2)',
                    width: `calc(var(--cover-height) * ${cover.width / cover.height})`,
                    marginInline: 'auto',
                  },
                })}
              >
                {imageElement(media, release.cover, {
                  priority: true,
                  sizes: '(max-width: 768px) 100vw, 50vw',
                })}
              </div>
            </div>
          ) : null}
          <div
            mix={css({
              display: 'flex',
              width: '100%',
              flexDirection: 'column-reverse',
              minWidth: 0,
              containerType: 'inline-size',
              containerName: 'release-details',
              gap: '3rem',
              padding: '1.5rem',
              [sm]: { paddingInline: 0 },
              [md]: {
                flexDirection: 'column',
                paddingBlock: 0,
                justifyContent: cover ? 'safe center' : undefined,
              },
            })}
          >
            <div mix={[largeProse, proseRules]}>
              <h1 mix={release.subtitle && css({ marginBottom: '0!important' })}>
                {release.artist ? `${release.artist} - ` : null}
                {release.title}
              </h1>
              {release.subtitle ? (
                <h2
                  mix={css({
                    marginTop: '0.5rem!important',
                    fontSize: '1.875rem!important',
                    lineHeight: '2.25rem!important',
                    fontWeight: '400!important',
                  })}
                >
                  {release.subtitle}
                </h2>
              ) : null}
              <p>
                {release.releaseDate ? (
                  <>
                    <span mix={css({ opacity: 0.6 })}>{released ? 'Released' : 'Release'}: </span>
                    <LocalDate
                      value={release.releaseDate}
                      hideDay={release.hideReleaseDay}
                    />
                    <br />
                  </>
                ) : null}
                {release.genres?.length ? (
                  <>
                    <span mix={css({ opacity: 0.6 })}>
                      Genre{release.genres.length > 1 ? 's' : ''}:{' '}
                    </span>
                    {release.genres.join(', ')}
                    <br />
                  </>
                ) : null}
                {release.languages?.length ? (
                  <>
                    <span mix={css({ opacity: 0.6 })}>
                      Language{release.languages.length > 1 ? 's' : ''}:{' '}
                    </span>
                    {release.languages
                      .map(
                        (language) =>
                          ({ english: 'English', german: 'German' })[language] ?? language,
                      )
                      .join(', ')}
                  </>
                ) : null}
              </p>
              {release.tracks.length ? (
                <>
                  <h3>Tracklist</h3>
                  <div
                    role="table"
                    mix={css({ display: 'table', width: '100%' })}
                  >
                    <div
                      role="rowgroup"
                      mix={srOnly}
                    >
                      <div role="row">
                        <span role="columnheader">Song Nr.</span>
                        <span role="columnheader">Title</span>
                        <span role="columnheader">Lyrics</span>
                        <span role="columnheader">Duration</span>
                      </div>
                    </div>
                    <div
                      role="rowgroup"
                      mix={css({ display: 'table-row-group' })}
                    >
                      {tracks.map((track, index) => (
                        <div
                          role="row"
                          mix={css({
                            display: 'table-row',
                            background: `color-mix(in oklab, var(--theme-accent) ${index % 2 === 0 ? 10 : 20}%, transparent)`,
                          })}
                        >
                          <span
                            role="cell"
                            mix={css({
                              display: 'table-cell',
                              paddingBlock: '0.5rem',
                              paddingLeft: '0.5rem',
                              paddingRight: '0.5rem',
                              whiteSpace: 'nowrap',
                              [md]: { paddingLeft: '1rem' },
                              fontWeight: 200,
                              fontStyle: 'italic',
                              opacity: 0.4,
                            })}
                          >
                            {index + 1}.{' '}
                          </span>
                          <span
                            role="cell"
                            mix={css({
                              display: 'table-cell',
                              width: '100%',
                              paddingBlock: '0.5rem',
                              paddingRight: '0.5rem',
                              overflowWrap: 'anywhere',
                            })}
                          >
                            {track.title}
                            {track.addition ? (
                              <span mix={css({ fontWeight: 400, opacity: 0.6 })}>
                                {' '}
                                {track.addition}
                              </span>
                            ) : null}
                          </span>
                          <span
                            role="cell"
                            mix={css({
                              display: 'table-cell',
                              width: '1%',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle',
                            })}
                          >
                            {track.song ? (
                              <a
                                data-rmx-target="overlay"
                                href={'/' + track.song.slug.replace(/^\//, '')}
                                data-rmx-src={'/m/' + track.song.slug.replace(/^\//, '')}
                                title={`Lyrics for "${track.title}"`}
                                aria-label={`Lyrics for "${track.title}"`}
                                mix={css({
                                  ...focus,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '1rem',
                                  color: 'color-mix(in oklab, var(--theme-fg) 70%, transparent)',
                                  border:
                                    '1px solid color-mix(in oklab, var(--theme-fg) 30%, transparent)',
                                  background:
                                    'color-mix(in oklab, var(--theme-fg) 5%, transparent)',
                                  padding: '0.375rem',
                                  minWidth: '2rem',
                                  minHeight: '2rem',
                                  [lyricsLabelQuery]: { padding: '0.25rem 0.5rem' },
                                  textDecoration: 'none',
                                  '&:hover': {
                                    background:
                                      'color-mix(in oklab, var(--theme-fg) 20%, transparent)',
                                  },
                                })}
                              >
                                <Icon
                                  icon="DocumentTextIcon"
                                  iconSize="1rem"
                                />
                                <span
                                  mix={css({
                                    display: 'none',
                                    [lyricsLabelQuery]: { display: 'inline' },
                                  })}
                                >
                                  Lyrics
                                </span>
                              </a>
                            ) : null}
                          </span>
                          <span
                            role="cell"
                            mix={css({
                              display: 'table-cell',
                              width: '1%',
                              paddingInline: '0.5rem',
                              whiteSpace: 'nowrap',
                            })}
                          >
                            {track.duration ? (
                              <time
                                dateTime={durationLabel(track.duration, true)}
                                mix={css({
                                  marginBottom: '0!important',
                                  fontWeight: 200,
                                  fontStyle: 'italic',
                                  opacity: 0.4,
                                })}
                              >
                                {durationLabel(track.duration)}
                              </time>
                            ) : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
        {released && shops.length ? (
          <div
            mix={css({
              marginBottom: '3rem',
              paddingInline: '1.5rem',
              '@media (width >= 80rem)': { paddingInline: 0 },
            })}
          >
            <div mix={[largeProse, proseRules]}>
              <h3>Stream now on</h3>
            </div>
            <div
              mix={css({
                marginTop: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                gap: '1rem',
                [md]: { gridTemplateColumns: 'repeat(5,minmax(0,1fr))' },
              })}
            >
              {shops.map((shop) => (
                <a
                  href={shop.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  mix={softButton}
                >
                  <ServiceLogo
                    name={shop.type}
                    role="img"
                    aria-label={shopNames[shop.type]}
                    style={{
                      height: '100vh',
                      maxHeight: 'var(--shop-logo-height,2.25rem)',
                      maxWidth: '100%',
                    }}
                  />
                </a>
              ))}
            </div>
          </div>
        ) : null}
        <div mix={[largeProse, proseRules, css({ paddingInline: '1.5rem' })]}>
          {release.children}
          {release.contributors?.length ? (
            <>
              <h3 mix={css({ marginTop: '6rem!important' })}>Contributors</h3>
              <p>
                {release.contributors.map((contributor) => (
                  <>
                    <strong title={contributor.description}>
                      {contributor.link ? (
                        <a
                          href={contributor.link}
                          target="_blank"
                          rel="noopener"
                          mix={css({ ...focus, borderRadius: '0.375rem' })}
                        >
                          {['Hannes Diem', 'Hannes Diercks'].includes(contributor.name.trim())
                            ? 'My humble self'
                            : contributor.name}
                        </a>
                      ) : ['Hannes Diem', 'Hannes Diercks'].includes(contributor.name.trim()) ? (
                        'My humble self'
                      ) : (
                        contributor.name
                      )}
                    </strong>
                    : {contributor.roles.join(', ')}
                    <br />
                  </>
                ))}
              </p>
            </>
          ) : null}
        </div>
      </div>
    )
  }
}
export function Song(handle: Handle<SongProps>) {
  return () => {
    const song = handle.props
    return (
      <article
        mix={[
          largeProse,
          css({
            marginInline: 'auto',
            padding: '3rem 1.5rem 4rem',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 25%)',
            fontFamily: 'ui-serif,Georgia,Cambria,"Times New Roman",Times,serif',
            color: 'var(--letter-fg,#010a3c)',
            background: 'var(--letter-bg,#fff7ed)',
            position: 'relative',
            clipPath: 'polygon(24px 0,100% 0,100% 100%,0 100%,0 29px)',
            '& :where(h1,h2,h3,h4,strong,a,code)': {
              color: 'var(--letter-heading,#111827)',
              [dark]: { color: 'var(--letter-heading,#fff)' },
            },
            [sm]: { paddingInline: '3rem', marginBlock: '4rem' },
            [dark]: { color: 'var(--letter-fg,#fefce8)', background: 'var(--letter-bg,#030712)' },
          }),
        ]}
      >
        <p
          mix={css({
            fontFamily: 'Fuggles,display',
            marginBlock: '0!important',
            textAlign: 'center',
            fontSize: '2.25rem',
            lineHeight: 1.111111,
            color: 'color-mix(in oklab, var(--theme-fg) 80%, transparent)',
          })}
        >
          {song.authors?.map((author, index) => (
            <>
              {author.link && author.name !== 'Hannes Diem' ? (
                <a
                  href={author.link}
                  title={author.description}
                  target="_blank"
                  rel="noopener"
                  mix={css({ ...focus, borderRadius: '0.375rem', textDecoration: 'none' })}
                >
                  {author.name}
                </a>
              ) : (
                <span title={author.description}>{author.name}</span>
              )}
              {index < song.authors!.length - 1 ? ', ' : null}
            </>
          ))}
          {song.authors?.length ? ' - ' : null}
          {song.creationDate ? (
            <LocalDate
              value={song.creationDate}
              hideDay={song.hideCreationDay}
            />
          ) : null}
        </p>
        <h1 mix={css({ marginBlock: '0.5rem!important', textAlign: 'center' })}>{song.title}</h1>
        {song.subtitle ? (
          <h3
            mix={css({
              marginTop: '0.5rem!important',
              textAlign: 'center',
              fontWeight: 300,
              fontStyle: 'italic',
              color: 'color-mix(in oklab, var(--theme-fg) 60%, transparent)',
            })}
          >
            {song.subtitle}
          </h3>
        ) : null}
        <div mix={css({ marginTop: '2.5rem!important', textAlign: 'left' })}>{song.children}</div>
        <div
          mix={css({
            position: 'absolute',
            top: -1.5,
            left: -1.5,
            width: 24,
            height: 31,
            rotate: '6deg',
            background: 'var(--theme-contrast)',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 5%)',
            [dark]: { background: 'color-mix(in oklab, var(--theme-fg) 10%, transparent)' },
          })}
        />
      </article>
    )
  }
}
