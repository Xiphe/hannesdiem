import type { ElectroCuteSession } from '@hannesdiem/content-components'

/** Entirely synthetic; these dates, people and titles are not artist content. */
export const electroCuteSessions: readonly ElectroCuteSession[] = [1, 2, 3, 4].map((number) => ({
  id: `test-session-${number}`,
  title: `Test session ${String(number).padStart(2, '0')}`,
  recordedAt: `2023-01-${String(number * 7).padStart(2, '0')}`,
  src: '/fixture-media/electrocute.mp4',
  duration: 96,
  frameRate: 5,
  highlights:
    number === 1
      ? [
          {
            id: 'test-highlight-a',
            title: 'Test highlight A',
            person: 'Test listener A',
            start: 12,
            end: 32,
          },
          {
            id: 'test-highlight-b',
            title: 'Test highlight B',
            person: 'Test listener B',
            start: 26,
            end: 58,
          },
          {
            id: 'test-highlight-c',
            title: 'Test highlight C',
            person: 'Test listener A',
            start: 70,
            end: 90,
          },
        ]
      : [],
}))
