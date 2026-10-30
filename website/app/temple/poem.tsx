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
    const { id, title, dates, image, lightSource, pair, pairs, children } = handle.props
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
          title={title}
          dates={dates}
          image={{ src: source, width: item.width, height: item.height }}
          lightSource={lightSource}
          pair={pair}
          pairs={pairs}
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
