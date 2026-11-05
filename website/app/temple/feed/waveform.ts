/** Actual recording peaks, not an animated imitation of audio. */
export async function audioPeaks(src: string, signal: AbortSignal, count = 72) {
  const response = await fetch(src, { signal })
  if (!response.ok) throw new Error('Audio waveform unavailable')
  const data = await response.arrayBuffer()
  if (signal.aborted) return []
  const context = new AudioContext()
  try {
    const buffer = await context.decodeAudioData(data)
    if (signal.aborted) return []
    const peaks = Array.from({ length: count }, (_, index) => {
      const start = Math.floor((index * buffer.length) / count)
      const end = Math.floor(((index + 1) * buffer.length) / count)
      let peak = 0
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const samples = buffer.getChannelData(channel)
        for (let frame = start; frame < end; frame++)
          peak = Math.max(peak, Math.abs(samples[frame]))
      }
      return peak
    })
    const maximum = Math.max(...peaks, 0.01)
    return peaks.map((peak) => peak / maximum)
  } finally {
    await context.close()
  }
}

export function drawWaveform(svg: SVGSVGElement, peaks: readonly number[]) {
  svg.replaceChildren(
    ...peaks.map((peak, index) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      const height = Math.max(2, Math.min(1, Math.max(0, peak)) * 52)
      rect.setAttribute('x', String((index * 300) / peaks.length))
      rect.setAttribute('y', String((56 - height) / 2))
      rect.setAttribute('width', String(Math.max(1, 300 / peaks.length - 1.5)))
      rect.setAttribute('height', String(height))
      rect.setAttribute('rx', '1')
      return rect
    }),
  )
}
