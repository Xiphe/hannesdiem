import type { PageMetadata } from '../../types.ts'
import { PoemCanvas, PoemOpening, type PoemPair } from '@hannesdiem/content-components'

import forest from '../../media/IMG_6257.JPG'

export const metadata = { kind: 'temple', image: forest } satisfies PageMetadata

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
      { text: 'trust and connection', face: 'cinzel' },
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
      { text: "Yet I'm in deep hurt and grief with" },
      { text: 'mankind and earth.', face: 'cinzel' },
    ],
    [
      { text: 'Violent fear,', face: 'germania' },
      { text: 'greed and mistrust rule and devour soil and seeds alike.' },
    ],
    [
      { text: 'I understand we coexist in a storm held between' },
      { text: 'chaotic rupture', face: 'germania' },
      {
        text: 'and the calm scent of a rose touching my heart like a midsummer sunset',
        shape: 'sweep',
      },
    ],
  ],
  refrain: [
    { text: "I'm playful and inspired", display: "I'm pLAYFuL aNd INSpIReD", face: 'cinzel' },
    {
      text: "I'm bursting and imploding",
      display: "i'M BURSTiNG AND iMPLODiNG",
      face: 'bricolage',
    },
    {
      text: "I'm raging angry",
      display: "I'M RAGING ANGRY",
      face: 'unbounded',
      lines: ["I'M", 'RAGING', 'ANGRY'],
    },
  ],
  coda: [{ text: 'with those who mistreat willingly' }, { text: 'and myself for having done so.' }],
} satisfies PoemPair

export default function Content() {
  return (
    <PoemCanvas>
      <PoemOpening
        id="verse-1"
        title={title}
        dates={{ start: '2026-11-01', end: '2026-12-20' }}
        image={forest}
        lightSource={{ x: 53.24, y: 54.07 }}
        pairs={[firstPair, secondPair]}
      />
    </PoemCanvas>
  )
}
