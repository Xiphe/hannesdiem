import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CMX_DOCUMENT_SCHEMA, type CmxComponentNode, type CmxDocument } from '@cmx-tools/contracts'
import { createElement } from 'remix/component'
import { renderToString } from 'remix/component/server'
import { externalLinkProps } from '../app/external-links.ts'
import { externalLinksDocument } from '../app/ui-library/document-links.ts'
import { renderContent } from '../app/ui-library/render.ts'
import { Button } from '../app/ui-library/links.tsx'

const document = (body: CmxDocument['content'][string]): CmxDocument => ({
  $schema: CMX_DOCUMENT_SCHEMA,
  cmxVersion: 1,
  interface: {
    imports: {},
    exports: {
      default: { type: { from: '@cmx-tools/contracts', import: 'CmxNode' }, slots: [[]] },
      title: { type: { from: '@cmx-tools/contracts', import: 'CmxNode' } },
    },
  },
  content: { title: 'Synthetic page', default: body },
})

test('external website destinations open a new tab while local and application links retain their behavior', () => {
  for (const href of [
    'https://outside.example/credit',
    'http://outside.example',
    '//outside.example',
  ])
    assert.deepEqual(externalLinkProps(href), { target: '_blank', rel: 'noopener noreferrer' })
  for (const href of [
    '/inside',
    '#section',
    '?query=synthetic',
    'relative/path',
    'https://hannesdiem.de/inside',
    'https://www.hannesdiem.de/inside',
    'mailto:synthetic@example.org',
    'tel:+123456',
    'https://[invalid',
    undefined,
  ])
    assert.deepEqual(externalLinkProps(href), {})
  assert.equal(externalLinkProps('https://hannesdiem.de.outside.example/').target, '_blank')
  assert.deepEqual(externalLinkProps('https://outside.example', 'ugc nofollow opener'), {
    target: '_blank',
    rel: 'ugc nofollow noopener noreferrer',
  })
})

test('native CMX traversal updates children and declared prop slots without mutating the Publication or opaque data', async () => {
  const anchor = {
    type: 'element' as const,
    tag: 'a',
    props: { href: 'https://outside.example/credit', target: '_self' },
    children: ['Credit'],
  }
  const source = document({
    type: 'component',
    from: '@example/components',
    import: 'Card',
    props: { caption: anchor, opaque: anchor },
    slots: [['caption']],
    children: [{ type: 'element', tag: 'a', props: { href: '/inside' }, children: ['Inside'] }],
  })
  const before = structuredClone(source)
  const linked = await externalLinksDocument(source)
  const card = linked.content.default as CmxComponentNode
  assert.deepEqual(card.props?.caption, {
    ...anchor,
    props: { ...anchor.props, target: '_blank', rel: 'noopener noreferrer' },
  })
  assert.deepEqual(card.props?.opaque, anchor)
  assert.deepEqual(card.children, (before.content.default as CmxComponentNode).children)
  assert.deepEqual(source, before)
})

test('server-rendered content and shared buttons supply the policy without client JavaScript', async () => {
  const page = await renderContent(
    document({
      type: 'element',
      tag: 'a',
      props: { href: 'https://outside.example/credit' },
      children: ['Credit'],
    }),
  )
  assert.match(await renderToString(page.body), /target="_blank" rel="noopener noreferrer"/)
  const external = await renderToString(
    createElement(Button, {
      href: 'https://outside.example/action',
      label: 'External action',
      blank: false,
    }),
  )
  assert.match(external, /target="_blank"/)
  const internal = await renderToString(createElement(Button, { href: '/inside', label: 'Inside' }))
  assert.doesNotMatch(internal, /target=/)
})
