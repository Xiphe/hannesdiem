import { TempleRecordings } from '@hannesdiem/content-components'
import micTechCover from '../../media/temple-recording-mic-tech-check-cover.jpg'
import permissionsCover from '../../media/temple-recording-permission-spaces-cover.jpg'
import kennstDuDasCover from '../../media/temple-recording-kennst-du-das-cover.jpg'
import flyWithMeCover from '../../media/temple-recording-fly-with-me-cover.jpg'
import waitingBandCover from '../../media/temple-recording-waiting-band-cover.jpg'
import theFallCover from '../../media/temple-recording-the-fall-cover.jpg'
import feuerUndVergessenCover from '../../media/temple-recording-feuer-und-vergessen-cover.jpg'

export const recordings = (
  <TempleRecordings
    videos={[
      {
        id: 'mic-tech-check',
        title: 'Mic/Tech-Check',
        postedAt: '2026-11-02T20:00:00+01:00',
        customerCode: 'ku6r49ei7df9hym2',
        videoId: '54f94a6c1df7a504f462ecc8e2564f6d',
        cover: {
          ...micTechCover,
          alt: 'Mic/Tech-Check',
          focalX: 30.4,
          focalY: 26.6,
          videoFrame: { videoId: '54f94a6c1df7a504f462ecc8e2564f6d', time: 0 },
        },
        aspectRatio: 9 / 16,
        children: (
          <p>
            {
              "Welcome to the space, you're a bit early. Make yourself comfortable I'm just figuring out some things"
            }
          </p>
        ),
      },
      {
        id: 'permission-spaces',
        title: 'Can we briefly talk about permissions?',
        postedAt: '2026-11-04T20:00:00+01:00',
        customerCode: 'ku6r49ei7df9hym2',
        videoId: 'dd0296e50e2491fef540cdd9ce9e5439',
        cover: {
          ...permissionsCover,
          alt: 'Can we briefly talk about permissions?',
          focalX: 60.7,
          focalY: 36.7,
          videoFrame: { videoId: 'dd0296e50e2491fef540cdd9ce9e5439', time: 9.033333 },
        },
        aspectRatio: 9 / 16,
        children: <p>What inner and outer permission do you need to get creative?</p>,
      },
      {
        id: 'kennst-du-das',
        title: 'Kennst du das?',
        postedAt: '2026-11-05T09:00:00+01:00',
        customerCode: 'ku6r49ei7df9hym2',
        videoId: '608f25dbd40bc1e9ba15446d30e17906',
        cover: {
          ...kennstDuDasCover,
          alt: 'Kennst du das?',
          focalX: 51.7,
          focalY: 28.3,
          videoFrame: { videoId: '608f25dbd40bc1e9ba15446d30e17906', time: 30.2 },
        },
        aspectRatio: 9 / 16,
        children: <p>Also was macht man da? Könnte hilfe brauchen.</p>,
      },
      {
        id: 'fly-with-me',
        title: 'Fly With Me',
        subheadline: '40min piano improvisation, no vocals',
        postedAt: '2026-11-07T00:00:25+01:00',
        customerCode: 'ku6r49ei7df9hym2',
        videoId: 'd3f00d4b6684635fc7c58b0b15a5c74b',
        cover: {
          ...flyWithMeCover,
          alt: 'Fly With Me',
          focalX: 50.8,
          focalY: 50.8,
          videoFrame: { videoId: 'd3f00d4b6684635fc7c58b0b15a5c74b', time: 1519.3714 },
        },
        aspectRatio: 9 / 16,
        children: (
          <p>
            Join me for this slightly trippy, meditative moment. Lie back, let go... Maybe set an
            alarm ;)
          </p>
        ),
      },
      {
        id: 'waiting-band',
        title: 'All my parts right now',
        subheadline: 'accurate representation',
        postedAt: '2026-11-08T20:07:18+01:00',
        customerCode: 'ku6r49ei7df9hym2',
        videoId: 'f673f901a50a1604e409103836e19e2b',
        cover: {
          ...waitingBandCover,
          alt: 'All my parts right now',
          focalX: 50.4,
          focalY: 42,
          videoFrame: { videoId: 'f673f901a50a1604e409103836e19e2b', time: 148.927562 },
        },
        children: (
          <p>
            Check out{' '}
            <a href="https://www.instagram.com/heisse_naegel_heisse_klaenge">
              @heisse_naegel_heisse_klaenge on insta
            </a>
          </p>
        ),
      },
      {
        id: 'the-fall',
        title: 'The Fall (cover)',
        subheadline: 'by Netherwilds',
        postedAt: '2026-11-10T01:28:04+01:00',
        customerCode: 'ku6r49ei7df9hym2',
        videoId: 'e6b3bc09768d7ff58429e6bfc02971c4',
        cover: {
          ...theFallCover,
          alt: 'The Fall (cover)',
          focalX: 67.4,
          focalY: 36.7,
          videoFrame: { videoId: 'e6b3bc09768d7ff58429e6bfc02971c4', time: 53.233333 },
        },
        aspectRatio: 9 / 16,
        children: (
          <>
            <p>Wanted to have a version that is easier to the ears and harder to the eyes 👉👈</p>
            <p>
              Check out their{' '}
              <a
                href="https://netherwilds.bandcamp.com/album/peasant-rising"
                target="_blank"
                rel="noopener noreferrer"
              >
                album Peasant Rising
              </a>
            </p>
          </>
        ),
      },
      {
        id: 'feuer-und-vergessen',
        title: 'Feuer und Vergessen',
        subheadline: 'Live am Klavier',
        postedAt: '2026-11-11T14:14:05+01:00',
        customerCode: 'ku6r49ei7df9hym2',
        videoId: 'd6815fb4db34effcfe4419bf10e02fe1',
        cover: {
          ...feuerUndVergessenCover,
          alt: 'Feuer und Vergessen',
          focalX: 51.1,
          focalY: 33.5,
          videoFrame: { videoId: 'd6815fb4db34effcfe4419bf10e02fe1', time: 87.566666 },
        },
        aspectRatio: 9 / 16,
        children: (
          <p>
            {
              'The german word "Weltschmerz" describes the pain when one gets overwhelmed by "The News" about the state of the world. This song is my vessel to hold that feeling so that I don\'t have to carry it myself all along. May it serve you to feel what needs to be felt and then let go and move on with love.'
            }
          </p>
        ),
      },
    ]}
  />
)
