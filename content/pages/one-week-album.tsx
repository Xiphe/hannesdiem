import {
  Button,
  Hero,
  IconList,
  ImageBand,
  Page,
  Prose,
  TextBlock,
  Timetable,
  TwoColumnText,
} from '@hannesdiem/content-components'

export const title = 'One Week Album'

export default function Content() {
  return (
    <>
      <Page firstIsHero={true}>
        <Hero
          title={'One Week Album'}
          subtitle={'Join 7 artists for 7 days of music, food, community and creation'}
          image={'67BFC27B-E033-470B-9B6F-77A800385A70.jpeg'}
          first={true}
          pullUp={false}
          textColor={'light'}
        />
        <TextBlock
          title={'Do you answer YES to these questions?'}
          pullUp={true}
        >
          <IconList
            list={[
              { icon: 'SparklesIcon', text: 'Are you keen to meet your inspirational depth?' },
              {
                icon: 'FireIcon',
                text: 'Do you want to create music from the mind, heart, and body?',
              },
              {
                icon: 'MusicalNoteIcon',
                text: 'Are you experienced creating sound with either your voice, an instrument or programmatically?',
              },
              {
                icon: 'UserGroupIcon',
                text: 'Do you seek connection and co-creation among curious people?',
              },
            ]}
          />
          <p style={{ textAlign: 'center' }}>
            <strong>{'Then this retreat is for you!'}</strong>
          </p>
          <p style={{ textAlign: 'center' }}>
            <Button
              label={'Join us!'}
              href={'mailto:oneweekalbum@hannesdiem.de'}
            />
          </p>
        </TextBlock>
        <ImageBand
          title={'Feel. Connect. Create.'}
          smallTitle={'Feel.\\nConnect.\\nCreate.'}
          pullUp={false}
          breakPoint={'md'}
          images={[
            {
              image: 'hannes-diem-on-grand-piano-one-week-album.jpg',
              includeStacked: true,
              title: '',
            },
            { image: 'mixing-scene-one-week-retreat.jpg', includeStacked: false },
          ]}
        />
        <a
          id={'feel-connect-create'}
          class="section-anchor"
        />
        <TextBlock
          title={"What's gonna happen?"}
          pullUp={true}
        >
          <p>
            {'A week of inner work, group building, creative practice and music making.'}
            <br />
            {'Together we transform a group of strangers into an orchestra bursting with ideas.'}
          </p>
          <ul>
            <li>{'We build an appreciative band of trust and support within the group'}</li>
            <li>{'We establish techniques to quickly communicate our raw creative ideas'}</li>
            <li>{'We tap into our unconscious inspiration'}</li>
            <li>{'We wield our emotions into sound'}</li>
            <li>{'We practice rituals of actualization'}</li>
          </ul>
          <p>
            <strong>
              {
                'This unforgettable experience fosters true connections and the creation of fresh, raw, and authentic music.'
              }
            </strong>
          </p>
        </TextBlock>
        <ImageBand
          pullUp={false}
          breakPoint={'sm'}
          images={[
            { image: 'mood_studio_pic.jpeg', includeStacked: false },
            { image: 'camp_fire.jpg', includeStacked: false },
          ]}
        />
        <a
          id={'a-typical-day'}
          class="section-anchor"
        />
        <TextBlock
          title={'A typical day'}
          pullUp={true}
        >
          <Timetable
            list={[
              {
                time: '8:00',
                title: (
                  <>
                    <p>{'Wake up the body with an active meditation'}</p>
                  </>
                ),
              },
              {
                time: '9:00',
                title: (
                  <>
                    <p>{'Breakfast with Granola, fresh baked bread and fruits'}</p>
                  </>
                ),
              },
              {
                time: '10:30',
                title: (
                  <>
                    <p>{'Morning session about body-percussion and overcoming shame'}</p>
                  </>
                ),
              },
              {
                time: '13:00',
                title: (
                  <>
                    <p>
                      {'Soulful Shakshuka for lunch and time to unwind, take a walk or do yoga'}
                    </p>
                  </>
                ),
              },
              {
                time: '15:00',
                title: (
                  <>
                    <p>
                      {'Afternoon session writing the "'}
                      <em>{'worst song ever'}</em>
                      {'" and dealing with perfectionism'}
                    </p>
                  </>
                ),
              },
              {
                time: '19:00',
                title: (
                  <>
                    <p>{'Tarte flambée for dinner, expanding into a jam session on the terrace'}</p>
                  </>
                ),
              },
              {
                time: '21:00',
                title: (
                  <>
                    <p>{'"Open Mic" style concert'}</p>
                  </>
                ),
              },
            ]}
          />
          <p>
            <strong>{'Inspiration is a wonderful, yet unpredictable fairy.'}</strong>
            <br />
            {
              'During all times we might spontaneously follow the flow of things, capture a vocal line, record a live jam or dance to a beat we just came up with.'
            }
          </p>
        </TextBlock>
        <TwoColumnText headline={'About us'}>
          <div>
            <a
              id={'hannes'}
              class="section-anchor"
            />
            <TextBlock
              title={'Hannes'}
              portrait={'portrait_hannes.png'}
              pullUp={false}
              bigOnLg={false}
              as={'div'}
            >
              <p>
                {
                  'Greeted into this world with the soulful blues music of his father he grew up with instruments and music all around him and learned to play drums, percussion and piano at a young age.'
                }
              </p>
              <p>
                {
                  'At age 17 he recorded his first progressive metal album and from there on journeys through the genres from gothic over rap, singer-songwriter and alternative to electronic music.'
                }
                <br />
                {
                  '2022 and counting he is coming up with over 356 song ideas per year when doing livestream improvisation sessions where he transmutes emotions to sounds.'
                }
              </p>
              <p>
                {
                  'For over 6 years he has been living in his Campervan and practicing a digital nomad lifestyle.'
                }
                <br />
                {
                  'Despite living "the dream" at marvelous places, working remotely, surfing and partying, he had increasing difficulties accessing his musical roots and eventually faced a series of severe depressive episodes.'
                }
                <br />
                {
                  'These times of darkness and struggle ultimately led him on a path of recalibrating beliefs, befriending shadows, and finding new ways to grow. Similar to his fluidity in genres he values approaches from conventional movement and psychotherapy as well as breathwork, yoga, tantra and more.'
                }
              </p>
              <p>
                <strong>
                  {
                    "It's this careful mixture of inner work and musical expression that he is inviting you in. Come and join a dance between bliss and anger, between tears and laughter, between industrial and funk."
                  }
                </strong>
              </p>
            </TextBlock>
          </div>
          <div>
            <a
              id={'roxanna'}
              class="section-anchor"
            />
            <TextBlock
              title={'Roxanna'}
              portrait={'portrait_roxy.png'}
              pullUp={false}
              bigOnLg={false}
              as={'div'}
            >
              <p>
                <br />
                {
                  'born in 1988, she lives in Hamburg or in her van somewhere between Denmark and Spain.'
                }
              </p>
              <p>
                {
                  'She studied business administration and cultural management. She has worked in marketing and event management for the last 15 years.'
                }
              </p>
              <p>
                {
                  'In search of freedom, reflection on the essentials and the sea, she shares her stories. Her passions are writing and cooking. She has spent a lot of time at the sea and has a fable for Scandinavian culture. Her buttermilk-yellow vintage car "Susy" has become a complex attitude to life and an engine of thought. If there\'s enough wind, she\'ll be kitesurfing.'
                }
              </p>
              <p>
                <strong>
                  {
                    "In this week she will be our feel good partner, supporting where it's useful, creating the meals, holding the space or as an active listener to everybody who needs one. Her vision for the retreat is: Lagom. It describes a deeply Swedish attitude to life and means “not too much, not too little”, or “just right”."
                  }
                </strong>
              </p>
            </TextBlock>
          </div>
        </TwoColumnText>
        <ImageBand
          title={'Come as you are.'}
          pullUp={false}
          breakPoint={'md'}
          images={[
            { image: 'mood_amp.jpeg', includeStacked: false },
            { image: 'hannes-diem-on-guitar-one-week-album.jpg', includeStacked: true },
          ]}
        />
        <a
          id={'what-to-bring'}
          class="section-anchor"
        />
        <TextBlock
          title={'What to bring'}
          pullUp={true}
        >
          <p>
            <strong>{'Bring all your aspects! We want to see and welcome all of you!'}</strong>
          </p>
          <ul>
            <li>
              {'Idea capturing devices'}
              <br />
              <em>{'Notebook, dictation app, paper and pen,...'}</em>
            </li>
            <li>{'Your Instruments or tools you use to create'}</li>
            <li>{'Commitment to unplug and a clear schedule'}</li>
            <li>{'Comfortable clothes, suitable for outdoor movement, swimming and relaxing'}</li>
            <li>{'Bedsheets, including blanket covers, pillowcases, and towels'}</li>
            <li>
              {'Personal items to make you feel comfortable'}
              <br />
              <em>{'e.g. blanket, favorite tea, nut butter, yoga mat...'}</em>
            </li>
          </ul>
        </TextBlock>
        <a
          id={'this-is-gonna-be-wonderful'}
          class="section-anchor"
        />
        <Prose textSize={'medium'}>
          <p>
            <br />
          </p>
          <hr />
          <h2 style={{ textAlign: 'center' }}>{'This is gonna be wonderful'}</h2>
          <p style={{ textAlign: 'center' }}>
            <Button
              label={'Join us!'}
              href={'/owa/form'}
              blank={true}
              icon={'ArrowRightIcon'}
            />
          </p>
          <p style={{ textAlign: 'center' }}>
            {'Questions, uncertainties, feedback?'}
            <br />
            {'Please '}
            <a href={'mailto:oneweekalbum@hannesdiem.de'}>{'get in touch with us'}</a>
            {'!'}
          </p>
          <p>
            <br />
          </p>
          <p>
            <br />
          </p>
          <p>
            <br />
          </p>
        </Prose>
        <a
          id={'faq'}
          class="section-anchor"
        />
        <TextBlock
          title={'FAQ'}
          pullUp={true}
        >
          <h3>{'How much does this cost?'}</h3>
          <p>
            {
              "Right now our motivation is to have community and to explore co-creative spaces. We're not doing this for profit."
            }
          </p>
          <p>
            {
              "We'll all share costs for food and accommodation. Which should be somewhere around 400€ per person for the entire week."
            }
          </p>
          <p>
            {
              'Yet we would like to receive your honest feedback and have your permission to create photo and video material of the event so we can communicate it better in the future.'
            }
          </p>
          <h3>{'Will we actually write a full album?'}</h3>
          <p>
            {
              "We'll see! The intent is an invitation to create a strong focus and a motivation to go through resistances. A clear goal serves as a catalyst to do the work necessary and we will harness that."
            }
          </p>
          <p>
            {
              "At the same time: If this creates negative stress such as incentivizing people to work during the night, we'll take a step back. This week is about discovery and connection as much as it's about creativity."
            }
          </p>
          <h3>{'How can I stay informed about future events?'}</h3>
          <p>
            {'Find us on Instagram as '}
            <a
              href={'https://www.instagram.com/hannes.diem/'}
              target={'_blank'}
              rel={'noopener noreferrer'}
            >
              {'@hannes.diem'}
            </a>
            {' and '}
            <a
              href={'https://www.instagram.com/oneweekalbum/'}
              target={'_blank'}
              rel={'noopener noreferrer'}
            >
              {'@oneweekalbum'}
            </a>
            {'.'}
            <br />
            {'Sign up to our '}
            <a
              href={
                'mailto:oneweekalbumnewsletter@hannesdiem.de?subject=Newsletter%20Signup&body=Hi!%0A%0AI%20would%20like%20to%20stay%20informed%20about%20future%20%22One%20Week%20Album%22%20events.%0A%0ACheers'
              }
              target={'_blank'}
              rel={'noopener noreferrer'}
            >
              {'newsletter'}
            </a>
            {'.'}
          </p>
          <h3>{'I would like to come! What do I need to do?'}</h3>
          <p>
            {'Please go ahead and fill in our '}
            <a
              href={'/owa/form'}
              target={'_blank'}
              rel={'noopener noreferrer'}
            >
              {'Application Form'}
            </a>
            {
              ' so we can get to learn a bit about you. We will get in touch shortly after that to schedule a quick 1 on 1.'
            }
          </p>
          <p>
            {'When you have questions, please '}
            <a
              href={'mailto:oneweekalbum@hannesdiem.de'}
              target={'_blank'}
              rel={'noopener noreferrer'}
            >
              {'get in touch with us'}
            </a>
            {'.'}
          </p>
        </TextBlock>
        <Prose textSize={'medium'}>
          <p>
            <br />
          </p>
          <p>
            <br />
          </p>
        </Prose>
      </Page>
    </>
  )
}
