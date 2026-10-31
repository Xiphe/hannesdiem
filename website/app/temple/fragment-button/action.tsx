import { ref, type Handle } from 'remix/component'
import type { PoemPair } from '@hannesdiem/content-components'
import { mountBorderMotion } from './border-motion.ts'
import { assembleBorder, generateFragments, randomFrom, type Piece } from './fragment-generator.ts'

type Action = NonNullable<PoemPair['action']>

export function FragmentAction(handle: Handle<Action>) {
  let stage: HTMLElement
  handle.queueTask((signal) => mountFragmentAction(stage, signal))
  return () => (
    <div
      class="fragment-action-stage"
      mix={ref((node) => {
        stage = node
      })}
      data-fragment-seed={handle.props.seed}
    >
      <a
        class="fragment-action"
        href={handle.props.href}
      >
        {handle.props.label}
      </a>
      <svg
        class="fragment-action-pieces"
        aria-hidden="true"
      />
    </div>
  )
}

function mountFragmentAction(stage: HTMLElement, signal: AbortSignal) {
  const board = stage.querySelector<SVGSVGElement>('svg')!
  const button = stage.querySelector<HTMLAnchorElement>('a')!
  const seed = stage.dataset.fragmentSeed ?? crypto.randomUUID()
  stage.dataset.fragmentSeed = seed
  const source = generateFragments(seed, 8)
  let pieces = source
  const ns = 'http://www.w3.org/2000/svg'
  const nodes = source.map((piece, i) => {
    const group = document.createElementNS(ns, 'g')
    group.dataset.piece = String(i)
    const tint = randomFrom(`${i}/${piece.d}/tint`)
    const hue = [36, 48, 75, 155, 190, 215, 25, 115][i % 8] + (tint() - 0.5) * 18
    const saturation = 20 + tint() * 16
    const lightness = 73 + tint() * 13
    group.style.fill = `light-dark(hsl(${hue} ${saturation}% ${lightness - 42}%), hsl(${hue} ${saturation}% ${lightness}%))`
    const path = document.createElementNS(ns, 'path')
    path.setAttribute('d', piece.d!)
    group.appendChild(path)
    board.appendChild(group)
    return group
  })
  for (let i = 0; i < source.length; i++) {
    const ink = nodes[i].querySelector('path')!.getBBox()
    source[i] = { ...source[i], origin: [-(ink.x + ink.width / 2), -(ink.y + ink.height)] }
  }
  function bounds() {
    const range = document.createRange()
    range.selectNodeContents(button)
    const label = range.getBoundingClientRect()
    return {
      width: Math.min(board.clientWidth - 64, Math.max(230, label.width + 48)),
      height: Math.max(64, label.height + 32),
    }
  }
  const motion = mountBorderMotion({
    stage,
    button,
    board,
    signal,
    pieces: () => pieces,
    bounds,
    paint: (node: SVGGElement, piece: Piece) =>
      node.setAttribute(
        'transform',
        `translate(${piece.x} ${piece.y}) rotate(${piece.angle}) scale(${piece.size / 28}) translate(${piece.origin?.join(' ') ?? '0 0'})`,
      ),
  })
  function layout() {
    if (signal.aborted) return
    const height = board.clientHeight
    board.setAttribute(
      'viewBox',
      `${-board.clientWidth / 2} ${-height / 2} ${board.clientWidth} ${height}`,
    )
    pieces = assembleBorder(source, { ...bounds(), overlap: 0.3, seed })
    motion.refresh(true)
    stage.dataset.fragmentsReady = ''
  }
  const resize = new ResizeObserver(layout)
  resize.observe(board)
  signal.addEventListener('abort', () => resize.disconnect(), { once: true })
  layout()
  void document.fonts.ready.then(layout)
}
