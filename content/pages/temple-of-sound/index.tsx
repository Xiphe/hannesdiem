import type { PageMetadata } from '../../types.ts'

import {
  PoemCanvas,
  PoemOpening,
  InvitationGrid,
  InvitationCard,
  InvitationDetails,
} from '@hannesdiem/content-components'

import forest from '../../media/IMG_6257.JPG'

export const metadata = { kind: 'temple', image: forest } satisfies PageMetadata

export const title = 'Temple of Sound'

const contact = {
  email: 'sound@hannesdiem.de',
  phone: '+4915140511198',
  displayPhone: '+49 151 405 111 98',
}
const contactLinks = [
  { label: contact.email, href: `mailto:${contact.email}` },
  { label: contact.displayPhone, href: `tel:${contact.phone}` },
  { label: 'WhatsApp', href: `https://wa.me/${contact.phone.slice(1)}` },
  { label: 'Signal', href: `https://signal.me/#p/${contact.phone}` },
  { label: 'Telegram', href: `https://t.me/${contact.phone}` },
]

export default function Content() {
  return (
    <PoemCanvas>
      <PoemOpening
        id="verse-1"
        title={title}
        dates={{ start: '2026-11-01', end: '2026-12-20' }}
        image={forest}
        lightSource={{ x: 53.24, y: 54.07 }}
      />
      <InvitationGrid>
        <InvitationCard
          id="location"
          title="📌 Kulturhaus Steinfurth"
          action={{ label: 'join me in person', target: 'join-in-person' }}
        >
          <p>
            In essence this is the piano, me and something wants to be said, sung und played.
            <br />
            You are very welcome to join.
          </p>
          <p>
            Kulturhaus Steinfurth is a pretty remote place, 3 hours by train from Berlin, I would
            love to get visited in this cocoon and share meals, touch, tears and laughter
          </p>
          <p>. If this speaks to you, please get in contact so we can connect and arrange.</p>
        </InvitationCard>
        <InvitationDetails
          id="join-in-person"
          title="join me in person"
        >
          <nav aria-label="Contact">
            <ul>
              {contactLinks.map(({ label, href }) => (
                <li>
                  <a href={href}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </InvitationDetails>
      </InvitationGrid>
    </PoemCanvas>
  )
}
