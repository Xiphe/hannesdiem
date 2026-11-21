import { ElectroCuteArchive, FeedCollection } from '@hannesdiem/content-components'
import { sessions } from './_electrocute/sessions.ts'
import { recordings } from './_temple-of-sound/recordings.tsx'

export const title = 'Feed'

export default function Content() {
  return (
    <FeedCollection>
      <ElectroCuteArchive sessions={sessions} />
      {recordings}
    </FeedCollection>
  )
}
