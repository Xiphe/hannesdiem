// Shared soft point of light; the opener keeps its original warm palette.
export function createGlimmerSprite(
  light = false,
  colors?: readonly [string, string, string, string],
) {
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = 48
  const brush = sprite.getContext('2d')!
  const glow = brush.createRadialGradient(24, 24, 0, 24, 24, 24)
  glow.addColorStop(0, colors?.[0] ?? (light ? '#91652f' : '#fff9df'))
  glow.addColorStop(0.1, colors?.[1] ?? (light ? '#ad8049d0' : '#ffeac6e0'))
  glow.addColorStop(0.3, colors?.[2] ?? (light ? '#c5a36a50' : '#ffd19365'))
  glow.addColorStop(1, colors?.[3] ?? (light ? '#c5a36a00' : '#ffb45b00'))
  brush.fillStyle = glow
  brush.fillRect(0, 0, 48, 48)
  return sprite
}
