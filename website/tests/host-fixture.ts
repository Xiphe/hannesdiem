import { templeContent } from '../app/temple/tests/fixture.ts'
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
    content: templeContent,
  },
  _site: {
    ...structuredClone(page),
    interface: { imports: {}, exports: { site: {} } },
    content: { site },
  },
}
