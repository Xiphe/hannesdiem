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
  action: { label: 'Explore fixture', href: '/fixture', seed: 'fixture-action' },
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
  location?: PoemOpeningProps['location'],
  navigation?: PoemOpeningProps['navigation'],
  finalVerse?: PoemOpeningProps['finalVerse'],
  facts?: PoemOpeningProps['facts'],
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
            ...(location ? { location } : {}),
            ...(navigation ? { navigation } : {}),
            ...(finalVerse ? { finalVerse } : {}),
            ...(facts ? { facts } : {}),
          },
          ...(finalVerse?.refrain
            ? {}
            : {
                children: [
                  { type: 'element', tag: 'p', children: ['Static verse fixture'] },
                  {
                    type: 'element',
                    tag: 'a',
                    props: { href: '/fixture' },
                    children: ['Return to fixture'],
                  },
                ],
              }),
        },
      ],
    },
  }
}
export const templeContent = fixtureContent()
export const multipleTempleContent = fixtureContent([firstPair, secondPair])
const finalVerse = {
  intro: [{ text: 'Synthetic final verse introduction.' }],
  phrases: [[{ text: 'Synthetic lead-in.' }, { text: 'A highlight', face: 'cinzel' }]],
  rise: ['Soft sample,', 'Another sample,', 'Third sample,', 'An ending synthetic call'],
  drop: 'A small synthetic sentence\nfollows the accumulated calls\nand finishes on a third row.',
  refrain: [
    { text: 'A first closing phrase', display: 'A first closing phrase', face: 'cinzel' },
    { text: 'A second closing phrase', display: 'A second closing phrase', face: 'cinzel' },
    {
      text: 'A synthetic WIDEMEASUREMENT phrase for a narrow screen',
      display: 'A SYNTHETIC WIDEMEASUREMENT PHRASE FOR A NARROW SCREEN',
      face: 'unbounded',
    },
    { text: 'The closing phrase', display: 'The closing phrase', face: 'cinzel' },
  ],
} satisfies NonNullable<PoemOpeningProps['finalVerse']>
export const riseTempleContent = fixtureContent(
  [firstPair],
  undefined,
  undefined,
  undefined,
  undefined,
  finalVerse,
)
export const bridgeFinaleTempleContent = fixtureContent(
  [firstPair],
  [[{ text: 'A synthetic bridge introduction.' }]],
  ['A synthetic reading paragraph stays clear of the sculpture. '.repeat(12).trim()],
  undefined,
  undefined,
  finalVerse,
)
const { action: _action, ...actionlessPair } = firstPair
export const actionlessTempleContent = fixtureContent([actionlessPair, secondPair])
const fixtureLocation = {
  image: 'fixture-image',
  imageAlt: 'Synthetic room image',
  heading: 'A synthetic invitation with enough words to wrap naturally in the narrow layout.',
  venue: {
    name: 'Synthetic studio',
    href: 'https://example.com/studio',
    travel: 'Synthetic travel information',
    latitude: 52.5,
    longitude: 13.4,
  },
  invitation: 'A synthetic personal invitation for the location component fixture.',
  action: {
    prompt: 'Arrange a fixture visit',
    label: 'Contact fixture',
    href: 'mailto:fixture@example.com',
  },
} satisfies NonNullable<PoemOpeningProps['location']>
export const locationTempleContent = fixtureContent(
  [actionlessPair, secondPair],
  undefined,
  undefined,
  fixtureLocation,
)
export const navigationTempleContent = fixtureContent(
  [actionlessPair, secondPair],
  undefined,
  undefined,
  fixtureLocation,
  [
    { label: 'First target', href: '#facts' },
    {
      label: 'Second target',
      verseBefore: { label: 'First fixture verse', href: '#verse-fixture-pair-1' },
    },
    {
      label: 'Third target',
      verseBefore: { label: 'Second fixture verse', href: '#verse-fixture-pair-2' },
    },
    { label: 'Fourth target' },
    { label: 'Fifth target' },
    { label: 'Sixth target' },
    { label: 'Seventh target' },
  ],
)

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
    'Please read **several bold words** and *some italic words* in this synthetic paragraph, with enough native lines to examine a scroll-driven letter reveal. The document keeps its ordinary geometry while cached glyphs grow into their readable form.',
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

export const factsTempleContent = fixtureContent(
  [actionlessPair, secondPair],
  undefined,
  undefined,
  fixtureLocation,
  [
    { label: 'Location', href: '#facts' },
    {
      label: 'Updates',
      href: '#fixture-watch',
      verseBefore: { label: 'First verse', href: '#verse-fixture-pair-1' },
    },
    {
      label: 'Contact',
      href: '#fixture-create',
      verseBefore: { label: 'Second verse', href: '#verse-fixture-pair-2' },
    },
  ],
  undefined,
  [
    {
      id: 'fixture-watch',
      afterPair: 1,
      layout: 'watch',
      images: ['fixture-image', 'fixture-image'],
      heading: 'A synthetic update heading that spans several lines on small screens.',
      paragraphs: [
        'Synthetic opening paragraph. '.repeat(12).trim(),
        'A second synthetic paragraph. '.repeat(8).trim(),
      ],
      action: { prompt: 'Synthetic update invitation', label: 'Fixture pending action' },
    },
    {
      id: 'fixture-create',
      afterPair: 2,
      layout: 'create',
      images: ['fixture-image', 'fixture-image'],
      heading: 'A synthetic contact heading',
      paragraphs: [
        'A separate fixture invitation. '.repeat(9).trim(),
        'Synthetic collaboration details. '.repeat(7).trim(),
      ],
      action: {
        prompt: 'Synthetic contact invitation',
        label: 'Fixture contact action',
        href: 'mailto:fixture@example.com',
      },
    },
  ],
)
