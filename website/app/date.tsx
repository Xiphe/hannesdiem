import type { Handle } from 'remix/component'

export interface DateProps {
  value: string
  hideDay?: boolean
  hideYear?: boolean
  showTime?: boolean
}

export function dateLabel(props: DateProps, localized = false) {
  const { value, hideDay, hideYear, showTime } = props
  const calendarDate = /^\d{4}-\d{2}-\d{2}$/.test(value)
  return new Intl.DateTimeFormat(localized ? undefined : 'en', {
    ...(hideYear ? {} : { year: 'numeric' }),
    month: 'long',
    ...(hideDay ? {} : { day: 'numeric' }),
    ...(showTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    ...(calendarDate ? { timeZone: 'UTC' } : localized ? {} : { timeZone: 'Europe/Berlin' }),
  }).format(new Date(value))
}

export function LocalDate(handle: Handle<DateProps>) {
  let localized = false
  // Match the server text on hydration, then replace it with the local label.
  handle.queueTask(() => {
    localized = true
    handle.update()
  })
  return () => {
    return <time dateTime={handle.props.value}>{dateLabel(handle.props, localized)}</time>
  }
}
