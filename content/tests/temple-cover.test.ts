import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'
import { cropTempleCover } from '../preparation/temple-cover.ts'
import { renderTempleShareImage } from '../preparation/temple-share-image.ts'

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

test('an authored subject lands in the open space above each fitted caption', async () => {
  const background = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="900"><circle cx="150" cy="450" r="8" fill="#f00"/></svg>',
    ),
  )
    .png()
    .toBuffer()
  const targets = []
  for (const title of [
    'Synthetic title',
    'Synthetic recording title with several extra words '.repeat(2),
  ]) {
    for (const showWordmark of [true, false]) {
      const card = await renderTempleShareImage({
        title,
        background,
        focalX: 50,
        focalY: 50,
        showWordmark,
      })
      const target = card.layout.focalTarget!
      const { data, info } = await sharp(card.bytes)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      let totalX = 0,
        totalY = 0,
        count = 0
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++) {
          const offset = (y * info.width + x) * info.channels
          if (data[offset] > 60 && data[offset + 1] < 20 && data[offset + 2] < 20) {
            totalX += x
            totalY += y
            count++
          }
        }
      assert.ok(count > 0)
      assert.ok(Math.abs(totalX / count - target.x) <= 2)
      assert.ok(Math.abs(totalY / count - target.y) <= 2)
      assert.ok(target.y < card.layout.titleTop)
      if (showWordmark) targets.push(target.y)
    }
  }
  assert.ok(targets[0] > targets[1])
})
