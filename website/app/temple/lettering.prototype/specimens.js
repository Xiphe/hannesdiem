// Open exploration of existing typefaces. Positive feedback is not a selection.
const catalog = await fetch('/typefaces.json').then((response) => response.json())
const round = new URL(location.href).searchParams.get('round')
const specimens =
  round === '3'
    ? ['19', '20', '21', '2', '1'].map((id) => catalog.find((specimen) => specimen.id === id))
    : round === '2'
      ? catalog.filter(
          (specimen) =>
            specimen.id === '2' || (Number(specimen.id) >= 7 && Number(specimen.id) <= 18),
        )
      : catalog
document.documentElement.dataset.round = round ?? 'all'
const fontStyles = document.createElement('style')
fontStyles.textContent = specimens
  .map(
    (specimen) =>
      `@font-face { font-family: "${specimen.family}"; src: url("/fonts/${specimen.file}.ttf"); font-weight: ${specimen.weight}; }`,
  )
  .join('\n')
document.head.append(fontStyles)
const main = document.querySelector('main')
const select = document.querySelector('#typeface')
const fill = document.querySelector('#fill')
let selected = 0
let single = false

for (const specimen of specimens) {
  const figure = document.createElement('figure')
  figure.style.setProperty('--family', `"${specimen.family}"`)
  figure.style.setProperty('--weight', specimen.weight)
  figure.style.setProperty('--tracking', `${specimen.tracking}em`)
  const label = `${specimen.id} · ${specimen.name}`
  figure.innerHTML = `<button class="stage" type="button" aria-label="View ${specimen.name}"><span class="lettering" role="img" aria-label="Temple of Sound"><span>TEMPLE</span><span>OF</span><span>SOUND</span></span></button><figcaption>${label}</figcaption>`
  figure.querySelector('button').addEventListener('click', () => activate(specimen.id))
  main.append(figure)
  select.add(new Option(label, specimen.id))
}

// Normalize visible cap height, then fit the widest word. Never squash a font.
function fit() {
  const context = document.createElement('canvas').getContext('2d')
  for (const [index, figure] of [...main.children].entries()) {
    if (figure.getBoundingClientRect().width === 0) continue
    const stage = figure.querySelector('.stage')
    const style = getComputedStyle(stage)
    const availableWidth =
      stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    const availableHeight =
      stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    const specimen = specimens[index]
    context.font = `${specimen.weight} 100px "${specimen.family}"`
    const widths = ['TEMPLE', 'OF', 'SOUND'].map(
      (word) => context.measureText(word).width + (word.length - 1) * specimen.tracking * 100,
    )
    const capHeight = context.measureText('H').actualBoundingBoxAscent
    const compositionWidth = widths[0] + widths[2] - widths[1]
    const targetCapHeight = Math.min(availableHeight / 4.1, availableWidth / 7.5)
    const size = Math.min(
      (targetCapHeight / capHeight) * 100,
      (availableWidth / compositionWidth) * 98,
      availableHeight / 3.12,
    )
    figure.style.setProperty('--size', `${size}px`)
    const words = figure.querySelectorAll('.lettering > span')
    for (const [wordIndex, word] of [...words].entries()) {
      word.style.width = `${(widths[wordIndex] * size) / 100}px`
      word.style.left = wordIndex === 0 ? '0' : `${((widths[0] - widths[1]) * size) / 100}px`
    }
  }
}

function activate(id, updateUrl = true) {
  single = specimens.some((specimen) => specimen.id === id)
  if (single) selected = specimens.findIndex((specimen) => specimen.id === id)
  document.documentElement.dataset.view = single ? 'single' : 'all'
  for (const [index, figure] of [...main.children].entries()) {
    figure.toggleAttribute('data-active', index === selected)
  }
  select.value = specimens[selected].id
  if (updateUrl) {
    const url = new URL(location.href)
    if (single) url.searchParams.set('variant', specimens[selected].id)
    else url.searchParams.delete('variant')
    history.replaceState(null, '', url)
  }
  fit()
}

document.querySelector('#overview').addEventListener('click', () => activate(null))
document
  .querySelector('#previous')
  .addEventListener('click', () =>
    activate(specimens[(selected + specimens.length - 1) % specimens.length].id),
  )
document
  .querySelector('#next')
  .addEventListener('click', () => activate(specimens[(selected + 1) % specimens.length].id))
select.addEventListener('change', () => activate(select.value))
fill.addEventListener('click', () => {
  const solid = document.documentElement.dataset.fill === 'photo'
  document.documentElement.dataset.fill = solid ? 'solid' : 'photo'
  fill.setAttribute('aria-pressed', String(solid))
  fill.setAttribute('aria-label', solid ? 'Show photographic lettering' : 'Show solid lettering')
})
document.addEventListener('keydown', (event) => {
  if (event.target.closest('input, select, textarea, [contenteditable]')) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    activate(
      specimens[
        (selected + (event.key === 'ArrowRight' ? 1 : specimens.length - 1)) % specimens.length
      ].id,
    )
  } else if (event.key === 'Escape') activate(null)
})
window.addEventListener('resize', fit)
window.addEventListener('popstate', () =>
  activate(new URL(location.href).searchParams.get('variant'), false),
)
await Promise.all(
  specimens.map((specimen) => document.fonts.load(`${specimen.weight} 100px "${specimen.family}"`)),
)
document
  .querySelector('#overview')
  .setAttribute('aria-label', `Show all ${specimens.length} specimens`)
document.querySelector('#overview').title = `Show all ${specimens.length} (Escape)`
document.documentElement.dataset.fill = 'solid'
fill.setAttribute('aria-pressed', 'true')
fill.setAttribute('aria-label', 'Show photographic lettering')
activate(new URL(location.href).searchParams.get('variant'), false)
