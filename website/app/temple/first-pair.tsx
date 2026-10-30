import type { Handle } from 'remix/component'
import type { PoemLine, PoemPair } from '@hannesdiem/content-components'
function TypeLine(handle: Handle<PoemLine>) {
  return () => (
    <span
      class="block-line"
      data-type-line
      data-lettering={handle.props.face ?? 'copy'}
    >
      {handle.props.text}
    </span>
  )
}

export function FirstPair(handle: Handle<{ pair: PoemPair }>) {
  return () => {
    const { pair } = handle.props
    return (
      <article
        class="first-pair"
        aria-label="First verse and refrain"
      >
        <div class="verse-copy">
          {pair.paragraphs.map((lines) => (
            <p>
              {lines.map((line, index) => (
                <>
                  {index > 0 ? ' ' : ''}
                  <TypeLine {...line} />
                </>
              ))}
            </p>
          ))}
        </div>
        <section
          class="refrain-composition"
          aria-label="Refrain"
        >
          <div class="refrain-stage">
            {pair.refrain.map(({ text, display, face }, index) => (
              <p
                class="refrain-phrase"
                data-face={face}
                data-phrase={index}
              >
                <span class="semantic-text">{text}</span>
                <span
                  data-ink
                  aria-hidden="true"
                >
                  {(face === 'bricolage'
                    ? [display.split(' ').slice(0, 2), display.split(' ').slice(2)]
                    : [display.split(' ')]
                  ).map((words) => (
                    <span data-line={face === 'bricolage' ? '' : undefined}>
                      {words.map((word, i) => (
                        <>
                          {i > 0 ? ' ' : ''}
                          <span data-word>{word}</span>
                        </>
                      ))}
                    </span>
                  ))}
                </span>
              </p>
            ))}
            <canvas
              class="refrain-canvas"
              aria-hidden="true"
            />
          </div>
        </section>
        <div class="verse-copy verse-coda">
          <p>
            {pair.coda.map((line, index) => (
              <>
                {index > 0 ? ' ' : ''}
                <TypeLine {...line} />
              </>
            ))}
          </p>
        </div>
      </article>
    )
  }
}
