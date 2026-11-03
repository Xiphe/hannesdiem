import type { Handle } from 'remix/component'
import type { ContactDetails } from '../../../contracts/content.ts'
import { EnvelopeIcon, XMarkIcon } from '../heroicons.tsx'
import { SignalIcon, TelegramIcon } from '../icons.tsx'
import { readingContours } from '../temple/facts/material.ts'

export function ContactCard(
  handle: Handle<{ contact?: ContactDetails; mailto: string; overlay: boolean }>,
) {
  return () => {
    const { contact, mailto, overlay } = handle.props
    return (
      <div class="contact-stage">
        <section
          class="contact-card"
          data-overlay-panel
          aria-labelledby="contact-title"
        >
          <svg
            class="contact-piece"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="contact-material"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop class="contact-piece-top" />
                <stop
                  class="contact-piece-bottom"
                  offset="1"
                />
              </linearGradient>
            </defs>
            <path
              d={readingContours.create}
              fill="url(#contact-material)"
            />
          </svg>
          {overlay && (
            <button
              type="button"
              data-close-overlay
              aria-label="Close contact card"
              class="contact-close"
            >
              <XMarkIcon
                width={24}
                height={24}
              />
            </button>
          )}
          {contact?.portrait && (
            <div class="contact-portrait-wrap">
              {contact.message && <p class="contact-bubble">{contact.message}</p>}
              <img
                class="contact-portrait"
                src={contact.portrait.src}
                srcSet={contact.portrait.srcSet}
                sizes="144px"
                width="144"
                height="144"
                alt={`Portrait of ${contact.name}`}
              />
            </div>
          )}
          <h1 id="contact-title">{contact?.name ?? 'Contact'}</h1>
          <div class="contact-options">
            <a href={mailto}>
              <EnvelopeIcon
                width={22}
                height={22}
              />
              Email
            </a>
            {contact && (
              <>
                <a
                  href={contact.signal.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <SignalIcon
                    width={22}
                    height={22}
                  />
                  Signal
                </a>
                <a
                  href={contact.telegram.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <TelegramIcon
                    width={22}
                    height={22}
                  />
                  Telegram
                </a>
              </>
            )}
          </div>
        </section>
      </div>
    )
  }
}
