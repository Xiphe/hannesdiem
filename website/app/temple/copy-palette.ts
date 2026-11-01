// Shared channel mapping for the poem's colour clouds and fragment buttons.
const warmInk = [142, 68, 28]
const coolInk = [36, 89, 137]
const darkRange = [50, -8, -65]

export function copyInkChannel(base: number, temperature: number, channel: number, light: boolean) {
  const tint = temperature >= 0 ? warmInk[channel] : coolInk[channel]
  const amount = Math.min(1, Math.abs(temperature) * 2.4)
  const original = Math.max(0, Math.min(255, base + temperature * darkRange[channel]))
  return Math.max(
    0,
    Math.min(255, Math.round(light ? (original + base + (tint - base) * amount) / 2 : original)),
  )
}

export function copyInkColour(base: readonly number[], temperature: number, light: boolean) {
  return `rgb(${base.map((channel, i) => copyInkChannel(channel, temperature, i, light)).join(' ')})`
}
