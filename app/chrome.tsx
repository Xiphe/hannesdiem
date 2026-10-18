import { Frame, css, on, ref, type Handle } from 'remix/component'

const menuStyle = css({ position:'fixed', top:'1rem', right:'1rem', zIndex:40, padding:'.25rem', borderRadius:'.375rem', color:'color-mix(in oklab,var(--theme-fg) 80%,transparent)', background:'color-mix(in oklab,var(--theme-bg) 80%,transparent)', backdropFilter:'blur(4px)', '&:hover':{ color:'var(--theme-fg)' } })
const dialogStyle = css({ position:'fixed', inset:0, width:'100vw', maxWidth:'none', height:'100dvh', maxHeight:'none', margin:0, padding:0, background:'transparent', color:'var(--theme-fg)', border:0, overflowY:'auto', '&:not([open])':{display:'none'}, '&::backdrop':{ background:'color-mix(in oklab,var(--theme-bg) 30%,transparent)', backdropFilter:'blur(4px)' } })
export function Chrome(handle: Handle<{path:string}>) {
  let dialog: HTMLDialogElement | undefined
  handle.queueTask(() => {
    handle.frames.top.addEventListener('reloadComplete', () => dialog?.close(), { signal: handle.signal })
    const frame = handle.frames.get('overlay')
    if (!frame) return
    frame.addEventListener('reloadStart', () => { if (!dialog?.open) dialog?.showModal() }, { signal: handle.signal })
    frame.addEventListener('reloadComplete', () => {
      if (new URL(frame.src, location.href).pathname === '/_overlay') dialog?.close()
    }, { signal: handle.signal })
    window.addEventListener('popstate', () => {
      if (!location.pathname.startsWith('/m/') && location.pathname !== '/nav') dialog?.close()
    }, { signal: handle.signal })
  })
  function close() { dialog?.close(); history.back() }
  return () => <>
    <a href="/nav" aria-label="Open menu" data-rmx-target="overlay" data-rmx-src={`/nav?from=${encodeURIComponent(handle.props.path)}`} mix={menuStyle}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.25Zm0 6.75a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 6.75a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 18.75Z"/></svg>
    </a>
    <dialog aria-label="Page dialog" mix={[dialogStyle, ref(node => { dialog = node }), on('cancel', event => { event.preventDefault(); close() }), on('click', event => {
      const target = event.target as Element
      if (!target.closest('[data-overlay-panel]') || target.closest('[data-close-overlay]')) { event.preventDefault(); close() }
    })]}>
      <Frame name="overlay" src="/_overlay" />
    </dialog>
  </>
}
