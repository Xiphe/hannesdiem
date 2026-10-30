import assets from '../../.generated/assets.json' with { type: 'json' }
import { CMX_DOCUMENT_SCHEMA, type CmxDocument } from '@cmx-tools/contracts'
import type { PublishedDocuments, SiteMetadata } from '../../contracts/content.ts'

// Synthetic CMS input: website checks never compile or read authored content.
const page: CmxDocument = {
  $schema: CMX_DOCUMENT_SCHEMA,
  cmxVersion: 1,
  interface: {
    imports: {
      '@hannesdiem/content-components': {
        name: '@hannesdiem/content-components',
        specifier: 'file:contracts/components',
        version: '0.1.0',
      },
    },
    exports: {
      default: { type: { from: '@cmx-tools/contracts', import: 'CmxNode' }, slots: [[]] },
      title: { type: { from: '@cmx-tools/contracts', import: 'CmxNode' } },
    },
  },
  content: { default: 'Synthetic page', title: 'Synthetic title' },
}
const site: SiteMetadata = {
  version: 1,
  routes: [
    { path: '/fixture', document: 'fixture', title: 'Synthetic title', kind: 'page' },
    { path: '/temple-of-sound', document: 'temple', title: 'Temple of Sound', kind: 'temple' },
  ],
  media: { 'fixture-image': { src: assets.mark, width: 32, height: 32 } },
  shareImages: {},
  redirects: [{ path: '/', to: '/fixture', status: 307 }],
  navigation: {
    sections: [{ name: 'Fixture', items: [{ name: 'Fixture', href: '/fixture' }] }],
    legal: { name: 'Legal', items: [] },
    social: [],
    listen: [],
  },
}
export const documents: PublishedDocuments = {
  '404': structuredClone(page),
  fixture: structuredClone(page),
  temple: {
    ...structuredClone(page),
    content: {
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
              pair: {
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
              },
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
    },
  },
  _site: {
    ...structuredClone(page),
    interface: { imports: {}, exports: { site: {} } },
    content: { site },
  },
}
