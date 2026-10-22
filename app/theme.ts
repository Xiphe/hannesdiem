import type { PaletteColor } from '../contracts/content.ts'

export type { PaletteColor } from '../contracts/content.ts'

export type ThemeVariables = {
  bg: string
  bgVia: string
  bgTo: string
  fg: string
  contrast: string
  accent: string
  primary: string
}
export type Theme = { light: ThemeVariables; dark: ThemeVariables }

export const defaultTheme: Theme = {
  dark: {
    bg: '#020024',
    bgVia: '#022456',
    bgTo: '#093871',
    fg: '#fff8fb',
    contrast: '#000000',
    accent: '#022456',
    primary: '#ae1ee4',
  },
  light: {
    bg: '#fff8fb',
    bgVia: '#ffb8e4',
    bgTo: '#ffe5f2',
    fg: '#020024',
    contrast: '#ffffff',
    accent: '#add4ed',
    primary: '#fd5ee0',
  },
}
export const beachTheme: Theme = {
  dark: {
    bg: '#161717',
    bgVia: '#232b39',
    bgTo: '#2f5a57',
    fg: '#f9fafb',
    contrast: '#161717',
    accent: '#2e3e48',
    primary: '#a36302',
  },
  light: {
    bg: '#fbf2eb',
    bgVia: '#eabe9a',
    bgTo: '#bdc8d8',
    fg: '#0c0a09',
    contrast: '#fbf2eb',
    accent: '#c2c9d0',
    primary: '#4097dd',
  },
}

function toHex(hsl?: number[], min?: [number, number, number], max?: [number, number, number]) {
  let input =
    hsl ??
    (min && max
      ? min.map((n, i) => n + (max[i]! - n) / 2)
      : min
        ? [1, 1, 1]
        : max
          ? [0, 0, 0]
          : [0.5, 0.5, 0.5])
  const [h, s, l] = input.map((n, i) =>
    Math.max(0, Math.min(1, Math.max(min?.[i] ?? 0, Math.min(max?.[i] ?? 1, n)))),
  ) as [number, number, number]
  const hue = h * 360,
    c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((hue / 60) % 2) - 1)),
    m = l - c / 2
  const rgb =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x]
  return (
    '#' +
    rgb
      .map((n) =>
        Math.round((n + m) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}

/** The legacy palette-to-theme mapping, retaining both light and dark colors. */
export function paletteToTheme(palette: readonly PaletteColor[]): Theme {
  const find = (name: string) => palette.find((color) => color.name === name)?.hsl
  const vibrant = find('Vibrant'),
    lightVibrant = find('LightVibrant'),
    darkVibrant = find('DarkVibrant')
  const muted = find('Muted'),
    lightMuted = find('LightMuted'),
    darkMuted = find('DarkMuted')
  return {
    dark: {
      bg: toHex(darkMuted, undefined, [1, 0.2, 0.08]),
      bgVia: toHex(darkVibrant, undefined, [1, 0.075, 0.12]),
      bgTo: toHex(muted, undefined, [1, 1, 0.25]),
      fg: toHex(lightMuted, [0, 0, 0.9], [1, 0.25, 1]),
      contrast: toHex(darkMuted, undefined, [1, 0.1, 0.05]),
      accent: toHex(darkVibrant, undefined, [1, 1, 0.2]),
      primary: toHex(vibrant, [0, 0, 0.5]),
    },
    light: {
      bg: toHex(lightMuted, [0, 0, 0.9], [1, 0.2, 1]),
      bgVia: toHex(lightVibrant, [0, 0, 0.8], [1, 0.4, 1]),
      bgTo: toHex(muted, [0, 0, 0.75]),
      fg: toHex(darkMuted, undefined, [1, 0.25, 0.1]),
      contrast: toHex(lightMuted, [0, 0, 0.95], [1, 0.1, 1]),
      accent: toHex(lightVibrant, [0, 0, 0.6]),
      primary: toHex(vibrant, undefined, [1, 1, 0.5]),
    },
  }
}

function variablesToCss(variables: ThemeVariables, prefix = '') {
  return Object.entries(variables)
    .map(
      ([key, value]) =>
        `--theme-${prefix}${key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())}:${value};`,
    )
    .join('')
}
export function themeCss(theme: Theme = defaultTheme) {
  const background = (mode: 'light' | 'dark') => {
    if (theme === defaultTheme)
      return mode === 'light'
        ? 'linear-gradient(to bottom,#fff8fb 0%,#ffe5f2 50%,#ffb8e4 75%,#8b5ff2 100%)'
        : 'linear-gradient(to bottom,#020024 0%,#022456 50%,#1e236f 90%,#3f1ace 100%)'
    if (theme === beachTheme)
      return mode === 'light'
        ? 'linear-gradient(to bottom,#fbf2eb 0%,#edd8c8 50%,#eabe9a 80%,#bdc8d8 100%)'
        : 'linear-gradient(to bottom,#161717 0%,#232b39 50%,#2f5a57 80%,#b7a850 100%)'
    return 'linear-gradient(to bottom,var(--theme-bg) 0%,var(--theme-bg-via) 75%,var(--theme-bg-to) 100%)'
  }
  return `:root{${variablesToCss(theme.light)}${variablesToCss(theme.dark, 'dark-')}--page-background:${background('light')};}@media(prefers-color-scheme:dark){:root{${variablesToCss(theme.dark)}--page-background:${background('dark')};}}`
}
