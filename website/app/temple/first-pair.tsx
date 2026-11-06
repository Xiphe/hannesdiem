import type { Handle } from 'remix/component'
import { FragmentAction } from './fragment-button/action.tsx'
import type { PoemLine, PoemPair } from '@hannesdiem/content-components'
function TypeLine(handle: Handle<PoemLine>) {
  return () => (
    <span
      class="block-line"
      data-type-line
      style={
        handle.props.width === undefined ? undefined : { width: `${handle.props.width * 100}%` }
      }
      data-shape={handle.props.shape}
      data-small-lines={handle.props.smallLines?.join('\n')}
      data-nowrap={handle.props.nowrap ? '' : undefined}
      data-lettering={handle.props.face ?? 'copy'}
    >
      {handle.props.text}
    </span>
  )
}

export function Phrase(handle: Handle<{ lines: readonly PoemLine[]; firstStatic?: boolean }>) {
  return () => {
    const lines = handle.props.lines
    const groups = lines[0]?.face === 'spaced' ? [lines.slice(0, 1), lines.slice(1)] : [lines]
    return (
      <>
        {groups
          .filter((group) => group.length)
          .map((group, groupIndex) => (
            <span
              class="phrase-entry"
              data-entry={
                group[0].face === 'spaced' ||
                (handle.props.firstStatic && (lines[0]?.face !== 'spaced' || groupIndex === 0))
                  ? undefined
                  : ''
              }
            >
              {group.map((line, index) => (
                <>
                  {index > 0 ? ' ' : ''}
                  <TypeLine {...line} />
                </>
              ))}
            </span>
          ))}
      </>
    )
  }
}

export function FirstPair(handle: Handle<{ id: string; pair: PoemPair; index: number }>) {
  return () => {
    const { pair } = handle.props
    return (
      <article
        id={handle.props.id}
        class="first-pair"
        aria-label={
          handle.props.index === 0
            ? 'First verse and refrain'
            : `Verse ${handle.props.index + 1} and refrain`
        }
      >
        <div class="verse-copy">
          {pair.paragraphs.map((lines, index) => (
            <p data-nav-visual>
              <Phrase
                lines={lines}
                firstStatic={index === 0}
              />
            </p>
          ))}
        </div>
        {pair.repetition && (
          <div class="verse-copy repetition-stack">
            {pair.repetition.map(({ statement, reflection }, index) => (
              <section class="repetition-track">
                <div class="repetition-stage">
                  <p class="repetition-statement">
                    <Phrase
                      lines={statement}
                      firstStatic={index !== 0}
                    />
                  </p>
                  <p class="repetition-reflection">
                    <Phrase
                      lines={[reflection]}
                      firstStatic
                    />
                  </p>
                </div>
              </section>
            ))}
          </div>
        )}
        <Refrain phrases={pair.refrain} />
        <div
          class="verse-copy verse-coda"
          data-has-action={pair.action ? '' : undefined}
        >
          {[pair.coda, ...(pair.continuation ?? [])].map((lines, index) => (
            <p data-nav-visual>
              <Phrase
                lines={lines}
                firstStatic={index === 0}
              />
            </p>
          ))}
          {pair.action && <FragmentAction {...pair.action} />}
        </div>
      </article>
    )
  }
}

export function Refrain(
  handle: Handle<{ id?: string; phrases: PoemPair['refrain']; entry?: boolean }>,
) {
  return () => (
    <section
      id={handle.props.id}
      class="refrain-composition"
      aria-label="Refrain"
    >
      <div class="refrain-stage">
        {handle.props.phrases.map(({ text, display, face, lines, smallLines }, index) => (
          <p
            class="refrain-phrase"
            data-face={face}
            data-phrase={index}
            data-small-refrain-lines={smallLines?.join('\n')}
            data-wide-refrain-lines={smallLines ? (lines ?? [display]).join('\n') : undefined}
          >
            <span class="semantic-text">{text}</span>
            <span
              data-ink
              aria-hidden="true"
            >
              {(lines
                ? lines.map((line) => line.split(' '))
                : face === 'bricolage'
                  ? [display.split(' ').slice(0, 2), display.split(' ').slice(2)]
                  : [display.split(' ')]
              ).map((words) => (
                <span data-line={lines || face === 'bricolage' ? '' : undefined}>
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
        {handle.props.entry && (
          <div class="temple-entry-closing fact-action">
            <a
              class="temple-enter-button"
              href="/temple-of-sound/visit"
              data-rmx-document
            >
              Enter
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
