import { css, type Handle } from 'remix/component'
import type { IconProps } from '@hannesdiem/content-components'
// Heroicons SVG paths: https://github.com/tailwindlabs/heroicons (MIT).
const iconPaths: Record<
  string,
  { attrs: Record<string, string>; paths: Record<string, string>[] }
> = {
  'ArrowRightIcon:solid': {
    attrs: {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        fillRule: 'evenodd',
        d: 'M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z',
        clipRule: 'evenodd',
      },
    ],
  },
  'CursorArrowRaysIcon:solid': {
    attrs: {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        fillRule: 'evenodd',
        d: 'M12 1.5a.75.75 0 0 1 .75.75V4.5a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 12 1.5ZM5.636 4.136a.75.75 0 0 1 1.06 0l1.592 1.591a.75.75 0 0 1-1.061 1.06l-1.591-1.59a.75.75 0 0 1 0-1.061Zm12.728 0a.75.75 0 0 1 0 1.06l-1.591 1.592a.75.75 0 0 1-1.06-1.061l1.59-1.591a.75.75 0 0 1 1.061 0Zm-6.816 4.496a.75.75 0 0 1 .82.311l5.228 7.917a.75.75 0 0 1-.777 1.148l-2.097-.43 1.045 3.9a.75.75 0 0 1-1.45.388l-1.044-3.899-1.601 1.42a.75.75 0 0 1-1.247-.606l.569-9.47a.75.75 0 0 1 .554-.68ZM3 10.5a.75.75 0 0 1 .75-.75H6a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10.5Zm14.25 0a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H18a.75.75 0 0 1-.75-.75Zm-8.962 3.712a.75.75 0 0 1 0 1.061l-1.591 1.591a.75.75 0 1 1-1.061-1.06l1.591-1.592a.75.75 0 0 1 1.06 0Z',
        clipRule: 'evenodd',
      },
    ],
  },
  'FireIcon:solid': {
    attrs: {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        fillRule: 'evenodd',
        d: 'M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z',
        clipRule: 'evenodd',
      },
    ],
  },
  'MusicalNoteIcon:solid': {
    attrs: {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        fillRule: 'evenodd',
        d: 'M19.952 1.651a.75.75 0 0 1 .298.599V16.303a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.403-4.909l2.311-.66a1.5 1.5 0 0 0 1.088-1.442V6.994l-9 2.572v9.737a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.402-4.909l2.31-.66a1.5 1.5 0 0 0 1.088-1.442V5.25a.75.75 0 0 1 .544-.721l10.5-3a.75.75 0 0 1 .658.122Z',
        clipRule: 'evenodd',
      },
    ],
  },
  'SparklesIcon:solid': {
    attrs: {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        fillRule: 'evenodd',
        d: 'M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z',
        clipRule: 'evenodd',
      },
    ],
  },
  'UserGroupIcon:solid': {
    attrs: {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        fillRule: 'evenodd',
        d: 'M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z',
        clipRule: 'evenodd',
      },
      {
        d: 'M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z',
      },
    ],
  },
  'SunIcon:solid': {
    attrs: {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        d: 'M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z',
      },
    ],
  },
  'MoonIcon:solid': {
    attrs: {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        fillRule: 'evenodd',
        d: 'M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z',
        clipRule: 'evenodd',
      },
    ],
  },
  'DocumentTextIcon:solid': {
    attrs: {
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        fillRule: 'evenodd',
        d: 'M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z',
        clipRule: 'evenodd',
      },
      {
        d: 'M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z',
      },
    ],
  },
  'ArrowRightIcon:outline': {
    attrs: {
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: '1.5',
      stroke: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        d: 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3',
      },
    ],
  },
  'CursorArrowRaysIcon:outline': {
    attrs: {
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: '1.5',
      stroke: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        d: 'M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59',
      },
    ],
  },
  'FireIcon:outline': {
    attrs: {
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: '1.5',
      stroke: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        d: 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z',
      },
      {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        d: 'M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z',
      },
    ],
  },
  'MusicalNoteIcon:outline': {
    attrs: {
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: '1.5',
      stroke: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        d: 'm9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z',
      },
    ],
  },
  'SparklesIcon:outline': {
    attrs: {
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: '1.5',
      stroke: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        d: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z',
      },
    ],
  },
  'UserGroupIcon:outline': {
    attrs: {
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: '1.5',
      stroke: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        d: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
      },
    ],
  },
  'SunIcon:outline': {
    attrs: {
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: '1.5',
      stroke: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        d: 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
      },
    ],
  },
  'MoonIcon:outline': {
    attrs: {
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: '1.5',
      stroke: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        d: 'M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z',
      },
    ],
  },
  'DocumentTextIcon:outline': {
    attrs: {
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: '1.5',
      stroke: 'currentColor',
      'aria-hidden': 'true',
      'data-slot': 'icon',
    },
    paths: [
      {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        d: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
      },
    ],
  },
}

export function Icon(handle: Handle<IconProps>) {
  return () => {
    const { icon, iconLabel, iconVariant = 'solid', iconSize = '1.5rem' } = handle.props
    const data = iconPaths[`${icon}:${iconVariant}`]
    if (!data) throw new Error(`Unsupported content icon: ${icon}`)
    return (
      <svg
        {...data.attrs}
        role={iconLabel ? 'img' : undefined}
        aria-label={iconLabel}
        aria-hidden={iconLabel ? undefined : true}
        mix={css({ width: iconSize, height: iconSize, display: 'inline-block', flexShrink: 0 })}
      >
        {data.paths.map((path) => (
          <path {...path} />
        ))}
      </svg>
    )
  }
}
