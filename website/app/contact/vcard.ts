import type { ContactDetails } from '../../../contracts/content.ts'

const escape = (value: string) =>
  value
    .replaceAll('\\', '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')

export function contactVcard(contact: ContactDetails, email: string) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escape(contact.name)}`,
    `N:;${escape(contact.name)};;;`,
    `EMAIL;TYPE=INTERNET:${escape(email)}`,
    ...(contact.website ? [`URL:${escape(contact.website)}`] : []),
    ...(contact.portrait?.vcardPhoto
      ? [`PHOTO;ENCODING=b;TYPE=JPEG:${contact.portrait.vcardPhoto}`]
      : []),
    `item1.URL:${escape(contact.signal.href)}`,
    'item1.X-ABLabel:Signal',
    `item2.URL:${escape(contact.telegram.href)}`,
    'item2.X-ABLabel:Telegram',
    'END:VCARD',
  ]
  // vCard lines fold at 75 UTF-8 octets, including the continuation space.
  return (
    lines
      .map((line) => {
        let folded = '',
          width = 0
        for (const character of line) {
          const code = character.codePointAt(0)!
          const bytes = code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4
          if (width + bytes > 75) {
            folded += '\r\n '
            width = 1
          }
          folded += character
          width += bytes
        }
        return folded
      })
      .join('\r\n') + '\r\n'
  )
}
