import type { ElectroCuteSession } from '@hannesdiem/content-components'

// Artist-supplied source. Filename: yymmdd_electrocute_RomanNumber_session_name.
const recordings = [
  {
    slug: '230413-electrocute-xliii-limbo-to-legato',
    title: 'XLIII limbo to legato',
    recordedAt: '2023-04-13',
    src: 'https://filedn.eu/l1O78TfifnP421oU4WVEgW8/Electrocute/230413_electrocute_XLIII_limbo_to_legato.mp4',
    duration: 4419.716667,
    frameRate: 60,
  },
] satisfies readonly (Omit<ElectroCuteSession, 'id'> & { slug: string })[]

export const sessions = recordings.map(({ slug, ...recording }) => ({ ...recording, id: slug }))
