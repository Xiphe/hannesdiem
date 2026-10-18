import { Frame, css, on, ref, type Handle } from 'remix/component'
import { Bars3Icon } from './heroicons.tsx'

const menuStyle = css({ position:'fixed', top:'1rem', right:'1rem', zIndex:40, padding:'.25rem', borderRadius:'.375rem', color:'color-mix(in oklab,var(--theme-fg) 80%,transparent)', background:'color-mix(in oklab,var(--theme-bg) 80%,transparent)', backdropFilter:'blur(4px)', '&:hover':{ color:'var(--theme-fg)' } })
const dialogStyle = css({ position:'fixed', inset:0, width:'100vw', maxWidth:'none', height:'100dvh', maxHeight:'none', margin:0, padding:0, background:'transparent', color:'var(--theme-fg)', border:0, overflowY:'auto', '&:not([open])':{display:'none'}, '&::backdrop':{ background:'color-mix(in oklab,var(--theme-bg) 30%,transparent)', backdropFilter:'blur(4px)' } })
export function Chrome(handle: Handle<{path:string}>) {
  let dialog: HTMLDialogElement | undefined
  let welcome = false
  let navigationOpen = false
  let closingNavigation: Promise<void> | undefined
  function navigationDialog() { return document.querySelector<HTMLDialogElement>('[data-navigation-dialog]') }
  function closeNavigation() {
    if (closingNavigation) return closingNavigation
    const navigation = navigationDialog()
    if (!navigation?.open) return Promise.resolve()
    navigation.dataset.closing = 'true'
    closingNavigation = new Promise<void>(resolve => {
      setTimeout(() => {
        navigation.close()
        navigationOpen = false
        closingNavigation = undefined
        if (!handle.signal.aborted) void handle.update()
        resolve()
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300)
    })
    return closingNavigation
  }
  function openNavigation(event: Event) {
    event.preventDefault()
    const navigation = navigationDialog()
    if (!navigation || closingNavigation) return
    delete navigation.dataset.closing
    if (!navigation.open) navigation.showModal()
    navigationOpen = true
    navigation.dispatchEvent(new Event('navigation-open'))
    void handle.update()
  }
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
    navigationOpen = navigationDialog()?.open ?? false
    document.addEventListener('click', event => {
      const target = event.target as Element
      const navigation = target.closest('[data-navigation-dialog]')
      if (navigation && (!target.closest('[data-overlay-panel]') || target.closest('[data-close-overlay]'))) {
        event.preventDefault()
        void closeNavigation()
      }
    }, { signal:handle.signal })
    document.addEventListener('cancel', event => {
      if ((event.target as Element).matches('[data-navigation-dialog]')) {
        event.preventDefault()
        void closeNavigation()
      }
    }, { capture:true, signal:handle.signal })
    document.addEventListener('toggle', event => {
      if ((event.target as Element).matches('[data-navigation-dialog]')) {
        navigationOpen = (event.target as HTMLDialogElement).open
        void handle.update()
      }
    }, { capture:true, signal:handle.signal })
    handle.frames.top.addEventListener('reloadStart', () => { void closeNavigation() }, { signal:handle.signal })
    handle.frames.top.addEventListener('reloadComplete', () => { dialog?.close(); navigationOpen = false; void handle.update() }, { signal: handle.signal })
    const frame = handle.frames.get('overlay')
    if (!frame) return
    frame.addEventListener('reloadStart', () => {
      if (dialog && !dialog.open) { delete dialog.dataset.closing; dialog.showModal() }
    }, { signal: handle.signal })
    frame.addEventListener('reloadComplete', () => {
      if (new URL(frame.src, location.href).pathname === '/_overlay') dialog?.close()
    }, { signal: handle.signal })
    window.addEventListener('popstate', () => {
      if (!location.pathname.startsWith('/m/')) dialog?.close()
    }, { signal: handle.signal })
  })
  function close() { dialog?.close(); history.back() }
  return () => <>
    {welcome && <div role="status" mix={css({position:'fixed',bottom:'1rem',left:'1rem',right:'1rem',zIndex:150,borderRadius:'.5rem',padding:'1rem',color:'#14532d',background:'#dcfce7',boxShadow:'0 4px 12px rgb(0 0 0 / .15)','@media (width >= 40rem)':{top:'1rem',bottom:'auto',left:'50%',right:'auto',translate:'-50% 0',maxWidth:'26rem',width:'calc(100% - 2rem)'}})}>Welcome! You are now logged in.</div>}
    <button type="button" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={navigationOpen} aria-controls="site-navigation" command="show-modal" commandFor="site-navigation" mix={[menuStyle, on<HTMLButtonElement, 'click'>('click', openNavigation)]}>
      <Bars3Icon width={24} height={24}/>
    </button>
    <dialog class="page-dialog" aria-label="Page dialog" mix={[dialogStyle, ref(node => { dialog = node }), on('cancel', event => { event.preventDefault(); close() }), on('click', event => {
      const target = event.target as Element
      if (!target.closest('[data-overlay-panel]') || target.closest('[data-close-overlay]')) { event.preventDefault(); close() }
    })]}>
      <Frame name="overlay" src="/_overlay" />
    </dialog>
  </>
}
