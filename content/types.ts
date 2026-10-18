import type {
  Identity,
  ReleaseProps,
  SongProps,
  SongReference,
} from '@hannesdiem/content-components'

export type ReleaseMetadata = Omit<ReleaseProps, 'children'>

export interface SongDefinition extends Omit<SongProps, 'children'>, SongReference {}

export interface ContentRoute {
  path: string
  document: string
  title: string
  kind: string
  description?: string
  image?: string
  theme?: string
  releaseDate?: string
  creationDate?: string
  noindex?: boolean
  nofollow?: boolean
  ogTitle?: string
  ogType?: string
  ogImageTitle?: string
  ogSubtitle?: string
  ogTextColor?: 'light' | 'dark'
  shareImage?: boolean
  updatedAt?: string
  musicians?: string[]
  songs?: string[]
  authors?: (Identity & { ogProfile?: string })[]
  profile?: { firstName: string; lastName: string }
  sourceId?: string
}
