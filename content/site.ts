import { navigation } from './navigation.ts'
import type { SiteMetadata } from '../contracts/content.ts'
import portrait from './media/fresse13.jpg'

export const site = {
  version: 2,
  media: {},
  navigation,
  contact: {
    name: 'Hannes Diem',
    message: 'Looking forward to speak to you via mail or messanger.',
    website: 'https://hannesdiem.de',
    portrait,
    signal: {
      href: 'https://signal.me/#eu/Dzh14YmONmSR5BPAsmyZ_9WPRU5W_AX7B0Z3pzmRvDE4VfC_SsxFubXQTpmpRZhF',
      username: '@hannesdiem.01',
    },
    telegram: { href: 'https://t.me/hannesdiem', username: '@hannesdiem' },
  },
} satisfies SiteMetadata
export const description = '...about Music, Life, and Everything'
