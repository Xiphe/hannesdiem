// THROWAWAY: share the current fitted material between fact studies.
export function mountReadingMaterial(section, sourceMaterial, contour) {
  // Keep Visit's colours, but give this reading surface a broader, softer
  // fragment contour. Round the geometry itself, not just the outline stroke.
  const copyTile = section.querySelector('.watch-copy-tile')
  const material = sourceMaterial.cloneNode(true)
  material.classList.add('watch-material')
  material.setAttribute('preserveAspectRatio', 'none')
  material.setAttribute('viewBox', '-100 -100 1250 1300')
  material
    .querySelector('path')
    .setAttribute(
      'd',
      contour ??
        'M135 70C80 44 38 64 36 124C18 370 40 626 18 858Q12 925 80 935C350 958 580 972 854 986Q922 994 930 926C950 686 966 418 984 166Q991 95 920 108C648 162 400 164 135 70Z',
    )
  const gradient = material.querySelector('linearGradient')
  const oldId = gradient.id
  gradient.id = `${section.id}-text-material`
  material.innerHTML = material.innerHTML.replaceAll(`url(#${oldId})`, `url(#${gradient.id})`)
  const materialBoundary = document.createElement('div')
  materialBoundary.className = 'watch-material-boundary'
  materialBoundary.setAttribute('aria-hidden', 'true')
  materialBoundary.append(material)
  section.prepend(materialBoundary)
  // Find the largest clear rectangle in the actual concave silhouette once.
  // Map that interior onto the padded text, so every line has ground behind it.
  const view = material.viewBox.baseVal
  const group = material.querySelector('g')
  const shape = new Path2D()
  shape.addPath(
    new Path2D(material.querySelector('path').getAttribute('d')),
    DOMMatrix.fromMatrix(group.transform.baseVal.consolidate().matrix),
  )
  const probe = document.createElement('canvas').getContext('2d')
  const cells = 64
  const cellWidth = view.width / cells
  const cellHeight = view.height / cells
  const heights = Array(cells).fill(0)
  let clear = { x: 0, y: 0, width: 0, height: 0 }
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const inside = [
        [x, y],
        [x + 1, y],
        [x, y + 1],
        [x + 1, y + 1],
      ].every(([cx, cy]) =>
        probe.isPointInPath(shape, view.x + cx * cellWidth, view.y + cy * cellHeight),
      )
      heights[x] = inside ? heights[x] + 1 : 0
      let height = heights[x]
      for (let left = x; left >= 0 && height; left--) {
        height = Math.min(height, heights[left])
        const width = x - left + 1
        if (width * height > clear.width * clear.height) {
          clear = { x: left, y: y + 1 - height, width, height }
        }
      }
    }
  }
  const photograph = section.querySelector('.watch-daylight')
  const layout = () => {
    const photoRight =
      photograph.getBoundingClientRect().right - section.getBoundingClientRect().left
    const reach = innerWidth > 760 ? Math.max(0, copyTile.offsetLeft - photoRight + 24) : 0
    const scaleX = (copyTile.offsetWidth + reach) / (clear.width * cellWidth)
    const scaleY = copyTile.offsetHeight / (clear.height * cellHeight)
    // Let the contour use Watch's own preceding gap instead of slicing it at
    // the section edge. The clip still ends before the neighbouring verse.
    const headroom = parseFloat(getComputedStyle(section).marginTop)
    materialBoundary.style.top = `${-headroom}px`
    material.style.width = `${view.width * scaleX}px`
    material.style.height = `${view.height * scaleY}px`
    material.style.left = `${copyTile.offsetLeft - reach - clear.x * cellWidth * scaleX}px`
    material.style.top = `${copyTile.offsetTop + headroom - clear.y * cellHeight * scaleY}px`
  }
  const observer = new ResizeObserver(layout)
  observer.observe(copyTile)
  observer.observe(photograph)
  layout()
}
