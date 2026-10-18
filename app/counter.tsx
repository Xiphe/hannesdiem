import { on, type Handle } from 'remix/component'

export function Counter(handle: Handle) {
  let count = 0
  return () => (
    <button type="button" mix={on('click', () => {
      count++
      void handle.update()
    })}>
      Count: {count}
    </button>
  )
}
