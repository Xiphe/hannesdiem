import { on, type Handle } from 'remix/component'
import { LoadingSpinner } from '../temple/piece-tooltip/panel.tsx'

/** Native checkbox semantics with one stable row for both states and saving. */
export function NotificationSwitch(
  handle: Handle<{
    checked: boolean
    disabled: boolean
    pending: boolean
  }>,
) {
  return () => (
    <>
      <label class="temple-notification-control">
        <input
          type="checkbox"
          name="intent"
          value="subscribe"
          role="switch"
          class="temple-notification-input"
          checked={handle.props.checked}
          aria-checked={handle.props.checked}
          disabled={handle.props.disabled && !handle.props.pending}
          aria-disabled={handle.props.disabled}
          mix={on('change', (event) => {
            const input = event.currentTarget
            if (handle.props.disabled) {
              input.checked = handle.props.checked
              return
            }
            input.form?.requestSubmit()
          })}
        />
        <span
          class="temple-notification-track"
          aria-hidden="true"
        />
        <span class="temple-notification-state">
          {handle.props.checked
            ? 'You will receive notifications via email'
            : 'You will not receive notifications'}
        </span>
        <span
          class="temple-notification-saving"
          aria-hidden="true"
        >
          {handle.props.pending && LoadingSpinner()}
        </span>
      </label>
      <input
        type="hidden"
        name="intent"
        value="unsubscribe"
      />
      <noscript>
        <button type="submit">Receive notifications via mail</button>
      </noscript>
    </>
  )
}
