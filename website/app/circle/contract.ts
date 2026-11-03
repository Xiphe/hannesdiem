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
  pending: 'Check your email to confirm your subscription.',
  claimed: 'welcome',
  full: 'The circle is full.',
  taken: 'This spot is reserved. Please choose another.',
  alias: 'Please enter your public name or alias.',
  released: 'Your place has been released.',
} as const
