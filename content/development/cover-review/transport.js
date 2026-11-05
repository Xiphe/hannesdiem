export function stepFrame(time, direction, frameRate, duration) {
  const position = time * frameRate
  const index = direction > 0 ? Math.floor(position + 0.0001) + 1 : Math.ceil(position - 0.0001) - 1
  const last = Math.ceil(duration * frameRate) - 1
  return Math.max(0, Math.min(last, index)) / frameRate
}
