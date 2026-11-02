import { ref, type Handle } from 'remix/component'
import type { PoemPair } from '@hannesdiem/content-components'
import { mountBorderMotion } from './border-motion.ts'
import { copyInkColour } from '../copy-palette.ts'
import { defaults } from '../defaults.ts'
import { mountGroundSignal } from './ground-signal.ts'
import { fragmentStroke, groundMaterial, provideGroundMaterial } from './material.ts'
import { assembleBorder, generateFragments, type Piece } from './fragment-generator.ts'

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
  const source = generateFragments(seed, 11)
  let pieces = source
  const ns = 'http://www.w3.org/2000/svg'
  const definitions = document.createElementNS(ns, 'defs')
  board.appendChild(definitions)
  const style = getComputedStyle(stage)
  const themeBase = (theme: 'light' | 'dark') => {
    const hex =
      style.getPropertyValue(`--copy-ink-${theme}`).trim() ||
      (theme === 'light' ? '#11120b' : defaults.copyColor)
    return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16))
  }
  const lightBase = themeBase('light')
  const darkBase = themeBase('dark')
  const nodes = source.map((piece, i) => {
    const group = document.createElementNS(ns, 'g')
    group.dataset.piece = String(i)
    const temperature = ((i / (source.length - 1)) * 2 - 1) * defaults.copyVariance
    const gradient = document.createElementNS(ns, 'linearGradient')
    gradient.id = `fragment-tint-${crypto.randomUUID()}`
    gradient.setAttribute('x1', i % 2 ? '100%' : '0%')
    gradient.setAttribute('x2', i % 2 ? '0%' : '100%')
    gradient.setAttribute('y2', '100%')
    for (const [offset, shift] of [
      [0, 3],
      [1, -3],
    ]) {
      const stop = document.createElementNS(ns, 'stop')
      stop.setAttribute('offset', String(offset))
      const tint = Math.max(
        -defaults.copyVariance,
        Math.min(defaults.copyVariance, temperature + shift * 0.01),
      )
      stop.style.stopColor = `light-dark(${copyInkColour(lightBase, tint, true)}, ${copyInkColour(darkBase, tint, false)})`
      gradient.appendChild(stop)
    }
    definitions.appendChild(gradient)
    group.style.fill = `url(#${gradient.id})`
    group.style.stroke = group.style.fill
    const path = document.createElementNS(ns, 'path')
    path.setAttribute('d', piece.d!)
    path.setAttribute('stroke-width', String(fragmentStroke))
    path.setAttribute('stroke-linejoin', 'round')
    path.setAttribute('stroke-linecap', 'round')
    group.appendChild(path)
    board.appendChild(group)
    return group
  })
  const artwork = stage.closest<HTMLElement>('.temple-artwork')
  if (artwork && !groundMaterial(artwork)) {
    provideGroundMaterial(artwork, { pieces: source, seed })
    mountGroundSignal(
      artwork,
      source,
      nodes.map((node) => node.querySelector('path')!),
      seed,
      signal,
    )
  }
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
