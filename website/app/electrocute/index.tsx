import { clientEntry, type Handle } from 'remix/component'
import type { ElectroCuteArchiveProps } from '@hannesdiem/content-components'
import assets from '../../../.generated/assets.json' with { type: 'json' }
import { Archive as ArchiveComponent } from './view.tsx'
import { validateSessions } from './model.ts'

const Archive = clientEntry(`${assets.electrocute}#Archive`, ArchiveComponent)

export function ElectroCuteArchive(handle: Handle<ElectroCuteArchiveProps>) {
  validateSessions(handle.props.sessions)
  // Frame navigation preserves matching client entries. The archive and each
  // session are separate lifecycles; Remix's DOM key disposes the outgoing player.
  return () => (
    <div data-rmx-key={`electrocute:${handle.props.selectedId ?? 'archive'}`}>
      <Archive {...handle.props} />
    </div>
  )
}
