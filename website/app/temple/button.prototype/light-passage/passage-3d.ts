import { fragmentStroke } from '../../../../../contracts/temple/fragments.ts'
import type { Tile } from './tiles.ts'

export type PassageSettings = {
  gap: number
  fold: number
  depth: number
  perspective: number
  inspect: boolean
}
export type Pose = {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  layer: number
}
const clamp = (n: number) => Math.max(0, Math.min(1, n))
const smooth = (n: number) => {
  n = clamp(n)
  return n * n * (3 - 2 * n)
}

// Real planar fragments in a common perspective space. The whole cut button
// face is their shared rest plane; there is no extra tunnel wall or backdrop.
export function fragmentPose(
  tile: Tile,
  index: number,
  width: number,
  height: number,
  progress: number,
  settings: PassageSettings,
): Pose {
  const cx = Math.max(2, Math.min(width - 2, tile.x))
  const cy = Math.max(2, Math.min(height - 2, tile.y))
  let nx = (cx - width / 2) / (width / 2),
    ny = (cy - height / 2) / (height / 2)
  let radius = Math.max(Math.abs(nx), Math.abs(ny))
  if (radius < 0.16) {
    const angle = index * 2.399963
    nx = Math.cos(angle) * 0.16
    ny = Math.sin(angle) * 0.16
    radius = Math.max(Math.abs(nx), Math.abs(ny))
  }
  const dx = nx / radius,
    dy = ny / radius
  const variation = (Math.sin(index * 17.173 + tile.angle * 3) + 1) / 2
  // Radial position establishes mouth -> middle -> rear, with a small seeded
  // stagger so the original straight clipped rim breaks into independent cuts.
  const layer = clamp((1 - radius) * 0.92 + variation * 0.16)
  const move = smooth(progress)
  const fold = smooth((progress - 0.06) / 0.94)
  const tilt = settings.fold * (0.7 + variation * 0.35)
  const targetX = width / 2 + dx * (width / 2 + settings.gap * (0.8 + variation * 0.4))
  const targetY = height / 2 + dy * (height / 2 + settings.gap * (0.6 + variation * 0.3))
  return {
    x: (targetX - cx) * move,
    y: (targetY - cy) * move,
    z: (12 - layer * settings.depth) * fold,
    rx: dy * tilt * fold,
    ry: -dx * tilt * fold,
    rz: ((variation - 0.5) * 40 + (index % 2 ? 1 : -1) * 8) * fold,
    layer,
  }
}

export function createPassage(tiles: Tile[], width: number, height: number) {
  const scene = document.createElement('div')
  scene.className = 'button-study-scene'
  scene.style.width = `${width}px`
  scene.style.height = `${height}px`
  const boundaryId = `button-cut-${crypto.randomUUID()}`
  const planes = tiles.map((tile) => {
    const plane = document.createElement('div')
    plane.className = 'button-study-fragment'
    const cx = Math.max(2, Math.min(width - 2, tile.x)),
      cy = Math.max(2, Math.min(height - 2, tile.y))
    plane.style.transformOrigin = `${cx}px ${cy}px`
    // Each SVG owns its cut in the rest plane. Transform its entire div in 3D:
    // clipped corners and straight boundary runs travel with that one fragment.
    plane.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true"><defs><clipPath id="${boundaryId}-${scene.childElementCount}"><rect width="${width}" height="${height}" rx="8"/></clipPath></defs><g clip-path="url(#${boundaryId}-${scene.childElementCount})"><g transform="translate(${tile.x} ${tile.y}) rotate(${(tile.angle * 180) / Math.PI}) scale(${tile.scale}) translate(${-tile.center.x} ${-tile.center.y})"><path d="${tile.d}" fill="#373532" stroke="#373532" stroke-width="${fragmentStroke}" stroke-linejoin="round" stroke-linecap="round"/></g></g></svg>`
    scene.appendChild(plane)
    return { plane, path: plane.querySelector('path')! }
  })
  return {
    element: scene,
    update(progress: number, settings: PassageSettings) {
      scene.style.perspective = `${settings.perspective}px`
      planes.forEach(({ plane, path }, index) => {
        const pose = fragmentPose(tiles[index], index, width, height, progress, settings)
        plane.style.transform = `translate3d(${pose.x}px,${pose.y}px,${pose.z}px) rotateZ(${pose.rz}deg) rotateY(${pose.ry}deg) rotateX(${pose.rx}deg)`
        plane.dataset.depth = pose.z.toFixed(2)
        const angle = ((Math.abs(pose.rx) + Math.abs(pose.ry)) * Math.PI) / 180
        const shade =
          55 + Math.round((1 - Math.abs(Math.cos(angle))) * 31 + pose.layer * progress * 12)
        const fill = settings.inspect
          ? ['#77736e', '#47443f', '#96928b', '#5c5a55', '#b0aca5', '#373532', '#85837e'][index % 7]
          : `rgb(${shade} ${shade - 2} ${shade - 5})`
        path.setAttribute('fill', fill)
        path.setAttribute('stroke', fill)
      })
    },
  }
}
