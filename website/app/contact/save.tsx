import { on, type Handle } from 'remix/component'
import { UserIcon } from '../heroicons.tsx'

export function SaveContact(handle: Handle<{ href: string; vcard: string }>) {
  let sharing = false
  return () => (
    <a
      class="contact-save"
      href={handle.props.href}
      data-rmx-document
      mix={on('click', async (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return
        if (sharing) {
          event.preventDefault()
          return
        }
        if (!navigator.share || !navigator.canShare) return
        const { href, vcard } = handle.props
        const file = new File([vcard], 'contact.vcf', { type: 'text/vcard' })
        try {
          if (!navigator.canShare({ files: [file] })) return
        } catch {
          return
        }
        event.preventDefault()
        sharing = true
        try {
          // Keep this in the click's user activation: no network await before sharing.
          await navigator.share({ files: [file] })
        } catch (error) {
          if (
            !handle.signal.aborted &&
            !(error instanceof DOMException && error.name === 'AbortError')
          )
            location.assign(href)
        } finally {
          sharing = false
        }
      })}
    >
      <UserIcon
        width={22}
        height={22}
      />
      Add contact card
    </a>
  )
}
