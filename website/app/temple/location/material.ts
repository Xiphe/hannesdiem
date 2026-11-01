import { generateFragments } from '../fragment-button/fragment-generator.ts'

const pieces = generateFragments('temple-facts-ground', 8)
export const textPiece = pieces[2]
// Artist's reference: a low fragment with an inward upper curve. Rounded into
// the actual contour, shared by the sea and geographic clip; no border stroke.
export const mapPiece = {
  ...pieces[5],
  d: 'M-10.35 .94L9.35 -.94Q10 -1 10.16 -1.63L11.84 -8.37Q12 -9 11.37 -9.14L3.63 -10.86Q3 -11 2.9 -10.3Q1.56 -2.45 -9.29 -6.71Q-10 -7 -10.08 -6.36L-10.92 .36Q-11 1 -10.35 .94Z',
}
