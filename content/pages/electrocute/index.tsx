import { ElectroCuteArchive } from '@hannesdiem/content-components'
import type { PageMetadata } from '../../types.ts'
import { sessions } from '../feed/_electrocute/sessions.ts'

export const title = 'ElectroCute'
export const metadata = { kind: 'project', theme: 'electrocute' } satisfies PageMetadata

export default function Content() {
  return (
    <ElectroCuteArchive
      sessions={sessions}
      feed
    />
  )
}
