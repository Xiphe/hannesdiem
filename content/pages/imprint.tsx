import type { PageMetadata } from '../types.ts'

import { Prose } from '@hannesdiem/content-components'

export const metadata = {
  kind: 'page',
  theme: 'electrocute',
  noindex: true,
  description: '...about Music, Life, and Everything',
  ogType: 'website',
  ogTitle: 'Imprint',
  nofollow: true,
} satisfies PageMetadata

export const title = 'Imprint'

export default function Content() {
  return (
    <>
      <div class="legal-page">
        <Prose bigOnLg>
          <h1>Imprint / Impressum</h1>
          <p>
            Hannes Diercks
            <br /> Rotdornallee 16
            <br />
            22175 Hamburg
            <br />
            Germany
          </p>

          <h2>Contact</h2>
          <p>
            Tel: +49 (0) 151 405 111 98
            <br />
            Mail: imprint@xiphe.net
          </p>
        </Prose>
      </div>
    </>
  )
}
