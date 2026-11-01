import type { CmxDocument } from '@cmx-tools/contracts'
import type { PoemPair, PoemLine, PoemOpeningProps } from '@hannesdiem/content-components'

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
      { text: 'Distinct highlight', face: 'germania', nowrap: true },
      {
        text: 'A gently sweeping synthetic line',
        shape: 'sweep',
        smallLines: ['A gently sweeping', 'synthetic line'],
      },
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

function fixtureContent(
  pairs?: readonly PoemPair[],
  bridge?: readonly (readonly PoemLine[])[],
  bridgeBody?: PoemOpeningProps['bridgeBody'],
): CmxDocument['content'] {
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
            ...(bridge ? { bridge } : {}),
            ...(bridgeBody ? { bridgeBody } : {}),
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

const thirdPair = {
  paragraphs: [
    [
      { text: 'A third synthetic introduction' },
      { text: 'An expressive highlight', face: 'germania' },
    ],
  ],
  repetition: [1, 2, 3].map((number) => ({
    statement: [
      { text: `Recurring synthetic statement ${number}`, nowrap: true },
      { text: 'An expressive conclusion.', face: 'germania' as const, nowrap: true },
    ],
    reflection: { text: 'A quieter synthetic reflection.', nowrap: true, width: 0.7 },
  })),
  refrain: [
    { text: 'First short phrase', display: 'First short phrase', face: 'cinzel' },
    { text: 'Second short phrase', display: 'Second short phrase', face: 'cinzel' },
    {
      text: 'A third stacked phrase',
      display: 'A THIRD STACKED PHRASE',
      face: 'bricolage',
      lines: ['A THIRD', 'STACKED PHRASE'],
      smallLines: ['A THIRD', 'STACKED', 'SYNTHETIC', 'PHRASE END'],
    },
    {
      text: 'A fourth synthetic phrase long enough to wrap on narrower viewports',
      display: 'A FOURTH SYNTHETIC PHRASE LONG ENOUGH TO WRAP ON NARROWER VIEWPORTS',
      face: 'germania',
    },
  ],
  coda: [{ text: 'Synthetic continuation after four phrases.' }],
} satisfies PoemPair
export const fourPhraseTempleContent = fixtureContent(
  [firstPair, secondPair, thirdPair],
  [
    [
      { text: 'S Y N T H E T I C B R I D G E', face: 'spaced', nowrap: true },
      { text: 'A synthetic introductory sentence,' },
      { text: 'a distinct emphasis,', face: 'cinzel' },
      { text: 'and a final line of supporting copy.' },
    ],
  ],
  [
    'A synthetic paragraph contains **several bold words** and *some italic words* and enough native lines to examine a scroll-driven letter reveal. The document keeps its ordinary geometry while cached glyphs grow into their readable form.',
    {
      linger: 'presentation.',
      text:
        'A second synthetic paragraph continues the reading flow.\n' +
        '**' +
        'A supplied *synthetic* sentence remains in its original paragraph while responsive pages divide only its presentation. '
          .repeat(10)
          .trimEnd() +
        '**',
    },
  ],
)
