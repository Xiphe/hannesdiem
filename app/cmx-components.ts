import { clientEntry } from 'remix/component'
import assets from '../.generated/assets.json' with { type: 'json' }
import { Counter as CounterComponent } from './counter.tsx'

export const Counter = clientEntry(`${assets.counter}#Counter`, CounterComponent)
