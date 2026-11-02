import type { Handle } from 'remix/component'
import type { LocationProps } from '../types.ts'
import { mapPiece, textPiece } from './material.ts'
import { mapLink, projectVenue } from './maps.ts'
import { pinPath } from './pin.ts'

export function Location(handle: Handle<LocationProps>) {
  return () => {
    const { id, image, imageAlt, heading, venue, invitation, action, mapAsset } = handle.props
    const point = projectVenue(venue)
    return (
      <section
        class="facts-grid"
        id="facts"
        data-location-id={id}
      >
        <div class="fact-slot map-slot">
          <div class="fact-flight">
            <div class="fact-solid map-solid">
              <svg
                class="tile-material"
                data-nav-visual
                aria-hidden="true"
              />
              <article class="tile-face map-face">
                <svg
                  class="location-map"
                  viewBox="-13 -13 27 16"
                  role="img"
                  aria-label={venue.name}
                >
                  <defs>
                    <clipPath id={`${id}-clip`}>
                      <path
                        id={`${id}-shape`}
                        data-map-contour
                        d={mapPiece.d}
                      />
                    </clipPath>
                    <linearGradient id={`${id}-water`}>
                      <stop class="map-water-start" />
                      <stop
                        offset="1"
                        class="map-water-end"
                      />
                    </linearGradient>
                    <linearGradient id={`${id}-ink`}>
                      <stop class="map-ink-start" />
                      <stop
                        offset="1"
                        class="map-ink-end"
                      />
                    </linearGradient>
                  </defs>
                  <use
                    href={`#${id}-shape`}
                    class="map-water"
                    data-nav-visual
                    fill={`url(#${id}-water)`}
                  />
                  <g clipPath={`url(#${id}-clip)`}>
                    <g
                      data-map-frame
                      transform="translate(2 -10) scale(.01)"
                    >
                      <g
                        data-map-camera
                        style={{
                          transform: `translate(${500 - point.x * 0.55}px, ${500 - point.y * 0.55}px) scale(.55)`,
                        }}
                      >
                        <use
                          href={`${mapAsset}#land`}
                          class="country-rim"
                          fill={`url(#${id}-ink)`}
                        />
                        <g transform={`translate(${point.x} ${point.y})`}>
                          <a
                            data-map-link
                            href={mapLink(venue)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={venue.name}
                          >
                            <g
                              class="map-pin"
                              data-pin-scale
                            >
                              <path
                                d={pinPath}
                                fillRule="evenodd"
                              />
                            </g>
                          </a>
                        </g>
                      </g>
                    </g>
                  </g>
                </svg>
              </article>
            </div>
          </div>
        </div>
        <div class="fact-slot text-slot">
          <div class="fact-flight">
            <figure
              class="editorial-photo tile-face"
              data-nav-visual
            >
              <img
                src={image.src}
                srcSet={image.srcSet}
                sizes="(max-width: 760px) calc(100vw - 88px), 616px"
                width={image.width}
                height={image.height}
                alt={imageAlt}
                decoding="async"
              />
            </figure>
            <div class="fact-solid text-solid">
              <svg
                class="tile-material"
                data-nav-visual
                aria-hidden="true"
                viewBox="-16 -16 32 32"
              >
                <path d={textPiece.d} />
              </svg>
              <article class="tile-face text-face">
                <div
                  class="tile-copy"
                  id="location-copy"
                >
                  <h2
                    class="location-heading"
                    data-nav-visual
                  >
                    {heading}
                  </h2>
                  <p>
                    <a
                      href={venue.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {venue.name}
                    </a>
                    , {venue.travel}
                  </p>
                  <p>{invitation}</p>
                </div>
              </article>
            </div>
          </div>
        </div>
        <div
          class="location-action"
          data-nav-visual
        >
          <p class="location-prompt">{action.prompt}</p>
          <a
            class="location-button"
            href={action.href}
          >
            {action.label}
          </a>
        </div>
      </section>
    )
  }
}
