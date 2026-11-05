import { TempleRecordings } from '@hannesdiem/content-components'

export const recordings = (
  <TempleRecordings
    videos={[
      {
        id: 'mic-tech-check',
        title: 'Mic/Tech-Check',
        postedAt: '2026-11-02T20:00:00+01:00',
        customerCode: 'ku6r49ei7df9hym2',
        videoId: '54f94a6c1df7a504f462ecc8e2564f6d',
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
        aspectRatio: 9 / 16,
        children: <p>What inner and outer permission do you need to get creative?</p>,
      },
      {
        id: 'kennst-du-das',
        title: 'Kennst du das?',
        postedAt: '2026-11-05T09:00:00+01:00',
        customerCode: 'ku6r49ei7df9hym2',
        videoId: '608f25dbd40bc1e9ba15446d30e17906',
        aspectRatio: 9 / 16,
        children: <p>Also was macht man da? Könnte hilfe brauchen.</p>,
      },
    ]}
  />
)
