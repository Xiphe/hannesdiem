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
    const image =
      site.shareImages[path] ?? (route?.image ? getMedia(site.media, route.image) : undefined)
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
              html[data-temple-loading] body::before {
                content: ''; position: fixed; z-index: 100; top: 50%; left: 50%;
                box-sizing: border-box; width: 20px; height: 20px; margin: -10px 0 0 -10px;
                border: 2px solid #d2d0c833; border-top-color: #d2d0c8; border-radius: 50%;
                pointer-events: none; opacity: 0;
                animation: temple-spinner-show 0s 300ms forwards, temple-spinner-hide 0s 8s forwards, temple-spinner-turn 800ms 300ms linear infinite;
              }
              @keyframes temple-spinner-show { to { opacity: 1; } }
              @keyframes temple-spinner-hide { to { opacity: 0; } }
              @keyframes temple-spinner-turn { to { transform: rotate(360deg); } }
              @media (prefers-reduced-motion: reduce) {
                html[data-temple-loading] body::before {
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
              html[data-temple-loading] body::before { display: none; }
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
            href={temple ? assets.templeMark : assets.mark}
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
