import type { PageMetadata } from '../types.ts'

import { Prose } from '@hannesdiem/content-components'

export const metadata = {
  kind: 'page',
  theme: 'electrocute',
  noindex: true,
  description: '...about Music, Life, and Everything',
  ogType: 'website',
  ogTitle: 'Privacy',
  nofollow: true,
} satisfies PageMetadata

export const title = 'Privacy'

export default function Content() {
  return (
    <>
      <div class="legal-page">
        <Prose bigOnLg>
          <h1>Privacy policy</h1>
          <h3>Responsible person</h3>
          <p>
            Hannes Diercks
            <br />
            Rotdornallee 16
            <br />
            22175 Hamburg
            <br />
            Germany
          </p>
          <h3>Data economy</h3>
          <p>
            This website is crafted by hand and does not store, process or collect personal data
            unless you explicitly provide it for a functionality such as a newsletter or login.
          </p>

          <h3>Legal basis & data retention</h3>
          <p>
            When you provide personal data, it&apos;s processed based on your consent. Data is
            retained only as long as necessary for the service you requested and deleted upon your
            request.
          </p>

          <h3>Your rights under GDPR</h3>
          <p>You have the following rights regarding your personal data:</p>
          <ul class="compact-list">
            <li>Right to access your data</li>
            <li>Right to rectification of inaccurate data</li>
            <li>Right to erasure (&ldquo;right to be forgotten&rdquo;)</li>
            <li>Right to restriction of processing</li>
            <li>Right to data portability</li>
            <li>Right to object to processing</li>
            <li>
              Right to lodge a complaint with the{' '}
              <a
                href="https://www.datenschutz-hamburg.de/"
                target="_blank"
                rel="noopener noreferrer"
                class="policy-link"
              >
                Hamburg Commissioner for Data Protection
              </a>{' '}
            </li>
          </ul>
          <p>
            To exercise any of these rights or if you have any privacy concerns, please email me at{' '}
            <a
              href="mailto:privacy@xiphe.net"
              class="policy-link"
            >
              privacy@xiphe.net
            </a>
            . I will respond to your request within 30 days.
          </p>

          <h3>Cookies</h3>
          <p>
            For login and customization functionality this website uses strictly necessary,
            functional cookies.
            <br />
            But never to track you.
            <br />
            <br />
            <span class="policy-note">
              ℹ️{' '}
              <em>
                Cookies themselves are not evil, its a technology required for example to keep you
                logged in to a service. Unfortunately the same technology can be used to track you,
                which is why many other websites are required by law to get your consent with a
                cookie banner.
                <br />– I do not track you.
              </em>{' '}
            </span>
          </p>
          <h3>Third-party reference</h3>
          <p>
            This website is hosted with{' '}
            <a
              href="https://www.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              class="policy-link"
            >
              Cloudflare
            </a>
            .<br />
            Here you can find their{' '}
            <a
              href="https://www.cloudflare.com/cloudflare-customer-dpa/"
              target="_blank"
              rel="noopener noreferrer"
              class="policy-link"
            >
              Data Processing Addendum
            </a>
            .
          </p>
          <p>
            For transactional emails and newsletters this website uses{' '}
            <a
              href="https://resend.com/"
              target="_blank"
              rel="noopener noreferrer"
              class="policy-link"
            >
              Resend
            </a>
            .<br />
            Here you can find their{' '}
            <a
              href="https://resend.com/legal/dpa"
              target="_blank"
              rel="noopener noreferrer"
              class="policy-link"
            >
              Data Processing Addendum
            </a>
            .
            <span class="policy-note spaced">
              ℹ️{' '}
              <em>
                TL;DR (by ChatGPT): The DPA confirms that Resend processes customer data strictly
                under the customer&apos;s instructions, ensuring compliance with GDPR, CCPA, and
                other privacy laws. It guarantees that customer data remains under their control, is
                not sold, and is only shared with authorized sub-processors, with prior notice given
                for any changes. International data transfers are covered through Standard
                Contractual Clauses (SCCs), ensuring legal compliance. Resend also commits to
                maintaining strong security measures and notifying customers of any data breaches,
                providing transparency and control over how their data is handled.
                <br />
              </em>
            </span>
          </p>

          <h3>Policy updates</h3>
          <p>
            This policy may be updated occasionally. Significant changes will be communicated via
            email.
          </p>
        </Prose>
      </div>
    </>
  )
}
