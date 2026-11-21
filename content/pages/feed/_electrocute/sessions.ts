import type { ElectroCuteSession } from '@hannesdiem/content-components'

// Artist-supplied source. Filename: yymmdd_electrocute_RomanNumber_session_name.
const recordings = [
  {
    // Keep the key used by existing highlights and listening progress.
    id: '230413-electrocute-xliii-limbo-to-legato',
    slug: 'xliii-limbo-to-legato',
    title: 'Limbo to Legato',
    recordedAt: '2023-04-13',
    src: 'https://filedn.eu/l1O78TfifnP421oU4WVEgW8/Electrocute/230413_electrocute_XLIII_limbo_to_legato.mp4',
    duration: 4419.716667,
    frameRate: 60,
  },
] satisfies readonly (ElectroCuteSession & { slug: string })[]

export const sessions = recordings.map((recording) => ({
  ...recording,
  romanNumeral: recording.slug.split('-')[0].toUpperCase(),
}))
