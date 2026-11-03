/** Approved date treatment, applied before the existing native text mask. */
export function paintNavigationDate(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  dark: boolean,
) {
  context.save()
  // A warm base reduces the forest's extreme light/dark patches without
  // erasing its moving texture. The gradients then make smaller changes.
  context.globalAlpha = 0.25
  context.fillStyle = '#e77832'
  context.fillRect(0, 0, width, height)
  context.globalAlpha = 1
  const shade = context.createLinearGradient(0, 0, width, 0)
  shade.addColorStop(0, 'transparent')
  shade.addColorStop(0.5, `rgb(0 0 0 / ${0.1})`)
  shade.addColorStop(1, 'transparent')
  context.fillStyle = shade
  context.fillRect(0, 0, width, height)
  const warm = context.createLinearGradient(0, 0, width, 0)
  const reach = 0.3
  warm.addColorStop(0, '#e77832')
  warm.addColorStop(reach, '#e7783200')
  warm.addColorStop(1 - reach, '#e7783200')
  warm.addColorStop(1, '#e77832')
  context.globalCompositeOperation = 'screen'
  context.globalAlpha = 0.2
  context.fillStyle = warm
  context.fillRect(0, 0, width, height)
  context.globalCompositeOperation = 'source-over'
  context.globalAlpha = 1
  // In light mode, retain the full material before the paper lift so its
  // highlights still travel through the date rather than being dimmed twice.
  const brightness = dark ? 55 : 100
  context.fillStyle = `rgb(0 0 0 / ${1 - brightness / 100})`
  context.fillRect(0, 0, width, height)
  if (!dark) {
    // Lift towards the header's warm paper so lighter also means quieter.
    context.globalAlpha = 0.5
    context.fillStyle = '#f7ecdf'
    context.fillRect(0, 0, width, height)
  }
  context.restore()
}
