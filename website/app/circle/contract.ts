/** Runtime circle state is independent of published CMX content. */
export const circlePath = '/circle'
export const circleReturnPath = '/temple-of-sound#share'
export const circleTopic = 'dd5708c2-1134-4a8a-a628-0cdf89630bf0'
export const circleCapacity = 10
export interface PublicPlace {
  spot: number
  alias: string
}
export interface CircleView {
  ready: boolean
  places: PublicPlace[]
  unavailable?: number[]
  email?: string
  name?: string
  waiting?: boolean
  csrfToken?: string
  own?: PublicPlace
  processing?: boolean
  reactivation?: boolean
  selected?: number
}

/** Keep a preferred free place, otherwise offer the first available one. */
export function availableCircleSpot(
  state: Pick<CircleView, 'places' | 'unavailable' | 'own'>,
  preferred?: number,
): number | undefined {
  if (state.own) return state.own.spot
  return [preferred, ...Array.from({ length: circleCapacity }, (_, index) => index + 1)].find(
    (spot): spot is number =>
      typeof spot === 'number' &&
      Number.isInteger(spot) &&
      spot >= 1 &&
      spot <= circleCapacity &&
      !state.places.some((place) => place.spot === spot) &&
      !state.unavailable?.includes(spot),
  )
}
export interface CircleResult {
  type: 'success' | 'error'
  message: string
  state?: CircleView
  confirmationPending?: boolean
}
export const circleMessages = {
  failure: 'Something went wrong. Please try again.',
  pending: 'Awesome, please check your email to confirm your interest',
  claimed: 'welcome',
  full: 'The circle is full. You’re on the waiting list.',
  taken: 'This spot is reserved. Please choose another.',
  alias: 'Please enter a name or alias of 1–20 characters.',
  released: 'Your place has been released.',
} as const

export function validCircleAlias(alias: unknown): alias is string {
  return (
    typeof alias === 'string' &&
    alias.trim().length >= 1 &&
    alias.trim().length <= 20 &&
    !/[\u0000-\u001f\u007f]/u.test(alias)
  )
}
