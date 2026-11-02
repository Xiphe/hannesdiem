import type { Handle, RemixNode } from 'remix/component'
import type { SiteMetadata, ContentRoute } from '../../../contracts/content.ts'

// Component context keeps each streamed response on its own publication snapshot.
export function SiteContent(
  handle: Handle<
    { site: SiteMetadata; routes: ContentRoute[]; children?: RemixNode },
    SiteMetadata & { routes: ContentRoute[] }
  >,
) {
  const { site, routes } = handle.props
  handle.context.set({
    ...site,
    routes,
    navigation: {
      ...site.navigation,
      sections: site.navigation.sections.map((section) =>
        section.collection === 'release'
          ? {
              ...section,
              items: routes
                .filter((route) => route.kind === 'release')
                .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
                .map((route) => ({ name: route.title, href: route.path })),
            }
          : section,
      ),
    },
  })
  return () => handle.props.children
}
