import { PoemCanvas, PoemOpening, type PoemPair } from '@hannesdiem/content-components'

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

export default function Content() {
  return (
    <PoemCanvas>
      <PoemOpening
        id="verse-1"
        title={title}
        dates={{ start: '2026-11-01', end: '2026-12-20' }}
        image="IMG_6257.JPG"
        lightSource={{ x: 53.24, y: 54.07 }}
        pair={firstPair}
      />
    </PoemCanvas>
  )
}
