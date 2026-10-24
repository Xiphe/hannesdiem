import assert from 'node:assert/strict'
import { test } from 'node:test'
import { prepareShareImages } from '../preparation/share-images.ts'

test('prepared share images in entry metadata need no rendering or upload', async () => {
  const output = await prepareShareImages(
    [
      {
        path: '/fixture',
        document: 'fixture',
        title: 'Fixture',
        kind: 'page',
        shareImage: true,
        ogImage: { src: 'https://media.example.com/prepared.jpg', width: 100, height: 50 },
      },
    ],
    { base: 'https://media.example.com', account: 'not-used', bucket: 'not-used' },
  )
  assert.deepEqual(output, {})
})
