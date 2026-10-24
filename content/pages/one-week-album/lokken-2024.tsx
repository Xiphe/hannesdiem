import type { PageMetadata } from '../../types.ts'
import fire from '../../media/fire.jpg'

import selfie from '../../media/selfie.jpg'
import hannesRec1 from '../../media/hannes_rec_1.jpg'
import cooking from '../../media/cooking.jpg'
import piano from '../../media/piano.jpg'
import yoga1 from '../../media/yoga1.jpg'
import moreGuitar from '../../media/more_guitar.jpg'
import food2 from '../../media/food_2.jpg'
import painting from '../../media/painting.jpg'
import food1 from '../../media/food_1.jpg'
import yoga2 from '../../media/yoga2.jpg'
import hygge from '../../media/hygge.jpg'
import { Button, Hero, ImageBand, Page, TextBlock } from '@hannesdiem/content-components'

export const metadata = {
  kind: 'page',
  description:
    'A creative retreat in Denmark, a house meant for ten, and two artists diving deep into music, food, and creativity. One Week Album is just getting started.',
  image: fire,
  theme: 'beach',
  ogType: 'website',
  ogTitle: 'Løkken 2024 Recap',
  updatedAt: '2025-02-28T02:32:55.432+00:00',
  sourceId: '37a52c30-47a1-4bc8-87fe-f966331d33ee',
  ogImageTitle: 'Løkken 2024',
  ogSubtitle: 'Just the two of us',
  ogTextColor: 'dark',
  shareImage: true,
} satisfies PageMetadata

export const title = 'Løkken 2024 Recap'

export default function Content() {
  return (
    <>
      <Page firstIsHero={true}>
        <Hero
          title={'Løkken 2024 Recap'}
          subtitle={'One Week Album - Just the two of us.'}
          image={fire}
          first={true}
          pullUp={false}
          textColor={'dark'}
        />
        <a
          id={'hi-friends'}
          class="section-anchor"
        />
        <TextBlock
          title={'Hi Friends!'}
          pullUp={true}
        >
          <p>
            {
              'Last September, Roxy and I spent a wonderful time in a beautiful house in Løkken, Denmark. It was our first creative retreat, and the mission was simple:'
            }
          </p>
          <p style={{ textAlign: 'center' }}>
            <em>{'create an album in one week.'}</em>
          </p>
        </TextBlock>
        <ImageBand
          pullUp={false}
          breakPoint={'sm'}
          images={[
            { image: selfie, includeStacked: true },
            { image: hannesRec1, includeStacked: false },
          ]}
        />
        <a
          id={'idea'}
          class="section-anchor"
        />
        <TextBlock
          title={'The Idea behind all of this.'}
          pullUp={true}
        >
          <p>
            {'The concept for writing an album in one week came to me after a '}
            <a
              href={'https://www.theinitiationjourney.com/'}
              target={'_blank'}
              rel={'noopener noreferrer'}
            >
              {"transformative men's retreat"}
            </a>
            {
              ' in early 2024 — a week of workshops, intense bonding, and unraveling. A few days later, ten people left the space vibrating with '
            }
            <strong>{'fresh energy, highly inspired and enabled'}</strong>
            {
              '. We had just removed so many unconscious layers that had been holding us back and I was bursting with ideas.'
            }
          </p>
          <p>
            {
              'But at that point, our time together was over. We said goodbye, and everyone went their own way, following their own path to actualize this newly created power.'
            }
          </p>
          <p>
            {'Since that experience, one question has been really obvious to me: '}
            <em>
              {
                'What if the people who came together here had a tendency to create a common solution?'
              }
            </em>
            <br />
            <strong>{'What if they all made music?'}</strong>
          </p>
          <h3>
            {"That's why we created the "}
            <em>{'One Week Album'}</em>
            {' retreat.'}
          </h3>
          <p>
            {
              'Because we believe that extraordinary things happen when a group of creatives gather in safe space, establish a bond of trust, set aside all distractions, and tap into the core of their creative power.'
            }
          </p>
          <p style={{ textAlign: 'center' }}>
            <strong>{"We're still driven by this belief."}</strong>
            <br />
            <strong>{'And we want this to happen!'}</strong>
          </p>
        </TextBlock>
        <ImageBand
          pullUp={false}
          breakPoint={'sm'}
          images={[
            { image: cooking, includeStacked: true },
            { image: piano, includeStacked: true },
            { image: yoga1, includeStacked: false },
          ]}
        />
        <TextBlock
          title={'Lessons from 2024'}
          pullUp={true}
        >
          <p>{'With our fist attempt we realized a few things:'}</p>
          <ol>
            <li>
              <strong>{"My network of musicians isn't that big"}</strong>
              <br />
              {"After we announced our plans, we weren't able to gather a group for this."}
            </li>
            <li>
              <strong>
                {"I'm just staring my journey as a  facilitator for transformative spaces."}
              </strong>
              <br />
              {
                "The experience I had in early spring was led by two people who’ve done this kind of work for well over ten years. I do have an intuition for it, and I'm learning a lot, but last summer I wasn't ready to lead a group."
              }
            </li>
            <li>
              <strong>{'We need more planning time beforehand'}</strong>
              {'.'}
              <br />
              {'We heard a lot of, '}
              <em>{'"This idea is great, but I don\'t have time that week."'}</em>
            </li>
          </ol>
          <p>
            {
              'So what happened is that Roxy and I had a week alone in a house we had rented for ten people.'
            }
          </p>
          <p>
            {
              'We had the best food, space to unfold, for painting, music, yoga. A week in which we really focused on our creativity. I was able to finish writing my solo album "Hoffung" as well as record all thirteen tracks within the week.'
            }
            <br />
            <strong>{'And most importantly we crafted a lasting memory for both of us.'}</strong>
          </p>
        </TextBlock>
        <ImageBand
          pullUp={false}
          breakPoint={'sm'}
          images={[
            { image: moreGuitar, includeStacked: false },
            { image: food2, includeStacked: false },
            { image: painting, includeStacked: true },
          ]}
        />
        <TextBlock
          title={"We're gonna do this again!"}
          pullUp={true}
        >
          <p>
            {"Though our plans didn't fully worked out in 2024, one thing we’re sure of:"}
            <br />
            <strong>{'We want to do this again this year. And you’re invited to join us.'}</strong>
            <br />
            <br />
            {
              'With everyone signaling interest last year, we want to find a place and a time together. '
            }
          </p>
          <p>
            {
              "We'll go somewhere beautiful, cut off distractions, build a safe space for our creativity and create an unforgettable experience around music, food and connection. We’ll again attempt to create an album in one week – in any case a deeper understanding of what it takes for a group to grow together into a band and ignite their collaborative creative force."
            }
          </p>
          <p>
            <br />
          </p>
          <p style={{ textAlign: 'center' }}>
            <Button
              label={'Join us!'}
              href={'/owa/form'}
              blank={true}
              icon={'ArrowRightIcon'}
            />
          </p>
        </TextBlock>
        <ImageBand
          title={''}
          pullUp={false}
          breakPoint={'sm'}
          images={[
            { image: food1, includeStacked: false },
            { image: yoga2, includeStacked: true },
            { image: hygge, includeStacked: false },
          ]}
        />
      </Page>
    </>
  )
}
