import type { PageMetadata } from '../../types.ts'
import {
  PoemCanvas,
  PoemOpening,
  type PoemPair,
  type PoemOpeningProps,
} from '@hannesdiem/content-components'

import forest from '../../media/IMG_6257.JPG'
import openerShareFrame from '../../media/temple-share-opener.png'
import room from '../../media/steinfurth-grand-piano.jpeg'
import tos from '../../media/tos.jpg'
import tos2 from '../../media/tos2.jpg'
import tos4 from '../../media/tos4.jpg'
import mixing from '../../media/mixing-scene-one-week-retreat-1803-2fadbcefea805a0a.webp'
import circlePhoto from '../../media/A7406429-1.jpg'
import { watchActionContext, watchIntroduction, watchFragments } from './_watch.ts'
import { createCopy } from './_create.ts'
import { recordings } from './_recordings.tsx'

export const dates = { start: '2026-11-01', end: '2026-12-20' }
export const metadata = {
  kind: 'temple',
  image: forest,
  openerShare: { frame: openerShareFrame, dates },
  verseShares: {
    'im in love': {
      title: 'H U M A N I T Y ! I’m in love',
      lines: [
        { text: 'H U M A N I T Y !', face: 'spaced' },
        { text: 'I’m in love', face: 'cinzel' },
      ],
    },
    'im in grief': {
      title: "Oh I'm in deep hurt and grief over mankind and earth.",
      lines: [
        { text: "Oh I'm in deep hurt and grief over" },
        { text: 'mankind and earth.', face: 'cinzel' },
      ],
    },
    'i resist': {
      title: 'I will not let my love be dimmed.',
      lines: [{ text: 'I will not let my' }, { text: 'love be dimmed.', face: 'cinzel' }],
    },
    'i stay': {
      title: 'I have trusted and accepted, waited patiently...',
      lines: [
        { text: 'I have trusted and accepted,' },
        { text: 'waited patiently...', face: 'cinzel' },
      ],
    },
    'i devote': {
      title: "I'm devoting this to you and to the tension and resonance",
      lines: [
        { text: "I'm devoting this to you and to the" },
        { text: 'tension and resonance', face: 'cinzel' },
      ],
    },
  },
} satisfies PageMetadata

export const title = 'Temple of Sound'

// First pair: wording, display casing and typography chosen by the artist.
export const firstPair = {
  paragraphs: [
    [
      { text: 'H U M A N I T Y !', face: 'spaced' },
      { text: 'I’m in love', face: 'cinzel' },
      { text: 'with the brave spirits I meet, witness, and sense.' },
    ],
    [
      { text: 'I’m so deeply touched', face: 'cinzel' },
      { text: 'by those willing to feel, to unwind, to rest, to risk.' },
    ],
    [
      { text: 'By those willing to build villages rooted in' },
      { text: 'trust and connection.', face: 'cinzel' },
    ],
  ],
  refrain: [
    { text: 'I’m playful and inspired.', display: 'I’m pLAYFuL aNd INSpIReD.', face: 'cinzel' },
    { text: 'I’m breathing in and out.', display: 'i’M BREATHiNG iN AND OUT.', face: 'bricolage' },
    { text: 'I’m faithful and held.', display: 'I’M FAITHFUL AND HELD.', face: 'unbounded' },
  ],
  coda: [
    { text: 'I’m loved,', face: 'cinzel' },
    { text: 'and in awe of what you kindred souls have built onto this sphere.' },
  ],
} satisfies PoemPair

export const secondPair = {
  paragraphs: [
    [
      { text: "Oh I'm in deep hurt and grief over" },
      { text: 'mankind and earth.', face: 'cinzel', smallLines: ['mankind', 'and earth.'] },
    ],
    [
      { text: 'Violent fear,', face: 'germania' },
      { text: 'greed and mistrust rule and devour soil and seeds alike.' },
    ],
    [
      { text: 'I understand we coexist in a storm held between' },
      { text: 'chaotic rupture', face: 'germania' },
      {
        text: 'and the calm scent of a rose touching my heart like a midsummer sunset.',
        smallLines: ['and the calm scent of a rose touching', 'my heart like a midsummer sunset.'],
        shape: 'sweep',
      },
    ],
  ],
  refrain: [
    { text: "I'm playful and inspired.", display: "I'm pLAYFuL aNd INSpIReD.", face: 'cinzel' },
    {
      text: "I'm bursting and imploding.",
      display: "i'M BURSTiNG AND iMPLODiNG.",
      face: 'bricolage',
    },
    {
      text: "I'm raging angry",
      display: "I'M RAGING ANGRY",
      face: 'unbounded',
      lines: ["I'M", 'RAGING', 'ANGRY'],
    },
  ],
  coda: [
    { text: 'with those who mistreat willfully' },
    { text: 'and with myself for taking part.' },
  ],
} satisfies PoemPair

export const thirdPair = {
  paragraphs: [
    [
      { text: 'I will not let my' },
      { text: 'love be dimmed.', face: 'cinzel' },
      { text: 'I have not grown this tall to get extinguished.' },
    ],
  ],
  repetition: [
    {
      statement: [
        { text: 'I see them speak my words for their', nowrap: true },
        { text: 'shadowed beliefs.', nowrap: true, face: 'germania' },
      ],
      reflection: { text: 'I know because I have done so.', nowrap: true, width: 0.7 },
    },
    {
      statement: [
        { text: 'I see them claim my truth for their', nowrap: true },
        { text: 'egoistic gain and play.', nowrap: true, face: 'germania' },
      ],
      reflection: { text: 'I know because I have done so.', nowrap: true, width: 0.7 },
    },
    {
      statement: [
        { text: 'I see them twist my soul for their', nowrap: true },
        { text: 'rigged games.', nowrap: true, face: 'germania' },
      ],
      reflection: { text: 'I know because I have done so.', nowrap: true, width: 0.7 },
    },
  ],
  refrain: [
    { text: 'I am playful.', display: 'I am pLAYFuL.', face: 'cinzel' },
    { text: 'I am inspired.', display: 'I am INSpIReD.', face: 'cinzel' },
    {
      text: 'I explode and collapse 15 times per minute.',
      display: 'i EXPLODE AND COLLAPSE 15 TiMES PER MiNUTE.',
      face: 'bricolage',
      lines: ['i EXPLODE AND', 'COLLAPSE 15 TiMES', 'PER MiNUTE.'],
      smallLines: ['i EXPLODE', 'AND COLLAPSE', '15 TiMES', 'PER MiNUTE.'],
    },
    {
      text: 'I carry 6 liters of glorified pain in my veins,',
      display: 'I CARRY 6 LITERS OF GLORIFIED PAIN IN MY VEINS,',
      face: 'germania',
    },
  ],
  coda: [{ text: 'and a love too deep to fathom.' }],
  continuation: [
    [
      { text: 'And I will not accept this hatred machinery eating up' },
      { text: 'the flowers', face: 'cinzel' },
      { text: 'that I so long to see out there in the fields of life.' },
    ],
  ],
} satisfies PoemPair

export default function Content({
  view = 'poem',
  section,
}: Pick<PoemOpeningProps, 'view' | 'section'> = {}) {
  return (
    <PoemCanvas>
      <PoemOpening
        id="verse-1"
        view={view}
        section={section}
        welcome={{
          greeting: '',
          paragraphs: [],
          scrollLabel: 'or read the manifesto',
        }}
        title={title}
        dates={dates}
        image={forest}
        lightSource={{ x: 53.24, y: 54.07 }}
        navigation={[
          {
            label: 'Watch',
            href: '#watch',
            verseBefore: { label: 'First verse and refrain', href: '#verse-1-pair-1' },
          },
          { label: 'Visit', href: '#facts' },
          {
            label: 'Create',
            href: '#create',
            verseBefore: { label: 'Second verse and refrain', href: '#verse-1-pair-2' },
          },
          {
            label: 'Share',
            href: '#share',
            verseBefore: { label: 'Third verse and refrain', href: '#verse-1-pair-3' },
          },
          {
            label: 'Inspire',
            verseBefore: { label: 'Bridge', href: '#verse-1-bridge' },
          },
          {
            label: 'Be Held',
            verseBefore: { label: 'Final verse', href: '#verse-1-final-verse' },
          },
          {
            label: 'Wish',
            verseBefore: { label: 'Final chorus', href: '#verse-1-final-chorus' },
          },
        ]}
        location={{
          image: room,
          imageAlt: 'The piano and room at Kulturhaus Steinfurth',
          heading: 'In essence this is us, the piano, and something to be said, sung and played.',
          venue: {
            name: 'Kulturhaus Steinfurth',
            href: 'https://kulturhaus-steinfurth.de/',
            travel: '3 hours by train from Berlin',
            latitude: 53.9722597,
            longitude: 13.643702,
          },
          invitation:
            'I would love to get visited in this cocoon and share meals, music, words, touch, tears and laughter.',
          action: {
            prompt: 'Lets connect and arrange your stay.',
            label: 'Join me in person',
            href: 'mailto:sound@hannesdiem.de',
          },
        }}
        facts={[
          {
            id: 'watch',
            afterPair: 1,
            layout: 'watch',
            images: [tos4, tos2],
            heading: watchIntroduction,
            paragraphs: watchFragments,
            action: { prompt: watchActionContext, label: 'Get notified', newsletter: 'temple' },
            after: recordings,
          },
          {
            id: 'create',
            afterPair: 2,
            layout: 'create',
            images: [tos, mixing],
            heading: createCopy.headline,
            paragraphs: [createCopy.invitation, createCopy.musicians, createCopy.beyondSound],
            action: {
              prompt: createCopy.actionContext,
              label: createCopy.actionLabel,
              href: 'mailto:sound@hannesdiem.de',
            },
          },
          {
            id: 'share',
            afterPair: 3,
            layout: 'share',
            images: [circlePhoto],
            circle: { places: 10, label: 'Take your place', reservation: 'temple-circle' },
            heading: "A recurring gathering to co-regulate what's moving us",
            paragraphs: [
              'We hold an online circle every Thursday 19:00',
              'The layer of sound is also the layer of speaking honestly, expressing desires and vocalizing boundaries. We share what is in the way of honest (self-)love, and witness one another without advice or discussion.',
            ],
          },
        ]}
        pairs={[firstPair, secondPair, thirdPair]}
        bridge={[
          [
            {
              text: 'I\u2003W I L L\u2003N O T\u2003B E N D\u2003F U R T H E R !',
              face: 'spaced',
              nowrap: true,
            },
            { text: 'I have trusted and accepted,' },
            { text: 'waited patiently,', face: 'cinzel' },
            { text: 'given space and opportunity to rest and resource.' },
          ],
        ]}
        bridgeBody={[
          {
            wideBreaksAfter: ['bury your shame,', 'painfully limited'],
            text: `But I see you **numbing**, **disconnecting** and **fleeing**.
I see you **frightened** and **scared**, my child.
I see you dam your tears, cage your anger, bury your shame, choke your disgust and bend your pride.

I see us **trapped** and **helpless**.
Painfully limited by routine and a **lack of belonging**.`,
          },
          `It **breaks my heart** to see you like this, my child.
I want you to know that I'm here and that you are **not alone anymore**.
I want you to understand that I can **stay with you** no matter what.

Oh yes, I know...
it's not easy, and **trust is hard to gift** when it has been broken so often.
That's ok. There's nothing you need to do. I understand it's **my responsibility** to show you.`,
          {
            linger: 'my child.',
            text: `I'm painfully aware that I will screw this up.
And I've also come to know that **I'm capable** of carrying and tending a wound further and further until it becomes something **wider** than a moment and **deeper** than a scene.

**I am so willing** to practice and keep on practicing the art of showing up
and **staying with you**, my child.`,
          },
        ]}
        finalVerse={{
          intro: [
            { text: "I'm devoting these two months to you, to the" },
            { text: 'tension and resonance', face: 'cinzel' },
            { text: 'between us and this elusive, precious reality out there.' },
          ],
          phrases: [
            [
              { text: 'May we find the' },
              { text: 'melodies', face: 'cinzel' },
              { text: 'that soothe and excite us,' },
            ],
            [
              { text: 'write the' },
              { text: 'words', face: 'cinzel' },
              { text: 'that speak our pain and joy,' },
            ],
            [
              { text: 'align the' },
              { text: 'harmonies', face: 'cinzel' },
              { text: 'that fail just slightly to hold' },
              { text: 'our longing for connection,' },
            ],
          ],
          rise: [
            'whisper the glimmer,',
            'hum the warmth,',
            'stomp the pulse,',
            'and scream out loud',
          ],
          drop: "what it means\nto be loved so fully that it's\nfrightening to tell anyone.",
          refrain: [
            { text: 'I am playful', display: 'i Am PlAYfUL', face: 'cinzel' },
            { text: 'I am inspired', display: 'I am INSpIRED', face: 'cinzel' },
            {
              text: 'I converge into diamonds and expand into void',
              display: 'I CONVERGE INTO DIAMONDS AND EXPAND INTO VOID',
              face: 'unbounded',
            },
            { text: 'I am alive', display: 'I aM aLIVe', face: 'cinzel' },
          ],
        }}
      />
    </PoemCanvas>
  )
}
