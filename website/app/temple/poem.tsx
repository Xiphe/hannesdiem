import { clientEntry, type Handle } from 'remix/component'
import type {
  PoemCanvasProps,
  PoemOpeningProps,
  PoemSectionProps,
} from '@hannesdiem/content-components'
import assets from '../../../.generated/assets.json' with { type: 'json' }
import { SiteContent } from '../ui-library/context.ts'
import { getMedia } from '../media.ts'
import { Opening as OpeningComponent } from './opening.tsx'
const Opening = clientEntry(assets.temple + '#Opening', OpeningComponent)

export function PoemCanvas(handle: Handle<PoemCanvasProps>) {
  return () => <article class="temple-page">{handle.props.children}</article>
}
export function PoemSection(handle: Handle<PoemSectionProps>) {
  return () => (
    <section
      id={handle.props.id}
      class="temple-section"
      data-poem-section={handle.props.kind}
    >
      <div data-poem-text>{handle.props.children}</div>
    </section>
  )
}
export function PoemOpening(handle: Handle<PoemOpeningProps>) {
  const site = handle.context.get(SiteContent)
  return () => {
    const {
      id,
      view,
      section,
      welcome,
      title,
      dates,
      image,
      lightSource,
      pair,
      pairs,
      bridge,
      bridgeBody,
      location,
      facts,
      navigation,
      finalVerse,
      children,
    } = handle.props
    const item = getMedia(site.media, image)
    // The accepted study used this responsive variant, not the largest original.
    const source =
      item.srcSet
        ?.split(',')
        .map((part) => part.trim().split(/\s+/))
        .find(([, width]) => width === '1920w')?.[0] ?? item.src
    return (
      <>
        <Opening
          id={id}
          view={view}
          section={section}
          welcome={view === 'poem' ? welcome : undefined}
          mark={assets.templeMark}
          navigation={navigation}
          title={title}
          dates={dates}
          image={{ src: source, width: item.width, height: item.height }}
          lightSource={lightSource}
          pair={view === 'inside' ? undefined : pair}
          pairs={view === 'inside' ? undefined : pairs}
          bridge={view === 'inside' ? undefined : bridge}
          bridgeBody={view === 'inside' ? undefined : bridgeBody}
          facts={
            view === 'poem'
              ? undefined
              : facts?.map((fact) => ({
                  ...fact,
                  images: [
                    getMedia(site.media, fact.images[0]),
                    ...fact.images.slice(1).map((image) => getMedia(site.media, image)),
                  ],
                }))
          }
          location={
            view !== 'poem' && location
              ? {
                  ...location,
                  id: `temple-location-${id}`,
                  image: getMedia(site.media, location.image),
                  mapAsset: assets.templeEurope,
                }
              : undefined
          }
          finalVerse={view === 'inside' ? undefined : finalVerse}
        />
        {children != null && (
          <PoemSection
            id={id}
            kind="verse"
          >
            {children}
          </PoemSection>
        )}
      </>
    )
  }
}
