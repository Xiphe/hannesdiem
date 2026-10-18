import type { Handle } from 'remix/component'

export interface DateProps {
  value: string
  hideDay?: boolean
}

export function LocalDate(handle: Handle<DateProps>) {
  return () => {
    const { value, hideDay } = handle.props
    const server = typeof document === 'undefined'
    const label = new Intl.DateTimeFormat(server ? 'en' : undefined, {
      year: 'numeric',
      month: 'long',
      ...(hideDay ? {} : { day: 'numeric' }),
      ...(server ? { timeZone: 'Europe/Berlin' } : {}),
    }).format(new Date(value))
    return <time dateTime={value}>{label}</time>
  }
}
