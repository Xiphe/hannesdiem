import type { Handle } from 'remix/component'

// Assemble as the closing scene slows, then release into native scroll. All variations
// are static per-word parameters; no per-frame DOM updates or extra clock.
export function VerseDrop(handle: Handle<{ text: string }>) {
  return () => {
    let wordIndex = 0
    return (
      <div class="verse-drop">
        <div class="verse-drop-stage">
          <p class="verse-drop-copy">
            {handle.props.text.split('\n').map((line, lineIndex) => (
              <>
                {lineIndex > 0 && '\n'}
                <span class="verse-drop-line">
                  {line.split(/(\s+)/).map((word) => {
                    if (!word.trim()) return word
                    const index = wordIndex++ * 2
                    const fraction = (salt: number) => {
                      const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453
                      return value - Math.floor(value)
                    }
                    const start = (fraction(0) * 8 * 100) / 116
                    return (
                      <span
                        class="verse-drop-word"
                        style={{
                          '--drop-x': `${fraction(1) * 200 - 100}%`,
                          '--drop-y': `${fraction(2) * 80 - 40}%`,
                          '--drop-z': `${500 + fraction(3) * 450}px`,
                          '--drop-angle': `${fraction(4) * 180 - 90}deg`,
                          '--drop-start': `${start}%`,
                          '--drop-end': `${start + (108 * 100) / 116}%`,
                        }}
                      >
                        {word}
                      </span>
                    )
                  })}
                </span>
              </>
            ))}
          </p>
        </div>
      </div>
    )
  }
}

// Keep authored lines intact even on phones, without enlarging the small type.
export function fitVerseDrop(root: HTMLElement, signal: AbortSignal) {
  const copy = root.querySelector<HTMLElement>('.verse-drop-copy')
  const finale = copy?.closest<HTMLElement>('.verse-finale')
  const stage = finale?.querySelector<HTMLElement>('.verse-finale-stage')
  const measure = document.createElement('canvas').getContext('2d')!
  signal.addEventListener(
    'abort',
    () => {
      copy?.style.removeProperty('--drop-font-size')
      finale?.style.removeProperty('--finale-height')
      finale?.style.removeProperty('--finale-top')
      finale?.style.removeProperty('--finale-inset-end')
    },
    { once: true },
  )
  return () => {
    if (!copy || signal.aborted) return
    copy.style.removeProperty('--drop-font-size')
    const style = getComputedStyle(copy)
    measure.font = `${style.fontWeight} 100px ${style.fontFamily}`
    const width = Math.max(
      ...[...copy.querySelectorAll('.verse-drop-line')].map((line) => {
        const metrics = measure.measureText(line.textContent!)
        return Math.max(
          metrics.width,
          metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
        )
      }),
    )
    const size = Math.min(parseFloat(style.fontSize), ((copy.clientWidth - 4) * 100) / width)
    copy.style.setProperty('--drop-font-size', `${size}px`)
    const height = copy.getBoundingClientRect().height
    if (finale && stage) {
      const bounds = stage.getBoundingClientRect()
      const offset = copy.getBoundingClientRect().top - bounds.top
      const anchor = parseFloat(getComputedStyle(finale).getPropertyValue('--drop-anchor')) || 50
      const pinTop = (innerHeight * anchor) / 100 - height / 2 - offset
      finale.style.setProperty('--finale-height', `${bounds.height}px`)
      finale.style.setProperty('--finale-top', `${pinTop}px`)
      finale.style.setProperty('--finale-inset-end', `${innerHeight - pinTop - bounds.height}px`)
    }
  }
}
