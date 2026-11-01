import { clientEntry, type Handle, type RemixNode } from 'remix/component'
import assets from '../../.generated/assets.json' with { type: 'json' }
import { Chrome as ChromeComponent } from './chrome.tsx'
import { Footer, NavigationDialog } from './navigation.tsx'
import { contentTheme, SiteContent } from './ui-library/index.ts'
import type { ContentRoute } from '../../contracts/content.ts'
import { getMedia } from './media.ts'
import { themeCss } from './theme.ts'
const Chrome = clientEntry(assets.chrome + '#Chrome', ChromeComponent)
export function Page(
  handle: Handle<{
    title: string
    body: RemixNode
    route?: ContentRoute
    path?: string
    noindex?: boolean
    plain?: boolean
  }>,
) {
  const site = handle.context.get(SiteContent)
  return () => {
    const { title, body, route, path = '/', noindex, plain } = handle.props
    const temple = route?.kind === 'temple'
    const canonical = `https://hannesdiem.de${path}`
    const image = route?.ogImage ?? (route?.image ? getMedia(site.media, route.image) : undefined)
    const pageTitle = route?.title ?? title
    const documentTitle = pageTitle === 'Hannes Diem' ? pageTitle : `${pageTitle} • Hannes Diem`
    return (
      <html
        lang="en"
        data-layout={temple ? 'temple' : undefined}
        data-temple-loading={temple ? '' : undefined}
      >
        <head>
          <meta charSet="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />
          {temple && (
            <>
              <style>{`
              html[data-temple-loading] { background: #000; }
              html[data-layout='temple'][data-temple-loading] body { background: #000; animation: temple-load-ground 0s 8s forwards; }
              html[data-temple-loading] .temple-page { visibility: hidden; animation: temple-load-document 0s 8s forwards; }
              .temple-loading-word { display: none; }
              html[data-temple-loading] .temple-loading-word {
                display: block; position: fixed; z-index: 100; top: 50%; left: 50%;
                margin: 22px 0 0; transform: translateX(-50%); pointer-events: none;
                font-family: system-ui, sans-serif; font-size: 11px; font-weight: 500;
                line-height: 1.4; letter-spacing: 0.18em; padding-left: 0.18em;
                color: transparent; background: radial-gradient(ellipse at 15% 30%, #bdd7e3, transparent 65%), radial-gradient(ellipse at 80% 70%, #edcaa4, transparent 65%), #d2d0c8;
                background-size: 180% 180%; background-clip: text;
                opacity: 0; visibility: hidden;
                animation: temple-spinner-show 0s 300ms forwards, temple-spinner-hide 0s 8s forwards, temple-loading-clouds 4s 300ms ease-in-out infinite alternate;
              }
              html[data-temple-loading] body::before {
                content: ''; position: fixed; z-index: 100; top: 50%; left: 50%;
                width: 28px; height: 28px; margin: -22px 0 0 -14px;
                background: conic-gradient(#bdd7e3 0deg 35deg, transparent 35deg 70deg, #d2d0c8 70deg 175deg, transparent 175deg 220deg, #edcaa4 220deg 300deg, transparent 300deg);
                mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px));
                pointer-events: none; opacity: 0; visibility: hidden;
                animation: temple-spinner-show 0s 300ms forwards, temple-spinner-hide 0s 8s forwards, temple-spinner-turn 1800ms 300ms steps(18, end) infinite;
              }
              @keyframes temple-spinner-show { to { opacity: 1; visibility: visible; } }
              @keyframes temple-spinner-hide { to { opacity: 0; visibility: hidden; } }
              @keyframes temple-spinner-turn { to { transform: rotate(360deg); } }
              @keyframes temple-loading-clouds { to { background-position: 100% 60%, -60% 40%, 0 0; } }
              @media (prefers-reduced-motion: reduce) {
                html[data-temple-loading] body::before,
                html[data-temple-loading] .temple-loading-word {
                  animation: temple-spinner-show 0s 300ms forwards, temple-spinner-hide 0s 8s forwards;
                }
              }
              @keyframes temple-load-document { to { visibility: visible; } }
              @keyframes temple-load-ground { to { background: light-dark(#f7ecdf, #000); } }
            `}</style>
              <noscript>
                <style>{`
              html[data-temple-loading] body { background: light-dark(#f7ecdf, #000) !important; animation: none; }
              html[data-temple-loading] .temple-page { visibility: visible; animation: none; }
              html[data-temple-loading] body::before,
              html[data-temple-loading] .temple-loading-word { display: none; }
            `}</style>
              </noscript>
            </>
          )}
          <title>{documentTitle}</title>
          <link
            rel="canonical"
            href={canonical}
          />
          {route?.description && (
            <meta
              name="description"
              content={route.description}
            />
          )}
          {(noindex || route?.noindex) && (
            <meta
              name="robots"
              content={route?.nofollow ? 'noindex,nofollow' : 'noindex,follow'}
            />
          )}
          <meta
            property="og:site_name"
            content="Hannes Diem"
          />
          <meta
            property="og:title"
            content={route?.ogTitle ?? pageTitle}
          />
          <meta
            property="og:url"
            content={canonical}
          />
          <meta
            property="og:type"
            content={route?.ogType ?? 'website'}
          />
          {route?.profile && (
            <>
              <meta
                property="profile:first_name"
                content={route.profile.firstName}
              />
              <meta
                property="profile:last_name"
                content={route.profile.lastName}
              />
            </>
          )}
          {route?.musicians?.map((url) => (
            <meta
              property="music:musician"
              content={url}
            />
          ))}
          {route?.songs?.map((url) => (
            <meta
              property="music:song"
              content={url}
            />
          ))}
          {route?.description && (
            <meta
              property="og:description"
              content={route.description}
            />
          )}
          {image && (
            <>
              <meta
                property="og:image"
                content={new URL(image.src, 'https://hannesdiem.de').href}
              />
              <meta
                property="og:image:width"
                content={String(image.width)}
              />
              <meta
                property="og:image:height"
                content={String(image.height)}
              />
              <meta
                property="og:image:alt"
                content={image.alt ?? ''}
              />
            </>
          )}
          <meta
            name="twitter:card"
            content="summary_large_image"
          />
          <link
            rel="icon"
            href={path === '/temple-of-sound' ? assets.templeMark : assets.mark}
            type="image/svg+xml"
          />
          <link
            rel="stylesheet"
            href={assets.style}
          />
          {temple && (
            <link
              rel="stylesheet"
              href={assets.templeStyle}
            />
          )}
          <style>{themeCss(contentTheme(site, route))}</style>
          <script
            type="module"
            src={assets.entry}
          ></script>
        </head>
        <body>
          {temple && (
            <p
              class="temple-loading-word"
              role="status"
            >
              loading
            </p>
          )}
          {!plain && !temple && (
            <>
              <Chrome path={path} />
              <NavigationDialog pathname={path} />
            </>
          )}
          <main id="content">{body}</main>
          {!plain && !temple && <Footer />}
        </body>
      </html>
    )
  }
}
