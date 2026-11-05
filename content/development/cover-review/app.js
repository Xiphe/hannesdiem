import { stepFrame } from '/transport.js'

const $ = (id) => document.getElementById(id)
const player = $('video')
const select = $('recording')
const state = new Map()
let videos = []
let current
let timer
let requestId = 0
let displayed
let saving = false
document.querySelectorAll('button, input').forEach((element) => (element.disabled = true))
const timeLabel = (seconds) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(3).padStart(6, '0')}`
const signature = (choice) =>
  JSON.stringify({
    id: current.id,
    time: choice.time,
    focalX: choice.focalX,
    focalY: choice.focalY,
  })
const choice = () => state.get(current.id)
function error(message) {
  $('error').textContent = message
  $('error').hidden = false
  $('retry').hidden = false
}
async function api(path, body) {
  const response = await fetch(
    path,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : undefined,
  )
  const result = await response.json()
  if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status})`)
  return result
}
function progress() {
  const count = videos.filter((video) => state.get(video.id).saved).length
  $('progress').textContent =
    `${count} of ${videos.length} saved${count === videos.length ? ' — all covers ready for review' : ''}`
  for (const option of select.options)
    option.textContent = `${state.get(option.value).saved ? '✓ ' : ''}${videos.find((video) => video.id === option.value).title}`
}
function marker() {
  $('focus-marker').style.left = `${choice().focalX}%`
  $('focus-marker').style.top = `${choice().focalY}%`
  $('focal-x').value = choice().focalX
  $('focal-y').value = choice().focalY
}
function buttons() {
  $('save').disabled = saving || choice().saved || displayed !== signature(choice())
  $('save').textContent = choice().saved ? 'Cover choice saved' : 'Save cover choice'
  $('next').disabled =
    saving || videos.findIndex((video) => video.id === current.id) === videos.length - 1
  select.disabled = saving
}
function dirty() {
  choice().saved = false
  displayed = undefined
  marker()
  progress()
  buttons()
  clearTimeout(timer)
  timer = setTimeout(preview, 400)
}
async function preview() {
  const id = ++requestId
  const values = {
    id: current.id,
    time: choice().time,
    focalX: choice().focalX,
    focalY: choice().focalY,
  }
  const key = signature(values)
  $('error').hidden = true
  $('retry').hidden = true
  $('status').textContent = `Preparing frame at ${timeLabel(values.time)}…`
  document.querySelector('.results').setAttribute('aria-busy', 'true')
  try {
    const result = await api('/api/preview', values)
    if (id !== requestId || key !== signature(choice())) return
    $('frame').src = `/api/frame?id=${encodeURIComponent(values.id)}&time=${values.time}`
    $('share').src = $('small').src = result.share
    $('watch').src = result.watch
    await Promise.all(['frame', 'share', 'small', 'watch'].map((id) => $(id).decode()))
    if (id !== requestId || key !== signature(choice())) return
    displayed = key
    $('status').textContent = choice().saved
      ? 'Saved locally. You can still adjust this cover.'
      : `Frame ${timeLabel(values.time)}. Mark the actual subject, check the crop, then save your choice.`
    document.querySelector('.results').setAttribute('aria-busy', 'false')
    buttons()
  } catch (cause) {
    if (id === requestId) {
      error(cause.message)
      $('status').textContent = 'Preview unavailable. Retry or choose another frame.'
    }
  }
}
function seek(time) {
  const value = Math.max(0, Math.min(current.duration - 0.001, time))
  player.pause()
  choice().time = Math.round(value * 1000000) / 1000000
  $('time').value = choice().time
  try {
    player.currentTime = value
  } catch {
    /* The time remains usable before video metadata loads. */
  }
  dirty()
}
function open(id) {
  clearTimeout(timer)
  requestId++
  current = videos.find((video) => video.id === id)
  select.value = id
  $('title').textContent = current.title
  displayed = undefined
  $('time').value = choice().time
  $('time').max = current.duration - 0.001
  $('playhead').textContent = ''
  player.pause()
  player.removeAttribute('src')
  player.load()
  player.poster = `/api/frame?id=${encodeURIComponent(id)}&time=${choice().time}`
  player.onloadedmetadata = () => {
    if (choice().time) player.currentTime = choice().time
  }
  player.src = `/api/search-video?id=${encodeURIComponent(id)}&video=${current.videoId}`
  marker()
  buttons()
  preview()
}
select.addEventListener('change', () => open(select.value))
player.addEventListener(
  'timeupdate',
  () =>
    ($('playhead').textContent =
      `${timeLabel(player.currentTime)} / ${timeLabel(current.duration)}`),
)
$('use-frame').addEventListener('click', () => {
  player.pause()
  seek(player.currentTime)
})
$('time').addEventListener('change', () => {
  if ($('time').value !== '' && Number.isFinite($('time').valueAsNumber))
    seek($('time').valueAsNumber)
})
const position = () => (player.readyState >= 1 ? player.currentTime : choice().time)
$('back-frame').addEventListener('click', () =>
  seek(stepFrame(position(), -1, current.frameRate, current.duration)),
)
$('forward-frame').addEventListener('click', () =>
  seek(stepFrame(position(), 1, current.frameRate, current.duration)),
)
$('back').addEventListener('click', () => seek(position() - 1))
$('forward').addEventListener('click', () => seek(position() + 1))
for (const [id, field] of [
  ['focal-x', 'focalX'],
  ['focal-y', 'focalY'],
])
  $(id).addEventListener('change', () => {
    const value = $(id).valueAsNumber
    if (Number.isFinite(value)) {
      choice()[field] = Math.max(0, Math.min(100, value))
      dirty()
    }
  })
$('center').addEventListener('click', () => {
  choice().focalX = choice().focalY = 50
  dirty()
})
const focus = $('focus-frame')
function point(event) {
  if (displayed === undefined) return
  const bounds = focus.getBoundingClientRect()
  choice().focalX =
    Math.round(
      Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)) * 10,
    ) / 10
  choice().focalY =
    Math.round(
      Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)) * 10,
    ) / 10
  dirty()
}
focus.addEventListener('pointerdown', point)
$('retry').addEventListener('click', preview)
$('next').addEventListener('click', () =>
  open(videos[videos.findIndex((video) => video.id === current.id) + 1].id),
)
$('save').addEventListener('click', async () => {
  const values = {
    id: current.id,
    time: choice().time,
    focalX: choice().focalX,
    focalY: choice().focalY,
  }
  const key = signature(values)
  saving = true
  buttons()
  try {
    await api('/api/save', values)
    if (key === signature(choice())) choice().saved = true
    progress()
    $('status').textContent = 'Cover choice saved locally.'
  } catch (cause) {
    error(cause.message)
  } finally {
    saving = false
    buttons()
  }
})
try {
  videos = await api('/api/videos')
  for (const video of videos) {
    state.set(video.id, {
      time: video.choice?.time ?? 0,
      focalX: video.choice?.focalX ?? video.cover?.focalX ?? 50,
      focalY: video.choice?.focalY ?? video.cover?.focalY ?? 50,
      saved: video.choice?.compositionVersion === video.compositionVersion,
    })
    const option = document.createElement('option')
    option.value = video.id
    option.textContent = video.title
    select.append(option)
  }
  progress()
  $('restored').hidden = !videos.some(
    (video) => video.choice && video.choice.compositionVersion !== video.compositionVersion,
  )
  document.querySelectorAll('button, input').forEach((element) => (element.disabled = false))
  select.disabled = false
  open(videos[0].id)
} catch (cause) {
  error(cause.message)
  $('retry').hidden = true
  $('status').textContent = 'Could not load videos. Reload to retry.'
}
