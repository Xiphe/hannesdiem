import sharp from 'sharp'

/** Place the authored point at its composition target, stopping at image edges. */
export async function cropTempleCover(
  bytes: Uint8Array,
  width: number,
  height: number,
  focalX = 50,
  focalY = 50,
  targetY = height / 2,
) {
  for (const coordinate of [focalX, focalY])
    if (!Number.isFinite(coordinate) || coordinate < 0 || coordinate > 100)
      throw new Error('Cover focal coordinates must be percentages between 0 and 100')
  const image = sharp(bytes)
  const metadata = await image.metadata()
  const rotated = [5, 6, 7, 8].includes(metadata.orientation ?? 1)
  const sourceWidth = rotated ? metadata.height! : metadata.width!
  const sourceHeight = rotated ? metadata.width! : metadata.height!
  if (!sourceWidth || !sourceHeight) throw new Error('Cover image has no dimensions')
  if (focalX === 50 && focalY === 50 && targetY === height / 2)
    return image.rotate().resize(width, height, { fit: 'cover' })
  const scale = Math.max(width / sourceWidth, height / sourceHeight)
  const scaledWidth = Math.max(width, Math.round(sourceWidth * scale))
  const scaledHeight = Math.max(height, Math.round(sourceHeight * scale))
  const left = Math.round(
    Math.max(0, Math.min(scaledWidth - width, (scaledWidth * focalX) / 100 - width / 2)),
  )
  const top = Math.round(
    Math.max(0, Math.min(scaledHeight - height, (scaledHeight * focalY) / 100 - targetY)),
  )
  return image
    .rotate()
    .resize(scaledWidth, scaledHeight, { fit: 'fill' })
    .extract({ left, top, width, height })
}
