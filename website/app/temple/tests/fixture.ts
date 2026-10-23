import type { CmxDocument } from '@cmx-tools/contracts'

export const templeContent: CmxDocument['content'] = {
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
