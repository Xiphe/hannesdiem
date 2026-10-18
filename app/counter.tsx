import { on, type Handle } from 'remix/component'
import type { CounterProps } from '@hannesdiem/content-components'

export function Counter(handle: Handle<CounterProps>) {
  let count = handle.props.initialCount ?? 0
  return () => (
    <button type="button" mix={on('click', () => {
      count++
      void handle.update()
    })}>
      Count: {count}
    </button>
  )
}
