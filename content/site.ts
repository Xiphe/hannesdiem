import { navigation } from './navigation.ts'
import type { SiteMetadata } from '../contracts/content.ts'

export const site = { version: 2, media: {}, navigation } satisfies SiteMetadata
export const description = '...about Music, Life, and Everything'
