const params = new URLSearchParams(location.search)
if (params.has('embedded')) {
  const report = () =>
    parent.postMessage(
      {
        kind: 'text-study-height',
        key: params.get('variant'),
        height: document.querySelector('article').scrollHeight,
      },
      location.origin,
    )
  document.fonts.ready.then(report)
  new ResizeObserver(report).observe(document.querySelector('article'))
} else {
  const frames = [...document.querySelectorAll('.preview iframe')]
  const heights = new Map()
  function size(frame) {
    const width = frame.parentElement.clientWidth
    const height = heights.get(frame) ?? 1000
    frame.style.height = height + 'px'
    frame.style.transform = `scale(${width / 1280})`
    frame.parentElement.style.height = (height * width) / 1280 + 'px'
  }
  const observer = new ResizeObserver(() => frames.forEach(size))
  frames.forEach((frame) => {
    observer.observe(frame.parentElement)
    size(frame)
  })
  addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.data?.kind !== 'text-study-height') return
    const frame = frames.find((frame) => frame.contentWindow === event.source)
    if (!frame) return
    heights.set(frame, event.data.height)
    size(frame)
  })
  const toggleUI = () => {
    document.body.dataset.ui = document.body.dataset.ui === 'hidden' ? 'visible' : 'hidden'
  }
  document.querySelector('[data-hide-ui]').addEventListener('click', toggleUI)
  document.querySelector('[data-restore-ui]').addEventListener('click', toggleUI)
  addEventListener('keydown', (event) => {
    if (event.target.closest('input, textarea, [contenteditable]')) return
    if (event.key.toLowerCase() === 'h') {
      toggleUI()
      return
    }
    const direction =
      event.key === 'ArrowLeft' ? 'previous' : event.key === 'ArrowRight' ? 'next' : null
    if (direction) {
      event.preventDefault()
      location.href = document.querySelector(`[data-step="${direction}"]`).href
    }
  })
}
