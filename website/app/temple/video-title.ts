type StreamPlayer = {
  addEventListener(event: string, listener: () => void): void
  removeEventListener(event: string, listener: () => void): void
  destroy?(): void
}
type StreamFactory = (iframe: HTMLIFrameElement) => StreamPlayer
type StreamWindow = Window & { Stream?: StreamFactory }

let sdk: Promise<StreamFactory | undefined> | undefined

function loadPlayerAPI() {
  const factory = (window as StreamWindow).Stream
  if (factory) return Promise.resolve(factory)
  return (sdk ??= new Promise<StreamFactory | undefined>((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js'
    script.async = true
    script.onload = () => resolve((window as StreamWindow).Stream)
    script.onerror = () => {
      script.remove()
      sdk = undefined
      resolve(undefined)
    }
    document.head.appendChild(script)
  }))
}

/** The iframe keeps playback controls; only its title screen is enhanced. */
export function mountRecordingTitles(host: HTMLElement, signal: AbortSignal) {
  const frames = host.querySelectorAll<HTMLIFrameElement>('.temple-video-player iframe')
  if (signal.aborted || !frames.length) return
  void loadPlayerAPI().then((Stream) => {
    if (signal.aborted || !Stream) return
    for (const iframe of frames) {
      const container = iframe.closest<HTMLElement>('.temple-video-player')!
      const player = Stream(iframe)
      const hide = () => {
        container.dataset.playing = ''
      }
      const show = () => {
        delete container.dataset.playing
      }
      const listeners = { play: hide, playing: hide, pause: show, ended: show, error: show }
      for (const [event, listener] of Object.entries(listeners))
        player.addEventListener(event, listener)
      signal.addEventListener(
        'abort',
        () => {
          for (const [event, listener] of Object.entries(listeners))
            player.removeEventListener(event, listener)
          player.destroy?.()
          show()
        },
        { once: true },
      )
    }
  })
}
