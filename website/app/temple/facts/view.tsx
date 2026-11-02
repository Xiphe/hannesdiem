import { ref, type Handle } from 'remix/component'
import type { FactProps } from '../types.ts'
import { fragmentStroke } from '../fragment-button/material.ts'
import { mountReadingMaterial } from './enhance.ts'

const contours = {
  watch:
    'M135 70C80 44 38 64 36 124C18 370 40 626 18 858Q12 925 80 935C350 958 580 972 854 986Q922 994 930 926C950 686 966 418 984 166Q991 95 920 108C648 162 400 164 135 70Z',
  create:
    'M110 90C54 82 28 110 40 166L164 906Q176 966 238 950L920 790Q978 776 956 716C882 496 950 306 970 166Q980 98 912 114C620 180 402 58 110 90Z',
}

/** Native CMX content; the fitted silhouette is optional enhancement. */
export function Fact(handle: Handle<FactProps>) {
  let section: HTMLElement | undefined
  handle.queueTask((signal) => {
    if (section) mountReadingMaterial(section, signal)
  })
  return () => {
    const { id, layout, images, heading, paragraphs, action } = handle.props
    const materialId = `${id}-text-material`
    return (
      <section
        class="fact-story"
        id={id}
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
                d={contours[layout]}
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
        <div class="fact-action">
          <p>{action.prompt}</p>
          {action.href ? (
            <a href={action.href}>{action.label}</a>
          ) : (
            <button
              type="button"
              disabled
            >
              {action.label}
            </button>
          )}
        </div>
      </section>
    )
  }
}
