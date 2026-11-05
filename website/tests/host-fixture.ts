import {
  templeContent,
  multipleTempleContent,
  fourPhraseTempleContent,
  riseTempleContent,
  bridgeFinaleTempleContent,
  chorusNavigationTempleContent,
  actionlessTempleContent,
  locationTempleContent,
  navigationTempleContent,
  factsTempleContent,
  videoTempleContent,
  recordingsTempleContent,
  reservationTempleContent,
  entryTempleContent,
} from '../app/temple/tests/fixture.ts'
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
  version: 2,
  media: { 'fixture-image': { src: assets.mark, width: 32, height: 32 } },
  navigation: {
    sections: [{ name: 'Fixture', items: [{ name: 'Fixture', href: '/fixture' }] }],
    legal: { name: 'Legal', items: [] },
    social: [],
    listen: [],
  },
}
export const documents: PublishedDocuments = {
  _404: structuredClone(page),
  fixture: structuredClone(page),
  'temple-of-sound': {
    ...structuredClone(page),
    content: { ...templeContent, metadata: { kind: 'temple' } },
  },
  'temple-multiple': {
    ...structuredClone(page),
    content: { ...multipleTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-without-action': {
    ...structuredClone(page),
    content: { ...actionlessTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-navigation': {
    ...structuredClone(page),
    content: { ...navigationTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-circle': {
    ...structuredClone(page),
    content: { ...reservationTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-facts': {
    ...structuredClone(page),
    content: { ...factsTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-video': {
    ...structuredClone(page),
    content: { ...videoTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-recordings': {
    ...structuredClone(page),
    content: { ...recordingsTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-location': {
    ...structuredClone(page),
    content: { ...locationTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-four-phrases': {
    ...structuredClone(page),
    content: { ...fourPhraseTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-bridge-finale': {
    ...structuredClone(page),
    content: { ...bridgeFinaleTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-chorus-navigation': {
    ...structuredClone(page),
    content: { ...chorusNavigationTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-rise': {
    ...structuredClone(page),
    content: { ...riseTempleContent, metadata: { kind: 'temple' } },
  },
  'temple-entry-poem': {
    ...structuredClone(page),
    content: { ...entryTempleContent('poem'), metadata: { kind: 'temple' } },
  },
  ...Object.fromEntries(
    (['visit', 'watch', 'create', 'share'] as const).map((section) => [
      `temple-of-sound/${section}`,
      {
        ...structuredClone(page),
        content: { ...entryTempleContent('inside', section), metadata: { kind: 'temple' } },
      },
    ]),
  ),
  _redirects: {
    ...structuredClone(page),
    interface: { imports: {}, exports: { redirects: {} } },
    content: { redirects: [{ path: '/', to: '/fixture', status: 307 }] },
  },
  _site: {
    ...structuredClone(page),
    interface: { imports: {}, exports: { site: {} } },
    content: { site },
  },
}
