import { Frame, css, on, ref, type Handle } from 'remix/component'
import { Bars3Icon } from './heroicons.tsx'

const menuStyle = css({ position:'fixed', top:'1rem', right:'1rem', zIndex:40, padding:'.25rem', borderRadius:'.375rem', color:'color-mix(in oklab,var(--theme-fg) 80%,transparent)', background:'color-mix(in oklab,var(--theme-bg) 80%,transparent)', backdropFilter:'blur(4px)', '&:hover':{ color:'var(--theme-fg)' } })
const dialogStyle = css({ position:'fixed', inset:0, width:'100vw', maxWidth:'none', height:'100dvh', maxHeight:'none', margin:0, padding:0, background:'transparent', color:'var(--theme-fg)', border:0, overflowY:'auto', '&:not([open])':{display:'none'}, '&::backdrop':{ background:'color-mix(in oklab,var(--theme-bg) 30%,transparent)', backdropFilter:'blur(4px)' } })
export function Chrome(handle: Handle<{path:string}>) {
  let dialog: HTMLDialogElement | undefined
  let welcome = false
  handle.queueTask(() => {
    const url = new URL(location.href)
    if (url.searchParams.has('login_success')) {
      welcome = true
      url.searchParams.delete('login_success')
      history.replaceState(history.state, '', url)
      void handle.update()
      const timeout = setTimeout(() => { welcome = false; void handle.update() }, 5000)
      handle.signal.addEventListener('abort', () => clearTimeout(timeout), { once:true })
    }
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
    {welcome && <div role="status" mix={css({position:'fixed',bottom:'1rem',left:'1rem',right:'1rem',zIndex:150,borderRadius:'.5rem',padding:'1rem',color:'#14532d',background:'#dcfce7',boxShadow:'0 4px 12px rgb(0 0 0 / .15)','@media (width >= 40rem)':{top:'1rem',bottom:'auto',left:'50%',right:'auto',translate:'-50% 0',maxWidth:'26rem',width:'calc(100% - 2rem)'}})}>Welcome! You are now logged in.</div>}
    <a href="/nav" aria-label="Open menu" data-rmx-target="overlay" data-rmx-src={`/nav?from=${encodeURIComponent(handle.props.path)}`} mix={menuStyle}>
      <Bars3Icon width={24} height={24}/>
    </a>
    <dialog aria-label="Page dialog" mix={[dialogStyle, ref(node => { dialog = node }), on('cancel', event => { event.preventDefault(); close() }), on('click', event => {
      const target = event.target as Element
      if (!target.closest('[data-overlay-panel]') || target.closest('[data-close-overlay]')) { event.preventDefault(); close() }
    })]}>
      <Frame name="overlay" src="/_overlay" />
    </dialog>
  </>
}
