import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'
import { cropTempleCover } from '../preparation/temple-cover.ts'

async function stripes() {
  return sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="900"><path fill="#f00" d="M0 0h300v300H0z"/><path fill="#0f0" d="M0 300h300v300H0z"/><path fill="#00f" d="M0 600h300v300H0z"/></svg>',
    ),
  )
    .png()
    .toBuffer()
}

test('focal crops preserve the selected part of a portrait image and stop at its edges', async () => {
  const bytes = await stripes()
  for (const [y, channel] of [
    [0, 0],
    [50, 1],
    [100, 2],
  ]) {
    const image = await cropTempleCover(bytes, 600, 315, 50, y)
    const { data, info } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.equal(info.width, 600)
    assert.equal(info.height, 315)
    const pixel = (157 * info.width + 300) * info.channels
    assert.ok(data[pixel + channel] > 240)
    assert.equal(data[pixel + ((channel + 1) % 3)], 0)
  }
  const centered = await (await cropTempleCover(bytes, 600, 315)).png().toBuffer()
  const original = await sharp(bytes).rotate().resize(600, 315, { fit: 'cover' }).png().toBuffer()
  assert.deepEqual(centered, original)
})

test('focal coordinates refer to the visible orientation after EXIF rotation', async () => {
  const bytes = await sharp(await stripes())
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer()
  for (const [x, channel] of [
    [0, 2],
    [100, 0],
  ]) {
    const image = await cropTempleCover(bytes, 315, 600, x, 50)
    const { data, info } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const pixel = (300 * info.width + 157) * info.channels
    assert.ok(data[pixel + channel] > 240)
  }
})

test('invalid focal coordinates stop card preparation', async () => {
  const bytes = await stripes()
  for (const coordinate of [-1, 101, NaN, Infinity]) {
    await assert.rejects(cropTempleCover(bytes, 600, 315, coordinate, 50), /percentages/)
    await assert.rejects(cropTempleCover(bytes, 600, 315, 50, coordinate), /percentages/)
  }
})
