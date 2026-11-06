import { createRouter } from 'remix/router'
import { render } from 'remix/middleware/render'
import { css } from 'remix/component'
import { XMarkIcon, ArrowLeftIcon } from './heroicons.tsx'
import { redirect } from 'remix/response/redirect'
import { renderContent, SiteContent } from './ui-library/index.ts'
import type { ContentLoader } from './document-host/index.ts'
import { Page } from './page.tsx'
import { routes } from './routes.ts'
import { contentCacheTag } from './document-host/index.ts'
import { ContactCard } from './contact/card.tsx'
import { renderFeed } from './temple/feed/route.tsx'
import { feedPath, isFeedPath, templePath, watchPath } from './temple/feed/model.ts'

const privateHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
function contactMailto(request: Request) {
  const mailto = new URL(request.url).searchParams.get('email') ?? ''
  return /^mailto:[^\s?@]+@[^\s?@]+(?:\?[^\r\n]*)?$/i.test(mailto) ? mailto : undefined
}
const xml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
export function createApp(content: ContentLoader) {
  const router = createRouter({
    middleware: [render()],
    defaultHandler: () => new Response('Not found', { status: 404, headers: privateHeaders }),
  })
  router.get(routes.health, () => Response.json({ ok: true }, { headers: privateHeaders }))
  router.get(routes.contact, async ({ request, render }) => {
    const mailto = contactMailto(request)
    if (!mailto)
      return new Response('Invalid email address', { status: 400, headers: privateHeaders })
    const page = await content(request)
    const overlay = request.headers.get('X-Remix-Target') === 'overlay'
    const card = (
      <ContactCard
        contact={page.site.contact}
        mailto={mailto}
        overlay={overlay}
      />
    )
    return render(
      <SiteContent
        site={page.site}
        routes={page.routes}
      >
        {overlay ? (
          card
        ) : (
          <Page
            title="Contact"
            body={card}
            path="/_contact"
            noindex
          />
        )}
      </SiteContent>,
      { headers: privateHeaders },
    )
  })
  router.get(
    routes.emptyOverlay,
    () =>
      new Response('', {
        headers: { ...privateHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      }),
  )
  router.get(routes.songOverlay, async ({ request, params, render }) => {
    const path = '/' + params.path
    const page = await content(new Request(new URL(path, request.url)))
    if (page.status === 404 || page.route?.kind !== 'song')
      return new Response('Not found', { status: 404, headers: privateHeaders })
    if (request.headers.get('X-Remix-Target') !== 'overlay') return redirect(path, 307)
    return render(
      <SiteContent
        site={page.site}
        routes={page.routes}
      >
        <div
          mix={css({
            display: 'flex',
            minHeight: '100dvh',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          })}
        >
          <div
            data-overlay-panel
            class="lyrics-sheet"
            mix={css({
              position: 'relative',
              '--letter-bg': 'var(--theme-bg)',
              '--letter-fg': 'var(--theme-fg)',
              '--letter-heading': 'var(--theme-fg)',
            })}
          >
            <button
              type="button"
              data-close-overlay
              aria-label="Close lyrics"
              mix={css({
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                zIndex: 10,
                padding: '.25rem',
                borderRadius: '.375rem',
                opacity: 0.5,
              })}
            >
              <XMarkIcon
                width={24}
                height={24}
              />
            </button>
            {renderContent(page.document).body}
            <button
              type="button"
              data-close-overlay
              mix={css({
                display: 'flex',
                alignItems: 'center',
                gap: '.5rem',
                position: 'absolute',
                bottom: '1.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'color-mix(in oklab,var(--theme-fg) 5%,transparent)',
                borderRadius: 4,
                padding: '.25rem .75rem',
                '@media (width >= 48rem)': { display: 'none' },
              })}
            >
              <ArrowLeftIcon
                width={16}
                height={16}
              />
              Back
            </button>
          </div>
        </div>
      </SiteContent>,
      { headers: privateHeaders },
    )
  })
  router.get(routes.sitemap, async ({ request }) => {
    const { routes } = await content(request)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        routes
          .filter((route) => !route.noindex && route.path !== '/about')
          .map(
            (route) =>
              `<url><loc>https://hannesdiem.de${xml(route.path)}</loc>${route.updatedAt ? `<lastmod>${new Date(route.updatedAt).toISOString()}</lastmod>` : ''}<changefreq>monthly</changefreq><priority>0.8</priority></url>`,
          )
          .join('') +
        '</urlset>',
      {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Cloudflare-CDN-Cache-Control': 'public, max-age=60, stale-if-error=0',
          'Cache-Tag': contentCacheTag,
        },
      },
    )
  })
  router.get(
    routes.robots,
    () =>
      new Response(
        'User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /m/\nSitemap: https://hannesdiem.de/sitemap.xml\n',
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        },
      ),
  )
  router.get(routes.content, async ({ request, render }) => {
    const path = new URL(request.url).pathname
    const legacyPost = path.startsWith(`${watchPath}/`)
    if ((isFeedPath(path) || legacyPost) && !path.endsWith('/')) {
      const prefix = legacyPost ? watchPath : feedPath
      let id: string | undefined
      try {
        id = path === feedPath ? undefined : decodeURIComponent(path.slice(prefix.length + 1))
      } catch {
        id = ''
      }
      if (id === undefined || (id && !id.includes('/'))) {
        let page = await content(new Request(new URL(watchPath, request.url), request))
        // Keep existing Publications usable while the entry split is published.
        if (page.status === 404)
          page = await content(new Request(new URL(templePath, request.url), request))
        const feed = page.status === 200 ? await renderFeed(page, id) : undefined
        if (feed && (legacyPost || id === undefined || path !== feed.path))
          return redirect(feed.path + new URL(request.url).search, {
            status: id === undefined ? 302 : 308,
            headers: { 'Cache-Control': 'no-cache', 'Cache-Tag': `content,page:${page.key}` },
          })
        if (feed)
          return render(
            <SiteContent
              site={page.site}
              routes={page.routes}
            >
              <Page
                {...feed}
                route={{
                  ...page.route!,
                  path,
                  title: feed.title,
                  ogTitle: feed.shareTitle,
                  ogImage: feed.shareImage,
                }}
                path={path}
                plain
                feed
              />
            </SiteContent>,
            {
              headers: {
                'Cache-Control': 'no-cache',
                'Cloudflare-CDN-Cache-Control': 'public, max-age=60, stale-if-error=0',
                'Cache-Tag': `content,page:${page.key}`,
                'X-Content-Revision': page.contentHash,
              },
            },
          )
      }
    }
    const page = await content(request)
    const destination = page.redirects.find((redirect) => redirect.path === path)
    if (destination)
      return redirect(
        destination.to + (destination.preserveSearch ? new URL(request.url).search : ''),
        {
          status: destination.status,
          headers: {
            'Cache-Tag': contentCacheTag,
            'Cache-Control': 'no-cache',
            'Cloudflare-CDN-Cache-Control': 'public, max-age=60, stale-if-error=0',
          },
        },
      )
    if (path.endsWith('/') && path !== '/')
      return redirect(path.slice(0, -1) + new URL(request.url).search, 308)
    let route = page.route
    let canonicalPath = path
    const verse = new URL(request.url).searchParams.get('verse')?.trim().toLowerCase()
    if (
      verse &&
      route?.kind === 'temple' &&
      route.verseShares &&
      Object.hasOwn(route.verseShares, verse)
    ) {
      const share = route.verseShares[verse]
      route = { ...route, ogTitle: share.title, ogImage: share.ogImage ?? route.ogImage }
      canonicalPath += `?verse=${encodeURIComponent(verse)}`
    }
    return render(
      <SiteContent
        site={page.site}
        routes={page.routes}
      >
        <Page
          {...renderContent(page.document)}
          route={route}
          path={canonicalPath}
          noindex={page.status === 404}
        />
      </SiteContent>,
      {
        status: page.status,
        headers:
          page.status === 404
            ? privateHeaders
            : {
                'Cache-Control': 'no-cache',
                'Cloudflare-CDN-Cache-Control': 'public, max-age=60, stale-if-error=0',
                'Cache-Tag': `content,page:${page.key}`,
                'X-Content-Revision': page.contentHash,
              },
      },
    )
  })
  return router
}
