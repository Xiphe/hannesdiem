import type { PageMetadata } from '../../types.ts'
import photo20250415191136 from '../../media/PHOTO-2025-04-15-19-11-36.jpg'

import { Button, Hero, Page, TextBlock } from '@hannesdiem/content-components'

export const metadata = {
  kind: 'page',
  description:
    'Join 7 artists and spend 7 days expanding ourselves into a band, then settle on an album of songs',
  image: photo20250415191136,
  ogType: 'website',
  ogTitle: 'Lunow-Stolzenhagen 2025',
  updatedAt: '2025-05-16T13:17:20.824+00:00',
  sourceId: '21dfbb18-e4f5-4f11-939d-cd2ee537afc1',
  ogImageTitle: 'One Week Album 2025',
  ogSubtitle: 'August 16 - 23',
  ogTextColor: 'light',
  shareImage: true,
} satisfies PageMetadata

export const title = 'Lunow-Stolzenhagen 2025'

export default function Content() {
  return (
    <>
      <Page firstIsHero={true}>
        <Hero
          title={'One Week Album 2025'}
          subtitle={'August 16. - 23.\\nLunow-Stolzenhagen'}
          image={photo20250415191136}
          first={true}
          pullUp={false}
          textColor={'light'}
        />
        <a
          id={'hi-friends'}
          class="section-anchor"
        />
        <TextBlock
          title={'Rustic Rural'}
          pullUp={true}
        >
          <h2>{"Let's go to the country side!"}</h2>
          <p>
            <em>{"Doesn't mean we have to make country music, but we'll be open to it!"}</em>
          </p>
          <h3>{'What?'}</h3>
          <p>
            {
              'Join 7 artists and spend 7 days expanding ourselves into a band, then settle on an album of songs.'
            }
          </p>
          <ul>
            <li>
              <a href={'https://hannesdiem.de/one-week-album'}>
                {'Learn more about One Week Album'}
              </a>
              {'.'}
            </li>
            <li>
              <a href={'https://hannesdiem.de/one-week-album/california-2024'}>
                {'Read the California 2024 Recap '}
              </a>
            </li>
            <li>
              <a href={'https://hannesdiem.de/one-week-album/lokken-2024'}>
                {'Read the Løkken 2024 Recap'}
              </a>
            </li>
          </ul>
          <h3>{'When'}</h3>
          <p style={{ textAlign: 'left' }}>{'16. - 23. August 2025'}</p>
          <h3 style={{ textAlign: 'left' }}>{'Where'}</h3>
          <p style={{ textAlign: 'left' }}>
            {'A rustic and spacious creative space in '}
            <a
              href={
                'https://www.google.com/maps/place/Lunow-Stolzenhagen/@52.9280366,14.073005,9930m/data=!3m2!1e3!4b1!4m6!3m5!1s0x47a9e7d8d7e11ce9:0x81279aaedb116516!8m2!3d52.9223215!4d14.1189647!16s%2Fm%2F02q98n5?entry=ttu&g_ep=EgoyMDI1MDQxNi4xIKXMDSoJLDEwMjExNDUzSAFQAw%3D%3D'
              }
              target={'_blank'}
              rel={'noopener noreferrer'}
            >
              {'Lunow Stolzenhagen'}
            </a>
            <br />
            {'The place will cost us '}
            <u>{'350€'}</u>
            {' as a group.'}
          </p>
          <p style={{ textAlign: 'left' }}>
            <em>
              {
                "(We'll miss the sea & beach this year – but gain space to be ourselves and to make sound without disturbing anyone.)"
              }
            </em>
          </p>
          <p style={{ textAlign: 'left' }}>
            <strong>{'Go by Train'}</strong>
            {': Go to Angermünde and be picked up from there by a shutlle'}
            <br />
            <strong>{'Go by Car'}</strong>
            {": Let us know if you're coming by car and have space for ride-sharing"}
          </p>
          <h3 style={{ textAlign: 'left' }}>{'Eat'}</h3>
          <p style={{ textAlign: 'left' }}>
            <em>
              {"This about celebrating, enjoying and relaxing as much as it's about making music."}
            </em>
          </p>
          <p style={{ textAlign: 'left' }}>
            {"We'll provide 3 delicious meals per day."}
            <br />
            {'Your contribution will be '}
            <u>{'100€'}</u>
            {' for the whole week.'}
            <br />
            {"Let us know in advance if you're vegan or have any allergies."}
          </p>
          <h3 style={{ textAlign: 'left' }}>{'Sleep'}</h3>
          <ul>
            <li>
              <u>{'25€/Night'}</u>
              {' in our creative space with limited privacy, outdoor shower, and compost toilet.'}
            </li>
            <li>
              <u>{'40€/Night'}</u>
              {' with more privacy and comfort at the nearby guesthouse '}
              <a
                href={'https://terezas.de/reservierung/'}
                target={'_blank'}
                rel={'noopener noreferrer'}
              >
                {'Terezas.'}
              </a>
            </li>
          </ul>
          <p style={{ textAlign: 'left' }}>
            {'Please let us know what you prefer so we can arrange everything.'}
          </p>
          <h3 style={{ textAlign: 'left' }}>{'Connect, Explore, Create'}</h3>
          <p style={{ textAlign: 'left' }}>
            {
              "We're not taking any fees as organizers and share the costs as a group. Depending on your accommodation, this should total around "
            }
            <u>{'350€ + travel'}</u>
            {'.'}
          </p>
          <p style={{ textAlign: 'left' }}>
            {'Our motivation is to explore new ways of creation and connection with you.'}
            <br />
            {'Your most valuable way of giving back is to:'}
          </p>
          <ul>
            <li>{'be part of the journey with all of your totality'}</li>
            <li>{'drop expectations and let yourself be surprised'}</li>
            <li>{'gift us honest feedback'}</li>
            <li>
              {
                'gift your permission to create and use photo and video material of you at the event'
              }
            </li>
          </ul>
          <h2 style={{ textAlign: 'left' }}>
            <strong>{'Getting into the Mood'}</strong>
          </h2>
          <p style={{ textAlign: 'left' }}>
            {
              "If you want to make an extended trip out of this, you're invited to join us the weekend before "
            }
            <em>{'(8 – 10 August)'}</em>
            {' at the '}
            <a
              href={'https://musikundstille.com/'}
              target={'_blank'}
              rel={'noopener noreferrer'}
            >
              {'Musik & Stille Festival'}
            </a>
            {
              " in Ueckermünde, where we'll be resourcing ourselves with beach vibes, meditation, yoga, and a wonderfully diverse blend of music."
            }
          </p>
          <hr />
          <p style={{ textAlign: 'center' }}>
            <Button
              label={'Click here to join us!'}
              href={
                'https://docs.google.com/forms/d/e/1FAIpQLSfOWkJ_24G5sPa694SbLp6jv7JmtDulCLJOwUwtGC5UcDSxJQ/viewform?usp=sharing'
              }
              blank={true}
              icon={'CursorArrowRaysIcon'}
            />
          </p>
          <p style={{ textAlign: 'center' }}>
            {'Or '}
            <a href={'mailto:oneweekalbum@hannesdiem.de'}>{'write us a E-Mail'}</a>
          </p>
          <p style={{ textAlign: 'center' }}>
            <br />
          </p>
          <p style={{ textAlign: 'left' }}>
            {"We're so excited and can't wait to drop deep into creation with you!"}
            <br />
            <strong>{'Roxy & Hannes'}</strong>
          </p>
        </TextBlock>
      </Page>
    </>
  )
}
