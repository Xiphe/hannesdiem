import { ref, type Handle } from 'remix/component'
import type { FactProps } from '../types.ts'
import { fragmentStroke } from '../../../../contracts/temple/fragments.ts'
import { mountReadingMaterial } from './enhance.ts'
import { readingContours } from './material.ts'
import { FactCircle } from './circle.tsx'
import { TempleSignup } from '../../newsletter/temple-form.tsx'
import { ContactLink } from '../../contact/link.tsx'
import { externalLinkProps } from '../../external-links.ts'

/** Native CMX content; the fitted silhouette is optional enhancement. */
export function Fact(handle: Handle<FactProps & { anchor?: boolean }>) {
  let section: HTMLElement | undefined
  handle.queueTask((signal) => {
    if (section) mountReadingMaterial(section, signal)
  })
  return () => {
    const { id, layout, images, circle, heading, paragraphs, action } = handle.props
    const materialId = `${id}-text-material`
    return (
      <section
        class="fact-story"
        id={handle.props.anchor === false ? undefined : id}
        data-fact-layout={layout}
        aria-labelledby={`${id}-heading`}
        mix={ref((node) => {
          section = node
        })}
      >
        <div
          class="fact-material-boundary"
          aria-hidden="true"
          data-nav-clip
        >
          <svg
            class="tile-material fact-material"
            viewBox="-100 -100 1250 1300"
            preserveAspectRatio="none"
            data-nav-visual
          >
            <defs>
              <linearGradient
                id={materialId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop class="fact-material-start" />
                <stop
                  offset="1"
                  class="fact-material-end"
                />
              </linearGradient>
            </defs>
            <g transform="rotate(8)">
              <path
                d={readingContours[layout]}
                fill={`url(#${materialId})`}
                stroke={`url(#${materialId})`}
                stroke-width={fragmentStroke}
                stroke-linejoin="round"
                stroke-linecap="round"
              />
            </g>
          </svg>
        </div>
        <div class="fact-pictures">
          {images.map((image, index) => (
            <figure class={index === 0 ? 'fact-primary-photo' : 'fact-secondary-photo'}>
              <img
                src={image.src}
                srcSet={image.srcSet}
                sizes="(max-width: 760px) 90vw, 50vw"
                width={image.width}
                height={image.height}
                alt=""
                loading="lazy"
                decoding="async"
                data-nav-visual
              />
            </figure>
          ))}
        </div>
        <div
          class="fact-copy-tile"
          data-nav-visual
        >
          <h2
            class="fact-heading"
            id={`${id}-heading`}
          >
            {heading}
          </h2>
          <div class="fact-fragments">
            {paragraphs.map((paragraph, index) => (
              <p data-fragment={index}>{paragraph}</p>
            ))}
          </div>
        </div>
        {circle && (
          <FactCircle
            id={id}
            {...circle}
          />
        )}
        {action && (
          <FactAction
            id={id}
            action={action}
          />
        )}
      </section>
    )
  }
}

export function FactAction(
  handle: Handle<{
    id: string
    action: NonNullable<FactProps['action']>
    afterContent?: boolean
  }>,
) {
  return () => {
    const { id, action, afterContent } = handle.props
    return (
      <div class={`fact-action${afterContent ? ' fact-followup-action' : ''}`}>
        <p>{action.prompt}</p>
        {action.newsletter === 'temple' ? (
          <TempleSignup
            id={`${id}-signup`}
            label={action.label}
          />
        ) : action.href ? (
          action.href.startsWith('mailto:') ? (
            <ContactLink href={action.href}>{action.label}</ContactLink>
          ) : (
            <a
              href={action.href}
              {...externalLinkProps(action.href)}
            >
              {action.label}
            </a>
          )
        ) : (
          <button
            type="button"
            disabled
          >
            {action.label}
          </button>
        )}
      </div>
    )
  }
}
