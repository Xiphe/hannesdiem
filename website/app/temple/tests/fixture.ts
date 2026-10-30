import type { CmxDocument } from '@cmx-tools/contracts'
import type { PoemPair } from '@hannesdiem/content-components'

const firstPair = {
  paragraphs: [
    [
      { text: 'A D D R E S S', face: 'spaced' },
      { text: 'Synthetic heading', face: 'cinzel' },
      { text: 'Synthetic supporting copy for responsive native text fitting.' },
    ],
    [
      { text: 'Another highlight', face: 'cinzel' },
      {
        text: 'Supporting text remains selectable and available without enhancement.',
      },
    ],
  ],
  refrain: [
    {
      text: 'First synthetic phrase.',
      display: 'First synthetic phrase.',
      face: 'cinzel',
    },
    {
      text: 'Second synthetic phrase.',
      display: 'SECOND SYNTHETIC PHRASE.',
      face: 'bricolage',
    },
    {
      text: 'Third synthetic phrase.',
      display: 'THIRD SYNTHETIC PHRASE.',
      face: 'unbounded',
    },
  ],
  coda: [
    { text: 'Synthetic coda', face: 'cinzel' },
    { text: 'The native document continues after the bounded hold.' },
  ],
} satisfies PoemPair

const secondPair = {
  paragraphs: [
    [
      { text: 'Second section introduction' },
      { text: 'Distinct highlight', face: 'germania' },
      { text: 'A gently sweeping synthetic line', shape: 'sweep' },
    ],
  ],
  refrain: [
    { text: 'Fourth synthetic phrase', display: 'Fourth synthetic phrase', face: 'cinzel' },
    {
      text: 'Fifth synthetic phrase',
      display: 'FIFTH SYNTHETIC PHRASE',
      face: 'unbounded',
      lines: ['FIFTH', 'SYNTHETIC', 'PHRASE'],
    },
  ],
  coda: [{ text: 'Second section conclusion', face: 'cinzel' }],
  continuation: [[{ text: 'A final synthetic paragraph follows.' }]],
} satisfies PoemPair

function fixtureContent(pairs?: readonly PoemPair[]): CmxDocument['content'] {
  return {
    title: 'Temple of Sound',
    default: {
      type: 'component',
      from: '@hannesdiem/content-components',
      import: 'PoemCanvas',
      children: [
        {
          type: 'component',
          from: '@hannesdiem/content-components',
          import: 'PoemOpening',
          props: {
            id: 'verse-fixture',
            title: 'Temple of Sound',
            dates: { start: '2030-01-01', end: '2030-02-02' },
            image: 'fixture-image',
            lightSource: { x: 50, y: 50 },
            ...(pairs ? { pairs } : { pair: firstPair }),
          },
          children: [
            { type: 'element', tag: 'p', children: ['Static verse fixture'] },
            {
              type: 'element',
              tag: 'a',
              props: { href: '/fixture' },
              children: ['Return to fixture'],
            },
          ],
        },
      ],
    },
  }
}
export const templeContent = fixtureContent()
export const multipleTempleContent = fixtureContent([firstPair, secondPair])
