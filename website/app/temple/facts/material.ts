export const readingContours = {
  watch:
    'M135 70C80 44 38 64 36 124C18 370 40 626 18 858Q12 925 80 935C350 958 580 972 854 986Q922 994 930 926C950 686 966 418 984 166Q991 95 920 108C648 162 400 164 135 70Z',
  share:
    'M135 70C80 44 38 64 36 124C18 370 40 626 18 858Q12 925 80 935C350 958 580 972 854 986Q922 994 930 926C950 686 966 418 984 166Q991 95 920 108C648 162 400 164 135 70Z',
  create:
    'M110 90C54 82 28 110 40 166L164 906Q176 966 238 950L920 790Q978 776 956 716C882 496 950 306 970 166Q980 98 912 114C620 180 402 58 110 90Z',
}

// Clear interior of Watch's contour at its existing 8-degree rotation, found
// using enhance.ts's 64-cell fit. Mapping this rectangle to a text box lets
// SVG fit the same ground around rich text without another browser task.
export const watchReadingViewBox = '-2.34375 245.3125 800.78125 690.625'
