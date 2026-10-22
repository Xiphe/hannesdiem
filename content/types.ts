import type { ReleaseProps, SongProps, SongReference } from '@hannesdiem/content-components'

export type ReleaseMetadata = Omit<ReleaseProps, 'children'>

export interface SongDefinition extends Omit<SongProps, 'children'>, SongReference {}

import type { ContentRoute } from '../contracts/content.ts'
export type { ContentRoute } from '../contracts/content.ts'

export type ContentPublication = Omit<ContentRoute, 'title'> & { title?: string }
